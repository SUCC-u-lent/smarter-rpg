import { eventSource, event_types, saveSettingsDebounced } from "../../../../script.js";
import { extension_settings, getContext } from "../../../extensions.js";

/* =========================
   CONFIG
========================= */

const CONFIG = {
    modelname: "phi3:mini",
    historyDepth: 6,
};

const DEFAULT_API_URL = "http://192.168.20.99:5055/generate";

const EXTENSION_NAME = "smarter-rpg";

function logSmarterRpgListener(message, details) {
    const timestamp = new Date().toISOString();
    if (details !== undefined) {
        console.log(`[SmarterRPG][listener][${timestamp}] ${message}`, details);
        return;
    }

    console.log(`[SmarterRPG][listener][${timestamp}] ${message}`);
}

/* =========================
   PROFILE STATE
========================= */

let profiles = {};
const messageDeltas = {};

const KEYFRAME_LIMIT = 5;

function getChatId() {
    return String(getContext()?.chatId ?? "default");
}

function saveKeyframe(messageId, statsSnapshot, changes) {
    const store = getStore();
    const chatId = getChatId();

    store.keyframes = store.keyframes || {};
    let frames = store.keyframes[chatId] || [];

    // Replace any existing entry for this message (swipe / edit)
    frames = frames.filter(f => f.id !== messageId);

    frames.push({
        id: messageId,
        stats: statsSnapshot,
        changes: cloneJson(changes)
    });

    // Keep only the most recent KEYFRAME_LIMIT entries
    if (frames.length > KEYFRAME_LIMIT) {
        frames = frames.slice(-KEYFRAME_LIMIT);
    }

    store.keyframes[chatId] = frames;
    saveSettingsDebounced();
}

function restoreKeyframes() {
    const store = getStore();
    const chatId = getChatId();
    const frames = store.keyframes?.[chatId];

    if (!frames?.length) return;

    for (const frame of frames) {
        renderResult(frame.id, frame.stats, frame.changes);
    }
}

const STAT_RANGE_TYPE = {
    BOUNDED: "range",
    HIDDEN_INFINITE: "hidden_infinite"
};

const DEFAULT_BACKEND_PROMPT =
`OUTPUT JSON ONLY.

SCHEMA:
{
  "confidence": number,
  "stat_changes": {},
  "rewrite": string
}

CURRENT STATS:
{{stats}}

STAT LIMITS (bounded stats only):
{{limits}}

RANGE RULES:
- Stat values may be number or range object { type, value, min, max, hideRange }.
- type "range": value is clamped to [min, max].
- type "hidden_infinite": range is intentionally hidden and unbounded.
- stat_changes must remain numeric deltas only.
- Do not suggest deltas that push bounded stats outside min/max.

DEFINITIONS:
{{definitions}}

INPUT:
{{input}}
`;

function applyPromptTemplate(template, vars) {
    return template
        .replace(/\{\{stats\}\}/g, () => vars.stats)
        .replace(/\{\{limits\}\}/g, () => vars.limits)
        .replace(/\{\{definitions\}\}/g, () => vars.definitions)
        .replace(/\{\{input\}\}/g, () => vars.input);
}

/*
structure:
profiles[char_chat_key] = {
  active: "default",
  data: {
    default: {
      stats: {},
      defs: {}
    }
  }
}
*/

/* =========================
   KEY
========================= */

function getProfileKey() {
    const context = getContext();
    return `${context?.characterId ?? "char"}_${context?.chatId ?? "chat"}`;
}

/* =========================
   PROFILE CORE
========================= */

function ensureBucket() {
    const key = getProfileKey();

    if (!profiles[key]) {
        profiles[key] = {
            active: "default",
            data: {
                default: { stats: {}, defs: {} }
            }
        };
    }

    return profiles[key];
}

function getActiveProfile() {
    const bucket = ensureBucket();
    return bucket.data[bucket.active];
}

export function getProfiles()
{
    return profiles;
}

function setActiveProfile(name) {
    const bucket = ensureBucket();

    if (!bucket.data[name]) {
        console.warn("[StatAI] Profile does not exist:", name);
        return;
    }

    bucket.active = name;
}

function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
}

function escapeAttr(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function getStore() {
    extension_settings[EXTENSION_NAME] = extension_settings[EXTENSION_NAME] || {
        profiles: {},
        activeProfiles: {}
    };

    if (!extension_settings[EXTENSION_NAME].apiUrl) {
        extension_settings[EXTENSION_NAME].apiUrl = DEFAULT_API_URL;
    }

    return extension_settings[EXTENSION_NAME];
}

function getApiUrl() {
    const store = getStore();
    return String(store.apiUrl || DEFAULT_API_URL).trim() || DEFAULT_API_URL;
}

function getSelectedProfileName() {
    const selected = String($("#statai-profile-select").val() || "").trim();
    if (selected) return selected;

    const context = getContext();
    const charId = context?.characterId;
    const store = getStore();

    const uiPersonaName = String($("#your_name").first().text() || "").trim();
    const fallbackName = String(context?.name1 || "").trim();
    const personaKey = uiPersonaName
        ? `persona:${uiPersonaName}`
        : (fallbackName ? `persona:${fallbackName}` : "persona:default");

    if (store.activeProfiles?.[personaKey]) {
        return store.activeProfiles[personaKey];
    }

    return (charId && store.activeProfiles?.[charId]) || "default";
}

function getCurrentPersonaKey() {
    const uiPersonaName = String($("#your_name").first().text() || "").trim();
    if (uiPersonaName) return `persona:${uiPersonaName}`;

    const context = getContext();
    const fallbackName = String(context?.name1 || "").trim();
    return fallbackName ? `persona:${fallbackName}` : "persona:default";
}

function resolveProfileForMessageEl(el) {
    if (!el) return "default";

    const isSystem = String(el.getAttribute("is_system") || "").toLowerCase() === "true";
    if (isSystem) return null;

    const store = getStore();
    const isUser = String(el.getAttribute("is_user") || "").toLowerCase() === "true";

    if (isUser) {
        return store.activeProfiles?.[getCurrentPersonaKey()] || "default";
    }

    const context = getContext();
    const charId = context?.characterId;
    return (charId && store.activeProfiles?.[charId]) || "default";
}

function activateProfileForMessageId(id) {
    const el = getMessageElById(id);
    const profileName = resolveProfileForMessageEl(el);

    if (!profileName) return null;

    const bucket = ensureBucket();
    if (!bucket.data[profileName]) {
        bucket.data[profileName] = { stats: {}, defs: {} };
    }

    bucket.active = profileName;
    return profileName;
}

function ensureStoreProfile(profileName) {
    const store = getStore();
    store.profiles = store.profiles || {};

    if (!store.profiles[profileName]) {
        store.profiles[profileName] = {
            stats: {},
            defs: {}
        };
    }

    return store.profiles[profileName];
}

function normalizeSavedStatValue(value) {
    if (isRangeStat(value)) {
        return normalizeRangeStat(value);
    }

    return getStatNumericValue(value);
}

function loadProfilesFromSettings() {
    const bucket = ensureBucket();
    const store = getStore();
    const savedProfiles = store.profiles || {};

    logSmarterRpgListener("Loading profiles from settings", {
        savedProfileNames: Object.keys(savedProfiles),
        selectedProfile: getSelectedProfileName(),
        profileSelectExists: $("#statai-profile-select").length > 0
    });

    bucket.data = {};

    for (const [name, profile] of Object.entries(savedProfiles)) {
        const savedStats = profile?.stats || {};
        const normalizedStats = {};

        for (const [statKey, statValue] of Object.entries(savedStats)) {
            normalizedStats[statKey] = normalizeSavedStatValue(statValue);
        }

        bucket.data[name] = {
            stats: normalizedStats,
            defs: cloneJson(profile?.defs || {})
        };
    }

    if (!bucket.data.default) {
        bucket.data.default = { stats: {}, defs: {} };
    }

    const wanted = getSelectedProfileName();
    bucket.active = bucket.data[wanted] ? wanted : "default";

    logSmarterRpgListener("Profiles loaded into runtime bucket", {
        runtimeProfiles: Object.keys(bucket.data),
        activeProfile: bucket.active
    });
}

function buildEditorRow(statName, statValue, statDesc = "") {
    const isRange = isRangeStat(statValue);
    const normalizedRange = isRange ? normalizeRangeStat(statValue) : null;

    const mode = isRange
        ? normalizedRange.type
        : "number";

    const numericValue = isRange
        ? normalizedRange.value
        : getStatNumericValue(statValue);

    const minValue = isRange && normalizedRange.type === STAT_RANGE_TYPE.BOUNDED
        ? normalizedRange.min
        : 0;

    const maxValue = isRange && normalizedRange.type === STAT_RANGE_TYPE.BOUNDED
        ? normalizedRange.max
        : 100;

    const showRangeFields = mode === STAT_RANGE_TYPE.BOUNDED;

    return `
        <hr class="sysHR" />
        <div class="statai-stat-row">
            <label>Stat Name: </label><input type="text" style="background-color:black;color:white;" class="statai-stat-name" value="${escapeAttr(statName)}"/><br/>
            <label>Stat Type: </label>
            <select class="statai-stat-mode" style="background-color:black;color:white;">
                <option value="number" ${mode === "number" ? "selected" : ""}>Number</option>
                <option value="range" ${mode === STAT_RANGE_TYPE.BOUNDED ? "selected" : ""}>Range</option>
                <option value="hidden_infinite" ${mode === STAT_RANGE_TYPE.HIDDEN_INFINITE ? "selected" : ""}>Hidden Infinite</option>
            </select><br/>
            <label>Stat Default: </label><input type="number" style="background-color:black;color:white;" class="statai-stat-default" value="${numericValue}"/><br/>
            <div class="statai-range-fields" style="display:${showRangeFields ? "block" : "none"};">
                <label>Min: </label><input type="number" style="background-color:black;color:white;" class="statai-stat-min" value="${minValue}"/><br/>
                <label>Max: </label><input type="number" style="background-color:black;color:white;" class="statai-stat-max" value="${maxValue}"/><br/>
            </div>
            <label>Stat Description: </label><input type="text" style="background-color:black;color:white;" class="statai-stat-desc" value="${escapeAttr(statDesc)}"/><br/>
            <div id="remove_stat_item" class="menu_button menu_button_icon interactable" title="Remove Stat" tabindex="0" role="button">
                <i class="fa-solid fa-pen-to-square"></i>
                <small data-i18n="ext_regex_new_global_script">- Stat</small>
            </div>
        </div>
    `;
}

function hydrateEditorFromActiveProfile() {
    const container = $("#statai-stats-container");
    if (!container.length) return;

    const stats = getStatus();
    const defs = getStatDefinitions();

    container.empty();

    for (const [name, value] of Object.entries(stats)) {
        container.append(buildEditorRow(name, value, defs[name] || ""));
    }
}

function readEditorStats() {
    const nextStats = {};
    const nextDefs = {};
    let rowCount = 0;

    $(".statai-stat-row").each((_, rowEl) => {
        rowCount += 1;
        const row = $(rowEl);
        const name = String(row.find(".statai-stat-name").val() || "").trim();
        if (!name) return;

        const mode = String(row.find(".statai-stat-mode").val() || "number").trim();
        const value = isFiniteNumber(row.find(".statai-stat-default").val()) ?? 0;

        if (mode === STAT_RANGE_TYPE.BOUNDED) {
            const min = isFiniteNumber(row.find(".statai-stat-min").val()) ?? 0;
            const max = isFiniteNumber(row.find(".statai-stat-max").val()) ?? 100;
            nextStats[name] = normalizeRangeStat({
                type: STAT_RANGE_TYPE.BOUNDED,
                value,
                min,
                max,
                hideRange: false
            });
        } else if (mode === STAT_RANGE_TYPE.HIDDEN_INFINITE) {
            nextStats[name] = normalizeRangeStat({
                type: STAT_RANGE_TYPE.HIDDEN_INFINITE,
                value,
                hideRange: true
            });
        } else {
            nextStats[name] = value;
        }

        nextDefs[name] = String(row.find(".statai-stat-desc").val() || "").trim();
    });

    logSmarterRpgListener("Read editor stats", {
        rowCount,
        parsedStatNames: Object.keys(nextStats)
    });

    return { nextStats, nextDefs };
}

function saveActiveProfileToSettings() {
    try {
        const { nextStats, nextDefs } = readEditorStats();
        const profileName = getSelectedProfileName();

        logSmarterRpgListener("Saving active profile to settings", {
            profileName,
            statCount: Object.keys(nextStats).length,
            defCount: Object.keys(nextDefs).length
        });

        const bucket = ensureBucket();
        if (!bucket.data[profileName]) {
            bucket.data[profileName] = { stats: {}, defs: {} };
        }

        bucket.active = profileName;
        setStatus(nextStats);
        setStatDefinitions(nextDefs);

        const storeProfile = ensureStoreProfile(profileName);
        storeProfile.stats = cloneJson(nextStats);
        storeProfile.defs = cloneJson(nextDefs);

        saveSettingsDebounced();

        const store = getStore();
        logSmarterRpgListener("Save dispatched via saveSettingsDebounced", {
            savedProfileNames: Object.keys(store.profiles || {}),
            savedStatsKeys: Object.keys(store.profiles?.[profileName]?.stats || {})
        });
    } catch (err) {
        console.error("[SmarterRPG][listener] Failed to save active profile", err);
        throw err;
    }
}

/* =========================
   STATE ACCESSORS
========================= */

function getStatus() {
    return getActiveProfile().stats;
}

function isFiniteNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

function isRangeStat(value) {
    return value && typeof value === "object" && !Array.isArray(value) && value.value !== undefined;
}

function normalizeRangeStat(value = {}) {
    const rawType = String(value.type || STAT_RANGE_TYPE.BOUNDED).toLowerCase();
    const type = rawType === STAT_RANGE_TYPE.HIDDEN_INFINITE
        ? STAT_RANGE_TYPE.HIDDEN_INFINITE
        : STAT_RANGE_TYPE.BOUNDED;

    const normalized = {
        type,
        value: isFiniteNumber(value.value) ?? 0,
        min: isFiniteNumber(value.min),
        max: isFiniteNumber(value.max),
        hideRange: Boolean(value.hideRange)
    };

    if (type === STAT_RANGE_TYPE.HIDDEN_INFINITE) {
        normalized.min = null;
        normalized.max = null;
        normalized.hideRange = true;
        return normalized;
    }

    if (normalized.min === null) normalized.min = 0;
    if (normalized.max === null) normalized.max = 100;

    if (normalized.max < normalized.min) {
        const tmp = normalized.max;
        normalized.max = normalized.min;
        normalized.min = tmp;
    }

    normalized.value = Math.min(normalized.max, Math.max(normalized.min, normalized.value));
    return normalized;
}

function getStatNumericValue(value) {
    if (isRangeStat(value)) {
        return normalizeRangeStat(value).value;
    }

    return isFiniteNumber(value) ?? 0;
}

function updateStatValue(stats, key, nextValue) {
    const current = stats[key];

    if (isRangeStat(current)) {
        const normalized = normalizeRangeStat(current);
        const numeric = isFiniteNumber(nextValue) ?? 0;

        if (normalized.type === STAT_RANGE_TYPE.BOUNDED) {
            normalized.value = Math.min(normalized.max, Math.max(normalized.min, numeric));
        } else {
            normalized.value = numeric;
        }

        stats[key] = normalized;
        return;
    }

    stats[key] = isFiniteNumber(nextValue) ?? 0;
}

function getStatDefinitions() {
    return getActiveProfile().defs;
}

function setStatus(v) {
    getActiveProfile().stats = v;
}

function setStatDefinitions(v) {
    getActiveProfile().defs = v;
}

function resetStatus() {
    const active = getActiveProfile();
    active.stats = {};
    active.defs = {};
}

/* =========================
   CHAT DOM HELPERS
========================= */

function getMessageElById(id) {
    return document.querySelector(`.mes[mesid="${id}"]`);
}

function getMessageText(id) {
    const el = getMessageElById(id);
    return el?.querySelector(".mes_text")?.innerText || null;
}

/* =========================
   MESSAGE PIPELINE
========================= */

let processingQueue = Promise.resolve();

async function handleMessage(id) {
    if (id === undefined || id === null) return;

    const activeProfile = activateProfileForMessageId(id);
    if (!activeProfile) return;

    await new Promise(requestAnimationFrame);

    const text = getMessageText(id);

    if (!text || text.trim() === "...") {
        await new Promise(r => setTimeout(r, 50));
        const retry = getMessageText(id);
        if (!retry || retry.trim() === "...") return;
        return processMessage(id, retry);
    }

    return processMessage(id, text);
}
function filterValidStats(changes = {}) {
    const valid = {};
    const stats = getStatus();

    for (const key of Object.keys(stats)) {
        if (changes[key] !== undefined) {
            const val = Number(changes[key]);
            valid[key] = Number.isFinite(val) ? val : 0;
        }
    }

    return valid;
}
function revertStats(changes = {}) {
    const stats = getStatus();

    for (const k in changes) {
        const current = getStatNumericValue(stats[k]);
        updateStatValue(stats, k, current - Number(changes[k] || 0));
    }
}
async function processMessage(id, text) {
    processingQueue = processingQueue.then(async () => {
        // 🔥 REMOVE OLD DELTA FIRST (for swipe / edit)
        if (messageDeltas[id]) {
            revertStats(messageDeltas[id]);
        }

        const result = await evaluateAction(text);

        const changes = filterValidStats(result.stat_changes || {});

        applyStats(changes);

        // 🔥 SAVE DELTA
        messageDeltas[id] = changes;

        const statsSnapshot = cloneJson(getStatus());
        saveKeyframe(id, statsSnapshot, changes);
        renderResult(id, statsSnapshot, changes);
    });
}

/* =========================
   AI CALL (RESTORED)
========================= */

async function evaluateAction(input) {
    const prompt = buildPrompt(input);
    const apiUrl = getApiUrl();

    try {
        const res = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: CONFIG.modelname,
                prompt,
                stream: false
            })
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const text = data?.response;

        if (!text) return fallbackResult();

        return safeParse(text);

    } catch (err) {
        console.error("[StatAI] AI error:", { apiUrl, err });
        return fallbackResult();
    }
}

/* =========================
   FALLBACK
========================= */

function fallbackResult() {
    return {
        confidence: 1,
        stat_changes: {},
        rewrite: "I proceed cautiously."
    };
}

/* =========================
   PROMPT
========================= */

function buildPrompt(input) {
    const stats = getStatus();
    const defs = getStatDefinitions();

    const promptStats = Object.fromEntries(
        Object.entries(stats).map(([k, v]) => {
            if (isRangeStat(v)) {
                const normalized = normalizeRangeStat(v);
                return [k, normalized];
            }

            return [k, getStatNumericValue(v)];
        })
    );

    const statLimits = Object.fromEntries(
        Object.entries(promptStats).map(([k, v]) => {
            if (isRangeStat(v) && v.type === STAT_RANGE_TYPE.BOUNDED) {
                return [k, { min: v.min, max: v.max }];
            }

            return [k, null];
        })
    );

    const customTemplate = extension_settings[EXTENSION_NAME]?.backendPromptTemplate?.trim();
    const template = customTemplate || DEFAULT_BACKEND_PROMPT;

    return applyPromptTemplate(template, {
        stats: JSON.stringify(promptStats, null, 2),
        limits: JSON.stringify(statLimits, null, 2),
        definitions: Object.entries(defs).map(([k, v]) => `${k}: ${v}`).join("\n"),
        input
    });
}

/* =========================
   PARSE
========================= */

function safeParse(text) {
    try {
        const cleaned = text.replace(/```json|```/g, "").trim();
        return JSON.parse(cleaned);
    } catch {
        return fallbackResult();
    }
}

/* =========================
   APPLY STATS
========================= */

function applyStats(changes = {}) {
    const stats = getStatus();

    for (const k in changes) {
        const current = getStatNumericValue(stats[k]);
        updateStatValue(stats, k, current + Number(changes[k] || 0));
    }
}

/* =========================
   RENDER
========================= */

function renderResult(id, statsSnapshot, changes = {}) {
    const el = getMessageElById(id);
    if (!el) return;

    const block = ensureBlock(el);

    block.innerHTML = `
        <div class="statai-stat-display">
            ${Object.entries(statsSnapshot)
                .map(([k, v]) => {
                    const delta = Number(changes[k] || 0);
                    const hasDelta = delta !== 0;

                    let deltaHtml = "";
                    if (hasDelta) {
                        const sign = delta > 0 ? "+" : "";
                        const color = delta > 0 ? "#4caf50" : "#f44336";
                        deltaHtml = ` <span style="color:${color};font-weight:bold">(${sign}${delta})</span>`;
                    }

                    if (isRangeStat(v)) {
                        const normalized = normalizeRangeStat(v);
                        let rangeLabel = "";
                        if (normalized.type === STAT_RANGE_TYPE.BOUNDED) {
                            rangeLabel = `<span style="opacity:0.6"> / ${normalized.max}</span>`;
                        }
                        return `<div><b>${k}</b>: ${normalized.value}${rangeLabel}${deltaHtml}</div>`;
                    }

                    return `<div><b>${k}</b>: ${getStatNumericValue(v)}${deltaHtml}</div>`;
                })
                .join("")}
        </div>
    `;
}

function ensureBlock(el) {
    let b = el.querySelector(".statai_result");

    if (!b) {
        b = document.createElement("div");
        b.className = "statai_result";
        el.querySelector(".mes_block")?.appendChild(b);
    }

    return b;
}

/* =========================
   EVENTS
========================= */

function isExtensionEnabled() {
    return extension_settings[EXTENSION_NAME]?.enabled !== false;
}

eventSource.on(event_types.MESSAGE_SENT, async (id) => {
    if (!isExtensionEnabled()) return;
    await handleMessage(id);
});

eventSource.on(event_types.MESSAGE_EDITED, async (id) => {
    if (!isExtensionEnabled()) return;
    await handleMessage(id);
});

eventSource.on(event_types.GENERATION_ENDED, async (id) => {
    if (!isExtensionEnabled()) return;
    const safe = Number(id);
    if (!Number.isNaN(safe)) {
        await handleMessage(safe - 1);
    }
});

$(document).on("smarter_rpg_switch_profile", (_, profileName) => {
    logSmarterRpgListener("Received smarter_rpg_switch_profile event", { profileName });
    loadProfilesFromSettings();

    if (profileName) {
        setActiveProfile(String(profileName));
    }

    hydrateEditorFromActiveProfile();

    logSmarterRpgListener("Profile switch complete", {
        activeProfile: profileName || getSelectedProfileName(),
        editorRowCount: $(".statai-stat-row").length
    });
});

$(document).on("smarter_rpg_save", () => {
    logSmarterRpgListener("Received smarter_rpg_save event", {
        selectedProfile: getSelectedProfileName(),
        editorRowCount: $(".statai-stat-row").length
    });
    loadProfilesFromSettings();
    saveActiveProfileToSettings();
});

eventSource.on(event_types.CHAT_LOADED, () => {
    loadProfilesFromSettings();
    // Delay so the chat DOM is fully rendered before we re-inject stat blocks
    setTimeout(restoreKeyframes, 300);
});
export {
    getStatus,
    getStatDefinitions,
    isRangeStat,
    normalizeRangeStat,
    getStatNumericValue
};