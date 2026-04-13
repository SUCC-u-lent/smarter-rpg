import { extension_settings, getContext } from "../../../extensions.js";
import { eventSource, event_types, saveSettingsDebounced } from "../../../../script.js";

import { getStatus, isRangeStat, normalizeRangeStat, getStatNumericValue } from "./listener.js";

const extensionName = "smarter-rpg";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

function logSmarterRpg(message, details) {
    const timestamp = new Date().toISOString();
    if (details !== undefined) {
        console.log(`[SmarterRPG][${timestamp}] ${message}`, details);
        return;
    }

    console.log(`[SmarterRPG][${timestamp}] ${message}`);
}

/* =========================
   INIT STORAGE
========================= */

function initSettings() {
    extension_settings[extensionName] =
        extension_settings[extensionName] || {
            profiles: {},
            activeProfiles: {},
            enabled: true
        };

    const s = extension_settings[extensionName];
    if (s.enabled === undefined) s.enabled = true;
    if (s.backendPromptTemplate === undefined) s.backendPromptTemplate = "";
    if (s.frontendStatTemplate === undefined) s.frontendStatTemplate = "";

    saveSettingsDebounced();
}

const DEFAULT_FRONTEND_TEMPLATE = "[{{name}} - {{stats}}]";

function buildGlobalStatLine() {
    const ctx = getContext();
    const chat = ctx?.chat || [];

    const seen = new Set();

    for (const msg of chat) {
        if (msg?.name) seen.add(msg.name);
    }

    const stats = getStatus();
    const customTemplate = extension_settings[extensionName]?.frontendStatTemplate?.trim();
    const template = customTemplate || DEFAULT_FRONTEND_TEMPLATE;

    return Array.from(seen).map(name => {
        const statStr = Object.entries(stats)
            .map(([k, v]) => {
                if (isRangeStat(v)) {
                    return `${k}:${normalizeRangeStat(v).value}`;
                }
                return `${k}:${getStatNumericValue(v)}`;
            })
            .join(" ");

        return template
            .replace(/\{\{name\}\}/g, () => name)
            .replace(/\{\{stats\}\}/g, () => statStr);
    }).join("\n");
}
function injectStatsIntoMainPrompt() {
    const ctx = getContext();

    const statBlock = buildGlobalStatLine();

    if (!statBlock.trim()) return;

    ctx.setExtensionPrompt(
        "SMARTRPG_STATS",     // unique key
        statBlock,
        0,                    // position (0 = top)
        0,                    // depth
        false                 // scan
    );
}

/* =========================
   UI LOAD
========================= */

async function loadUI() {
    const settingsHtml = await $.get(`${extensionFolderPath}/example.html`);
    $("#extensions_settings").append(settingsHtml);
}

/* =========================
   CREATE STAT ITEM
========================= */

async function createStatElement() {
    const html = await $.get(`${extensionFolderPath}/example_item.html`);

    $("#statai-stats-container").append('<hr class="sysHR" />');
    $("#statai-stats-container").append(html);
    const row = $("#statai-stats-container .statai-stat-row").last();
    syncRangeFieldsForRow(row);
}

function syncRangeFieldsForRow(row) {
    const mode = row.find(".statai-stat-mode").val() || "number";
    const isRange = mode === "range";
    row.find(".statai-range-fields").toggle(isRange);
}

/* =========================
   CREATE PROFILE
========================= */

function createProfile() {
    const name = prompt("Profile name:");
    if (!name) return;

    const clean = name.trim();

    if (normalizeProfileName(clean) === "default") {
        alert("Default is a reserved profile name.");
        return;
    }

    const store = extension_settings[extensionName];
    store.profiles = store.profiles || {};

    // 🚨 DUPLICATE CHECK (CASE INSENSITIVE)
    if (profileExists(store, clean)) {
        alert("Profile already exists (names must be unique).");
        return;
    }

    store.profiles[clean] = {
        stats: {},
        defs: {}
    };

    saveSettingsDebounced();

    console.log("[SmarterRPG] Created profile:", clean);

    verifyDefaultProfile();
    refreshProfileDropdown();
}

function verifyDefaultProfile(allowClearDefault = true) {
    const store = extension_settings[extensionName];
    store.profiles = store.profiles || {};

    // ensure exactly one default
    const defaults = Object.keys(store.profiles).filter(
        k => normalizeProfileName(k) === "default"
    );

    if (defaults.length === 0) {
        store.profiles["default"] = {
            stats: {},
            defs: {}
        };
        return;
    }

    // keep first, remove rest
    if (allowClearDefault && defaults.length > 1) {
        for (let i = 1; i < defaults.length; i++) {
            delete store.profiles[defaults[i]];
        }
    }
}
function normalizeProfileName(name) {
    return name.trim().toLowerCase();
}
function profileExists(store, name) {
    const key = normalizeProfileName(name);

    return Object.keys(store.profiles || {}).some(
        p => normalizeProfileName(p) === key
    );
}
function removeProfileByName(selected) {
    const store = extension_settings[extensionName];
    if (!selected) return;

    const realKey = Object.keys(store.profiles || {}).find(
        p => normalizeProfileName(p) === normalizeProfileName(selected)
    );

    if (!realKey) {
        console.warn("[SmarterRPG] Profile not found:", selected);
        return;
    }

    delete store.profiles[realKey];

    saveSettingsDebounced();

    console.log("[SmarterRPG] Deleted profile:", realKey);

    if (store.activeProfiles?.current === realKey) {
        store.activeProfiles.current = Object.keys(store.profiles)[0] || null;
    }

    refreshProfileDropdown();
}
function removeProfile() {

    const selected = $("#statai-profile-select").val();

    if (!selected) return;
    if (selected.toLowerCase() === "default") {
        alert("Default profile cannot be deleted.");
        return;
    }
    removeProfileByName(selected);
}
function refreshProfileDropdown(allowClearDefault = true) {
  verifyDefaultProfile(allowClearDefault);
    const store = extension_settings[extensionName];

    const select = $("#statai-profile-select");
    if (!select.length) return;

    select.empty();

    const profiles = store.profiles || {};

        for (const key of Object.keys(profiles)) {
            const isDefault = key.toLowerCase() === "default";
            const label = isDefault ? "Default" : key;
            select.append(`<option value="${key}">${label}${isDefault ? " (Cannot be Removed)" : ""}</option>`);
    }

    // optionally set selected
    const active = store.activeProfiles?.current;

    if (active) {
        select.val(active);
    }
    refreshCharacterProfileDropdown();
    refreshPersonaProfileDropdown();
}
/* =========================
   REMOVE PROFILE ITEM
========================= */

$(document).on("click", "#remove_stat_item", function () {
    $(this).closest(".statai-stat-row").remove();
});

/* =========================
   SAVE STATUS BUTTON HOOK
   (calls listener indirectly)
========================= */

function saveStatusBridge() {
    const selectedProfile = $("#statai-profile-select").val();
    const rowCount = $(".statai-stat-row").length;

    logSmarterRpg("Save button/event bridge invoked", {
        selectedProfile,
        rowCount
    });
    logSmarterRpg("Dispatching smarter_rpg_save event");
    $(document).trigger("smarter_rpg_save");
}

/* =========================
   EVENT WIRING
========================= */

function wireUI() {

    $("#create_stat_menu").on("click", createStatElement);

    $("#create_profile_menu").on("click", createProfile);

    $("#save_stats_menu").on("click", saveStatusBridge);

    logSmarterRpg("UI handlers wired", {
        hasSaveButton: $("#save_stats_menu").length > 0,
        hasProfileSelect: $("#statai-profile-select").length > 0
    });

    $("#statai-profile-select").on("change", function () {
        const profile = $(this).val();
        logSmarterRpg("Profile select changed", { profile });
        $(document).trigger("smarter_rpg_switch_profile", [profile]);
    });

    $(document).on("change", ".statai-stat-mode", function () {
        const row = $(this).closest(".statai-stat-row");
        syncRangeFieldsForRow(row);
        saveStatusBridge();
    });

    $(document).on("change blur", ".statai-stat-row input, .statai-stat-row select", function () {
        saveStatusBridge();
    });

    $("#statai-enabled-toggle").on("change", function () {
        extension_settings[extensionName].enabled = $(this).is(":checked");
        saveSettingsDebounced();
        console.log("[SmarterRPG] Enabled:", extension_settings[extensionName].enabled);
    });

    $(document).on("input", "#statai-backend-prompt-template", function () {
        extension_settings[extensionName].backendPromptTemplate = $(this).val();
        saveSettingsDebounced();
    });

    $(document).on("input", "#statai-frontend-stat-template", function () {
        extension_settings[extensionName].frontendStatTemplate = $(this).val();
        saveSettingsDebounced();
    });

    $(document).on("click", "#statai-reset-backend-prompt", function () {
        extension_settings[extensionName].backendPromptTemplate = "";
        $("#statai-backend-prompt-template").val("");
        saveSettingsDebounced();
        logSmarterRpg("Backend prompt template reset");
    });

    $(document).on("click", "#statai-reset-frontend-template", function () {
        extension_settings[extensionName].frontendStatTemplate = "";
        $("#statai-frontend-stat-template").val("");
        saveSettingsDebounced();
        logSmarterRpg("Frontend stat template reset");
    });
}

/* =========================
   CHAT EVENTS
========================= */

eventSource.on(event_types.CHAT_LOADED, () => {
    initSettings();
    console.log("[SmarterRPG] Chat loaded");
});

/* =========================
   INIT
========================= */
function injectCharacterProfileSelector() {
    const container = $("#form_create");
    if (!container.length) return;

    // prevent duplicates
    if ($("#statai-character-profile").length) return;

    const html = `
        <div id="statai-character-profile" class="statai_block">
            <label><b>RPG Profile</b></label>
            <select id="statai-character-profile-select"></select>
        </div>
    `;

    container.append(html);

    refreshCharacterProfileDropdown();
}

function getCurrentPersonaKey() {
    const uiPersonaName = String($("#your_name").first().text() || "").trim();
    if (uiPersonaName) {
        return `persona:${uiPersonaName}`;
    }

    const context = getContext();
    const fallbackName = String(context?.name1 || "").trim();
    return fallbackName ? `persona:${fallbackName}` : "persona:default";
}

function injectPersonaProfileSelector() {
    const container = $(".persona_management_right_column").first();
    if (!container.length) return false;

    if ($("#statai-persona-profile").length) return false;

    const html = `
        <div id="statai-persona-profile" class="statai_block">
            <label><b>RPG Profile</b></label>
            <select id="statai-persona-profile-select"></select>
        </div>
    `;

    // Add to the end of the persona right column.
    container.append(html);
    refreshPersonaProfileDropdown();
    return true;
}

function refreshCharacterProfileDropdown() {
    const store = extension_settings[extensionName];
    const select = $("#statai-character-profile-select");

    if (!select.length) return;

    select.empty();

    const profiles = store.profiles || {};

    for (const name of Object.keys(profiles)) {
        select.append(`<option value="${name}">${name}</option>`);
    }

    const context = getContext();
    const charId = context?.characterId;

    const active = store.activeProfiles?.[charId];

    if (active) {
        select.val(active);
    }
}

function refreshPersonaProfileDropdown() {
    const store = extension_settings[extensionName];
    const select = $("#statai-persona-profile-select");

    if (!select.length) return;

    select.empty();

    const profiles = store.profiles || {};

    for (const name of Object.keys(profiles)) {
        select.append(`<option value="${name}">${name}</option>`);
    }

    const personaKey = getCurrentPersonaKey();
    const active = store.activeProfiles?.[personaKey];

    if (active) {
        select.val(active);
    }
}

let personaPanelObserverStarted = false;

function startPersonaPanelObserver() {
    if (personaPanelObserverStarted) return;
    personaPanelObserverStarted = true;

    const observer = new MutationObserver(() => {
        injectPersonaProfileSelector();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

eventSource.on(event_types.CHAT_LOADED, () => {
    setTimeout(() => {
        injectCharacterProfileSelector();
        injectPersonaProfileSelector();
    }, 100);
});
eventSource.on(event_types.GENERATION_STARTED, () => {
    injectStatsIntoMainPrompt();
});
jQuery(async () => {
    initSettings();

    await loadUI();
    wireUI();
    startPersonaPanelObserver();
    injectPersonaProfileSelector();
    $(document).on("click", "#remove_profile_menu", function () {
        removeProfile();
    });
    $(document).on("change", "#statai-character-profile-select", function () {
        const store = extension_settings[extensionName];

        const selected = $(this).val();
        const context = getContext();
        const charId = context?.characterId;

        if (!charId) return;

        store.activeProfiles = store.activeProfiles || {};
        store.activeProfiles[charId] = selected;

        saveSettingsDebounced();

        logSmarterRpg("Character profile set", { charId, selected });

        // notify listener
        $(document).trigger("smarter_rpg_switch_profile", [selected]);
    });
    $(document).on("change", "#statai-persona-profile-select", function () {
        const store = extension_settings[extensionName];

        const selected = $(this).val();
        const personaKey = getCurrentPersonaKey();

        store.activeProfiles = store.activeProfiles || {};
        store.activeProfiles[personaKey] = selected;

        saveSettingsDebounced();

        logSmarterRpg("Persona profile set", { personaKey, selected });

        // notify listener
        $(document).trigger("smarter_rpg_switch_profile", [selected]);
    });
    // Restore enabled toggle state
    const enabled = extension_settings[extensionName]?.enabled ?? true;
    $("#statai-enabled-toggle").prop("checked", enabled);

    // Restore prompt template values
    const store = extension_settings[extensionName];
    if (store?.backendPromptTemplate) {
        $("#statai-backend-prompt-template").val(store.backendPromptTemplate);
    }
    if (store?.frontendStatTemplate) {
        $("#statai-frontend-stat-template").val(store.frontendStatTemplate);
    }

    console.log("[SmarterRPG] Loaded");
    refreshProfileDropdown();
    const initialProfile = $("#statai-profile-select").val();
    if (initialProfile) {
        $(document).trigger("smarter_rpg_switch_profile", [initialProfile]);
    }
});