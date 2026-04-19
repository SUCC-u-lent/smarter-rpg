import { getCurrentChatId } from "../../../../../script.js";
import { event_types, eventSource } from "../../../../events.js";
import { extensionEventSource, extensionEventTypes } from "../events/ExtensionEvents.js";
import { getCharacterData, getCharacterIdByName } from "../storage_systems/CharacterExtensionStorage.js";
import { getChatExtensionStorage, setChatExtensionStorageForMessage } from "../storage_systems/ChatExtensionStorage.js";
import MessageId from "../storage_systems/classes/chat/MessageId.js";
import StoredMessage from "../storage_systems/classes/chat/StoredMessage.js";
import { getExtensionEnabled, getGlobalExtensionStorage } from "../storage_systems/GlobalExtensionStorage.js";
import { isMessageProcessed } from "../utilities/ExtensionUtilities.js";


const STAT_DESCRIPTION_LAYOUT = "{{stat_name}}'s Description: {{stat_description}}. It has the default value of {{stat_defaultValue}}, and should not exceed a change of {{stat_maxDelta}} from the current value."
const AI_LOG_PREFIX = "[Smarter RPG][AIExecutor]";

/**
 * @param {string} message
 * @param {unknown} [data]
 */
function debugLog(message, data)
{
    if (data === undefined) {
        console.log(`${AI_LOG_PREFIX} ${message}`);
        return;
    }
    console.log(`${AI_LOG_PREFIX} ${message}`, data);
}

/**
 * @param {string} message
 * @param {unknown} [data]
 */
function debugWarn(message, data)
{
    if (data === undefined) {
        console.warn(`${AI_LOG_PREFIX} ${message}`);
        return;
    }
    console.warn(`${AI_LOG_PREFIX} ${message}`, data);
}

let isEnabled = false;
export function setupAIExecutor(){
    isEnabled = getExtensionEnabled();
    debugLog("Setup complete", { enabled: isEnabled });
    extensionEventSource.on(extensionEventTypes.EXTENSION_ENABLED_CHANGED, async (/** @type {boolean} */ enabled) => {
        isEnabled = enabled;
        debugLog("Extension enabled state changed", { enabled: isEnabled });
    })

    // Listen for a new message to be added, then trigger a generation of stats for the previous message assuming the previous message has not already had a stat generated.
    eventSource.on(event_types.USER_MESSAGE_RENDERED,(/** @type {number} */ messageIndex)=>{
        if (!isEnabled) {
            debugLog("Skipping USER_MESSAGE_RENDERED: extension disabled", { messageIndex });
            return;
        }
        const currentMessage = resolveRenderedMessageElement(messageIndex);
        if (!currentMessage || currentMessage.length === 0) {
            debugWarn("Could not resolve rendered user message element", { messageIndex });
            return;
        }
        debugLog("USER_MESSAGE_RENDERED resolved", { messageIndex, mesid: currentMessage.attr("mesid"), swipeid: currentMessage.attr("swipeid") });
        onMessageRendered(currentMessage, false)
    })
    eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED,(/** @type {number} */ messageIndex)=>{
        if (!isEnabled) {
            debugLog("Skipping CHARACTER_MESSAGE_RENDERED: extension disabled", { messageIndex });
            return;
        }
        const currentMessage = resolveRenderedMessageElement(messageIndex);
        if (!currentMessage || currentMessage.length === 0) {
            debugWarn("Could not resolve rendered character message element", { messageIndex });
            return;
        }
        debugLog("CHARACTER_MESSAGE_RENDERED resolved", { messageIndex, mesid: currentMessage.attr("mesid"), swipeid: currentMessage.attr("swipeid") });
        onMessageRendered(currentMessage, true)
    })
}

/**
 * @param {JQuery<HTMLElement>} messageElement
 * @param {boolean} [preferCurrentMessage]
 */
function onMessageRendered(messageElement, preferCurrentMessage = false)
{
    const messageId = getMessageIdFromElement(messageElement);
    debugLog("onMessageRendered", { messageIndex: messageId.getMessageIndex(), swipeIndex: messageId.getSwipeIndex(), preferCurrentMessage });
    const hasMessageBeenProcessed = isMessageProcessed(messageId)
    if (hasMessageBeenProcessed)
    {
        debugLog("Current message already processed; skipping generation", { messageIndex: messageId.getMessageIndex(), swipeIndex: messageId.getSwipeIndex() });
        return;
    }
    let targetMessageElement = preferCurrentMessage ? messageElement : getMessageElementByMesId(messageId.getMessageIndex() - 1);
    if (!preferCurrentMessage && targetMessageElement.length === 0) {
        debugLog("No previous message found; nothing to generate", { messageIndex: messageId.getMessageIndex() });
        return;
    }

    let targetMessageId = getMessageIdFromElement(targetMessageElement);

    // If preferred target cannot generate (common case: user message in normal mode), fall back to previous message once.
    if (!canGenerate(targetMessageElement) && preferCurrentMessage) {
        const previousMessageElement = getMessageElementByMesId(messageId.getMessageIndex() - 1);
        if (previousMessageElement.length > 0 && canGenerate(previousMessageElement)) {
            targetMessageElement = previousMessageElement;
            targetMessageId = getMessageIdFromElement(targetMessageElement);
            debugLog("Current message cannot generate; falling back to previous message", {
                currentMessageIndex: messageId.getMessageIndex(),
                fallbackMessageIndex: targetMessageId.getMessageIndex(),
            });
        }
    }

    if (isMessageProcessed(targetMessageId)) {
        debugLog("Target message already processed; skipping generation", { messageIndex: targetMessageId.getMessageIndex(), swipeIndex: targetMessageId.getSwipeIndex() });
        return;
    }

    debugLog("Generating stats for target message", { messageIndex: targetMessageId.getMessageIndex(), swipeIndex: targetMessageId.getSwipeIndex() });
    const previousMessageStats = generateStatsForMessage(targetMessageElement, targetMessageId);
    // We don't await the stats generation because we don't want to block the message rendering, instead we'll just update the stats when they are ready.
    previousMessageStats.then(stats => {
        // After generating the stats, we need to check if the message has been edited or regenerated in the meantime, if it has then we shouldn't update the stats because they would be out of date.
        if (!stats) {
            debugLog("Generation returned no stats", { messageIndex: targetMessageId.getMessageIndex(), swipeIndex: targetMessageId.getSwipeIndex() });
            return;
        }
        if (isMessageProcessed(targetMessageId)) {
            debugLog("Skipping save: message became processed before save", { messageIndex: targetMessageId.getMessageIndex(), swipeIndex: targetMessageId.getSwipeIndex() });
            return;
        }
        debugLog("Saving generated stats", { messageIndex: targetMessageId.getMessageIndex(), swipeIndex: targetMessageId.getSwipeIndex() });
        setChatExtensionStorageForMessage(getCurrentChatId(), stats)
        extensionEventSource.emit(extensionEventTypes.RELOAD_CHAT_VISUALS);
    })
}

/**
 * @param {number} eventMessageIndex
 * @returns {JQuery<HTMLElement>}
 */
function resolveRenderedMessageElement(eventMessageIndex)
{
    if (typeof eventMessageIndex === "number" && !Number.isNaN(eventMessageIndex)) {
        const byMesId = getMessageElementByMesId(eventMessageIndex);
        if (byMesId.length > 0) return byMesId;

        const byPosition = $(".mes").eq(eventMessageIndex);
        if (byPosition.length > 0) return byPosition;
    }

    return $(".mes").last();
}

/**
 * @param {number} mesId
 * @returns {JQuery<HTMLElement>}
 */
function getMessageElementByMesId(mesId)
{
    if (typeof mesId !== "number" || Number.isNaN(mesId) || mesId < 0) return $();
    const allCandidates = $(".mes").filter(function(){
        const rawMesId = $(this).attr("mesid");
        return rawMesId !== undefined && parseInt(rawMesId, 10) === mesId;
    });

    if (allCandidates.length === 0) return $();
    const visibleCandidates = allCandidates.filter(":visible");
    if (visibleCandidates.length > 0) return visibleCandidates.last();
    return allCandidates.last();
}

/**
 * @param {JQuery<HTMLElement>} messageElement
 */
function getMessageIdFromElement(messageElement)
{
    const mesidRaw = messageElement.attr("mesid");
    const parsedMessageIndex = mesidRaw ? parseInt(mesidRaw, 10) : NaN;
    const messageIndex = Number.isNaN(parsedMessageIndex)
        ? $(".mes").index(messageElement)
        : parsedMessageIndex;
    const swipeRaw = messageElement.attr("swipeid") ?? `${messageElement.prop("swipeid") ?? 0}`;
    const parsedSwipeIndex = parseInt(swipeRaw, 10);
    const swipeIndex = Number.isNaN(parsedSwipeIndex) ? 0 : parsedSwipeIndex;
    return new MessageId(messageIndex, swipeIndex);
}

/**
 * @param {JQuery<HTMLElement>} messageElement
 * @param {MessageId} messageId
 * @returns {Promise<StoredMessage|null>}
 */
async function generateStatsForMessage(messageElement, messageId)
{
    const messageContent = getMessageContent(messageElement);
    if (!messageContent) {
        debugLog("Skipping generation: empty message content", { messageIndex: messageId.getMessageIndex() });
        return Promise.resolve(null);
    }
    if (messageContent.length > 1000) {
        debugLog("Skipping generation: message too long", { messageIndex: messageId.getMessageIndex(), length: messageContent.length });
        return Promise.resolve(null);
    } // If the message is too long then we won't generate stats for it because it would be too expensive and likely not useful.
    if (!canGenerate(messageElement)) {
        const statMode = getStatMode();
        const statContext = getPromptStatContext(messageElement);
        debugLog("Skipping generation: canGenerate=false", {
            messageIndex: messageId.getMessageIndex(),
            statMode,
            hasUsableStats: statContext.hasUsableStats,
            statCount: statContext.allStats ? statContext.allStats.split("\n").filter(Boolean).length : 0,
        });
        return Promise.resolve(null);
    }
    const targetMessageIndex = $(".mes").index(messageElement);
    if (targetMessageIndex < 0) {
        debugWarn("Skipping generation: target message not found in DOM index", {
            messageIndex: messageId.getMessageIndex(),
            swipeIndex: messageId.getSwipeIndex(),
        });
        return Promise.resolve(null);
    }
    const historyStartIndex = Math.max(0, targetMessageIndex - 5);
    const messageHistory = $(".mes").slice(historyStartIndex, targetMessageIndex + 1);
    const prompt = constructAuxilPrompt(messageHistory);
    if (!prompt.trim()) {
        debugWarn("Skipping generation: constructed prompt is empty", {
            messageIndex: messageId.getMessageIndex(),
            targetMessageIndex,
        });
        return Promise.resolve(null);
    }
    const baseUrl = getGlobalExtensionStorage().getConfig().getConnectivity().getBackendUrl();
    const model = getGlobalExtensionStorage().getConfig().getConnectivity().getModel();
    debugLog("Dispatching generation request", {
        endpoint: `${baseUrl}/api/generate`,
        model,
        messageIndex: messageId.getMessageIndex(),
        targetMessageIndex,
        historyLength: messageHistory.length,
        promptLength: prompt.length,
        promptPreview: prompt.slice(0, 280),
    });
    try{
        const response = await fetch(`${baseUrl}/api/generate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model,
                prompt: prompt,
                options: {
                    temperature:0.7
                },
                format:"json"
            })
        });
        debugLog("Generation response received", { status: response.status, ok: response.ok });
        if (!response.ok) {
            console.error("Failed to generate stats for message with status:", response.status, "and message:", await response.text());
            return null;
        }
        const responseData = await response.json();
        let responseJson = {};
        try {
            responseJson = JSON.parse(responseData.response || "{}");
        } catch (parseError) {
            debugWarn("Failed to parse backend response JSON string", { responseData, parseError });
            return null;
        }
        debugLog("Generation response payload", { responseData, responseJson });
        const generatedMessage = mapResponseToStoredMessage(responseJson, messageElement, messageId);
        if (!generatedMessage) {
            debugLog("Generation produced no applicable stat changes", { messageIndex: messageId.getMessageIndex(), swipeIndex: messageId.getSwipeIndex() });
            return null;
        }
        return generatedMessage;
    }catch(error)
    {
        console.error("Error while generating stats for message:", error);
        return null;
    }
    return null;
}

/**
 * @param {any} responseJson
 * @param {JQuery<HTMLElement>} messageElement
 * @param {MessageId} messageId
 * @returns {StoredMessage|null}
 */
function mapResponseToStoredMessage(responseJson, messageElement, messageId)
{
    if (!responseJson || typeof responseJson !== "object" || Array.isArray(responseJson)) {
        debugWarn("Skipping response mapping: invalid JSON payload", { responseJson });
        return null;
    }

    if (responseJson.blocked && typeof responseJson.blocked === "string") {
        debugLog("Model returned blocked response", { blocked: responseJson.blocked });
        return null;
    }

    const targetCharacter = typeof responseJson.targetCharacter === "string" ? responseJson.targetCharacter.trim() : "";
    const messageAuthor = getMessageAuthorName(messageElement);
    if (!targetCharacter) {
        debugLog("No targetCharacter in response; skipping stat update", { responseJson });
        return null;
    }

    if (targetCharacter.toLowerCase() !== messageAuthor.toLowerCase()) {
        debugWarn("Skipping response mapping: targetCharacter does not match message author", { targetCharacter, messageAuthor });
        return null;
    }

    const changes = responseJson.changes;
    if (!changes || typeof changes !== "object" || Array.isArray(changes)) {
        debugLog("No valid changes object in response", { changes });
        return null;
    }

    const statMode = getStatMode();
    const allowedStatNames = getAllowedStatNamesForTarget(targetCharacter, messageElement, statMode);

    const baseStats = getCurrentStatsForAuthor(targetCharacter, messageElement);
    const chatId = getCurrentChatId();
    if (!chatId) {
        debugWarn("Could not determine chatId when mapping response");
        return null;
    }

    const storedMessage = new StoredMessage();
    storedMessage.setChatId(chatId);
    storedMessage.setMessageId(messageId);
    const statsInstance = storedMessage.getStats();

    Object.entries(baseStats).forEach(([statName, statValue]) => {
        const numericValue = coerceFiniteNumber(statValue);
        if (numericValue !== null) {
            statsInstance.setStat(statName, numericValue);
        }
    });

    let appliedChanges = 0;
    Object.entries(changes).forEach(([statName, rawDelta]) => {
        if (allowedStatNames && !allowedStatNames.has(statName)) {
            debugWarn("Ignoring disallowed stat change for current stat mode", { statMode, statName, targetCharacter });
            return;
        }
        const delta = coerceFiniteNumber(rawDelta);
        if (delta === null) {
            debugWarn("Ignoring non-numeric stat delta", { statName, rawDelta });
            return;
        }
        const currentValue = coerceFiniteNumber(statsInstance.getStat(statName)) ?? 0;
        statsInstance.setStat(statName, currentValue + delta);
        appliedChanges++;
    });

    if (appliedChanges === 0) {
        debugLog("No numeric changes applied from response", { changes });
        return null;
    }

    storedMessage.setStats(statsInstance);
    debugLog("Mapped response to StoredMessage", {
        messageIndex: messageId.getMessageIndex(),
        swipeIndex: messageId.getSwipeIndex(),
        targetCharacter,
        appliedChanges,
        resultingStats: statsInstance.getStats(),
    });
    return storedMessage;
}

/**
 * @param {string} targetCharacter
 * @param {JQuery<HTMLElement>} messageElement
 * @param {"normal"|"chaos"|"wild"} statMode
 * @returns {Set<string> | null}
 */
function getAllowedStatNamesForTarget(targetCharacter, messageElement, statMode)
{
    if (statMode === "wild") return null;

    if (statMode === "chaos") {
        const allowed = new Set();
        const profiles = getGlobalExtensionStorage().getProfiles();
        profiles.forEach((/** @type {{ getStats: () => any[] }} */ profile) => {
            profile.getStats().forEach((/** @type {{ getName: () => string }} */ stat) => {
                allowed.add(stat.getName());
            });
        });
        return allowed;
    }

    // normal mode: only stats that belong to the target character profile
    const targetStats = getCurrentStatsForAuthor(targetCharacter, messageElement);
    return new Set(Object.keys(targetStats));
}

/**
 * @param {unknown} value
 * @returns {number|null}
 */
function coerceFiniteNumber(value)
{
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
        const parsed = Number.parseFloat(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return null;
}

/**
 * @param {JQuery<HTMLElement>} messages
 */
function constructAuxilPrompt(messages)
{
    const splicedMessageHistory = messages.toArray().slice(0, -1)
    const previousMessages = splicedMessageHistory
        .map(message => formatMessageLine($(message)))
        .filter(line => !!line)
        .join("\n");
    const currentMessage = messages.last();
    const currentMessageLine = formatMessageLine(currentMessage);
    const participantAuthors = getParticipantAuthors(messages);
    const emptyCharacters = getEmptyParticipantAuthors(participantAuthors, currentMessage).join(", ") || "None";
    const statContext = getPromptStatContext(currentMessage, participantAuthors);
    const allStats = statContext.allStats;
    const allStatDescriptions = statContext.allStatDescriptions;

    const statMode = getStatMode();
    let auxilPrompt = getGlobalExtensionStorage().getConfig().getConnectivity().getAuxilPromptWithPromptAllowance(statMode === "wild", statMode !== "chaos");
    auxilPrompt = auxilPrompt.replaceAll("{{history}}", previousMessages || "None")
    .replaceAll("{{message}}", currentMessageLine || "Unknown: No message content")
    .replaceAll("{{emptyCharacters}}", emptyCharacters)
    .replaceAll("{{all_stats}}", allStats || "None")
    .replaceAll("{{all_stat_descriptions}}", allStatDescriptions || "None")
    return auxilPrompt;
}

/**
 * @param {JQuery<HTMLElement>} messageElement
 */
function canGenerate(messageElement)
{
    const statMode = getStatMode();
    if (statMode === "wild") return true;
    const statContext = getPromptStatContext(messageElement);
    return statContext.hasUsableStats;
}

/** @returns {"normal"|"chaos"|"wild"} */
function getStatMode()
{
    const mode = getGlobalExtensionStorage().getConfig().getStatMode();
    if (typeof mode !== "string") return "normal";
    const normalized = mode.trim().toLowerCase();
    if (normalized === "wild" || normalized === "chaos") return normalized;
    return "normal";
}

/**
 * @param {JQuery<HTMLElement>} messageElement
 * @param {string[]} [participantAuthors]
 * @returns {{ allStats: string, allStatDescriptions: string, hasUsableStats: boolean }}
 */
function getPromptStatContext(messageElement, participantAuthors = [])
{
    const statMode = getStatMode();
    const author = getMessageAuthorName(messageElement);
    const participants = participantAuthors.length > 0 ? participantAuthors : [author];
    const allStats = formatAllParticipantStats(participants, messageElement);

    if (statMode === "chaos" || statMode === "wild") {
        const currentStats = getCurrentStatsForAuthor(author, messageElement);
        /** @type {Record<string, string | number>} */
        const mergedStats = { ...currentStats };
        /** @type {Map<string, string>} */
        const descriptionByName = new Map();

        const profiles = getGlobalExtensionStorage().getProfiles();
        profiles.forEach((/** @type {{ getStats: () => any[] }} */ profile) => {
            profile.getStats().forEach((/** @type {{ getName: () => string; getDescription: () => string; getDefaultValue: () => string | number; getMaxDelta: () => number | null; }} */ stat) => {
                const statName = stat.getName();
                if (!(statName in mergedStats)) {
                    mergedStats[statName] = stat.getDefaultValue();
                }
                if (!descriptionByName.has(statName)) {
                    descriptionByName.set(statName, formatStatDescription(stat));
                }
            });
        });
        const allStatDescriptions = Array.from(descriptionByName.values()).join("\n");
        return {
            allStats,
            allStatDescriptions,
            hasUsableStats: Object.keys(mergedStats).length > 0,
        };
    }

    const activeProfile = getActiveProfileForMessage(messageElement);
    const currentStats = getCurrentStatsForAuthor(author, messageElement);
    const allStatDescriptions = activeProfile
        ? activeProfile.getStats().map(stat => formatStatDescription(stat)).join("\n")
        : "";
    return {
        allStats,
        allStatDescriptions,
        hasUsableStats: Object.keys(currentStats).length > 0,
    };
}

/**
 * @param {JQuery<HTMLElement>} messages
 * @returns {string[]}
 */
function getParticipantAuthors(messages)
{
    /** @type {string[]} */
    const orderedAuthors = [];
    messages.toArray().forEach(message => {
        const author = getMessageAuthorName($(message));
        if (isPlaceholderAuthorName(author)) {
            debugWarn("Skipping placeholder author in participant list", { author });
            return;
        }
        if (!orderedAuthors.includes(author)) {
            orderedAuthors.push(author);
        }
    });
    return orderedAuthors;
}

/**
 * @param {string} author
 */
function isPlaceholderAuthorName(author)
{
    const normalized = author.trim();
    return /^\$\{[^}]+\}$/.test(normalized);
}

/**
 * @param {string[]} authors
 * @param {JQuery<HTMLElement>} messageElement
 */
function formatAllParticipantStats(authors, messageElement)
{
    return authors
        .map(author => formatCharacterStats(author, getCurrentStatsForAuthor(author, messageElement)))
        .join("\n");
}

/**
 * @param {string[]} authors
 * @param {JQuery<HTMLElement>} messageElement
 */
function getEmptyParticipantAuthors(authors, messageElement)
{
    return authors.filter(author => Object.keys(getCurrentStatsForAuthor(author, messageElement)).length === 0);
}

/**
 * @param {string} author
 * @param {Record<string, string | number>} stats
 */
function formatCharacterStats(author, stats)
{
    const statEntries = Object.entries(stats)
        .map(([statName, statValue]) => `${statName}: ${statValue}`)
        .join(", ");
    const safeAuthor = author && author.trim() ? author.trim() : "Unknown";
    return `${safeAuthor}'s Stats: [${statEntries || "No Stats"}]`;
}

/**
 * @param {JQuery<HTMLElement>} messageElement
 */
function getMessageContent(messageElement)
{
    return messageElement.find(".mes_text").text().replace(/\s+/g, " ").trim();
}

/**
 * @param {JQuery<HTMLElement>} messageElement
 */
function formatMessageLine(messageElement)
{
    const author = getMessageAuthorName(messageElement);
    const messageContent = getMessageContent(messageElement);
    if (!messageContent) return "";
    return `${author}: ${messageContent}`;
}

/**
 * @param {JQuery<HTMLElement>} messageElement
 */
function getMessageAuthorName(messageElement)
{
    return messageElement.find(".name_text").first().text().trim() || "Unknown";
}

/**
 * @param {JQuery<HTMLElement>} messageElement
 */
function getActiveProfileForMessage(messageElement)
{
    const author = getMessageAuthorName(messageElement);
    const characterId = getCharacterIdByName(author);
    if (!characterId) return null;
    const characterData = getCharacterData(characterId);
    return characterData.getActiveProfile();
}

/**
 * @param {string} author
 * @param {JQuery<HTMLElement>} messageElement
 * @returns {Record<string, string | number>}
 */
function getCurrentStatsForAuthor(author, messageElement)
{
    const characterId = getCharacterIdByName(author);
    if (!characterId) return {};
    const characterData = getCharacterData(characterId);
    const activeProfile = characterData.getActiveProfile();
    if (!activeProfile) return {};

    /** @type {Record<string, string | number>} */
    const resolvedStats = {};
    activeProfile.getStats().forEach(stat => {
        resolvedStats[stat.getName()] = stat.getDefaultValue();
    });

    const currentChatId = getCurrentChatId();
    if (!currentChatId) return resolvedStats;

    const currentMessageIndex = $(".mes").index(messageElement);
    if (currentMessageIndex <= 0) return resolvedStats;

    const chatStorage = getChatExtensionStorage(currentChatId);
    const priorMessages = $(".mes").slice(0, currentMessageIndex).toArray().reverse();
    const priorMessage = priorMessages.find(message => getMessageAuthorName($(message)) === author);
    if (!priorMessage) return resolvedStats;

    const priorMessageIndex = $(".mes").index(priorMessage);
    const priorSwipeIndex = Number($(priorMessage).prop("swipeid") || 0);
    const priorMessageId = new MessageId(priorMessageIndex, priorSwipeIndex);
    const storedMessage = chatStorage.find(message => message.getMessageId().equals(priorMessageId));
    if (!storedMessage) return resolvedStats;

    const storedStats = storedMessage.getStats().getStats();
    Object.entries(storedStats).forEach(([statName, statValue]) => {
        resolvedStats[statName] = statValue;
    });
    return resolvedStats;
}

/**
 * @param {{ getName: () => string; getDescription: () => string; getDefaultValue: () => string | number; getMaxDelta: () => number | null; }} stat
 */
function formatStatDescription(stat)
{
    return STAT_DESCRIPTION_LAYOUT
        .replaceAll("{{stat_name}}", stat.getName())
        .replaceAll("{{stat_description}}", stat.getDescription())
        .replaceAll("{{stat_defaultValue}}", `${stat.getDefaultValue()}`)
        .replaceAll("{{stat_maxDelta}}", stat.getMaxDelta() === null ? "no limit" : `${stat.getMaxDelta()}`);
}
