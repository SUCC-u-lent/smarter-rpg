// @ts-nocheck
import { event_types, eventSource } from "../../../../events.js";
import { buildStatDescriptionText, getCharactersInChat, getChatCharacterStatsString } from "../chat_embed/chat_event_handler.js";
import { getCharacterStatForActiveChat, saveCharacterStatForActiveChat } from "../chat_mini_display/chat_storage.js";
import { reloadDisplays, setGeneratingState } from "../chat_mini_display/message_display.js";
import { getAIPrompt, getBackendIp, getExampleJsonLayout, getJsonLayout, getModel } from "../connectivity/extensionConnectivity.js";
import { isActive } from "../constants.js";
import { getAllCharacterData, getCharacterData } from "../data_storage/character_config.js";
import { getProfileByName } from "../data_storage/profile_constants.js";
import { dumbassDecodeJson } from "../dumbassJsonDecoder.js";
import { toastError } from "../extensionLogging.js";

const processedMessageFingerprints = new Map();
const pendingMessageTimers = new Map();

function normalizeCharacterName(name)
{
    return String(name || "")
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase();
}

function resolveCharacterFromMessageAuthor(messageAuthor)
{
    const directCharacterData = getCharacterData(messageAuthor);
    if (directCharacterData)
    {
        return {
            characterName: messageAuthor,
            characterData: directCharacterData || {}
        };
    }

    const normalizedAuthor = normalizeCharacterName(messageAuthor);
    const allCharacterData = getAllCharacterData();
    const fallbackCharacterData = allCharacterData.find(character => normalizeCharacterName(character?.name) === normalizedAuthor);

    console.log(`Resolving character for message author '${messageAuthor}'. Direct match: ${!!directCharacterData}. Fallback match: ${!!fallbackCharacterData}. Resolved name: '${fallbackCharacterData?.name || messageAuthor}'`);
    if (!fallbackCharacterData)
    {
        return {
            characterName: messageAuthor,
            characterData: {}
        };
    }

    return {
        characterName: fallbackCharacterData.name,
        characterData: fallbackCharacterData || {}
    };
}

function checkAuxilStatus()
{
    const auxilUrl = getBackendIp()
    return new Promise((resolve, reject) => {
        // Auxil will respond to a GET request at the /api/status endpoint if its online. If not it will fail.
        fetch(`${auxilUrl}/api/status`, {
            method: 'GET'
        })
        .then(response => {
            if (response.ok) {
                resolve(true);
            } else {
                resolve(false);
            }
        })
        .catch(error => {
            resolve(false);
        });
    })
}

function checkOllamaStatus()
{
    const auxilUrl = getBackendIp()
    return new Promise((resolve, reject) => {
        // Ollama will respond to a GET request at the /api/ollama/status endpoint if its online. If not it will fail.
        fetch(`${auxilUrl}/api/ollama/status`, {
            method: 'GET'
        })
        .then(response => {
            if (response.ok) {
                resolve(true);
            } else {
                resolve(false);
            }
        })
        .catch(error => {
            resolve(false);
        });
    })
}

function sendGenerationRequest(prompt, options = {})
{
    const auxilUrl = getBackendIp()
    const model = getModel();
    return new Promise((resolve, reject) => {
        fetch(`${auxilUrl}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                prompt: prompt,
                options: options,
                format: "json"
            })
        })
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                reject(new Error('Generation request failed'));
            }
        })
        .then(data => {
            resolve(data);
        })
        .catch(error => {
            reject(error);
        });
    });
}
function getMessages()
{
    return $(".mes") // Literally mes is the class for messages.
}

function getMessageContent(messageElement)
{
    return $(messageElement).find(".mes_block").find(".mes_text").find("p").first().text();
}

function getMessageAuthor(messageElement)
{
    return $(messageElement).find(".name_text").first().text().trim();
}

function getMessageById(messageId)
{
    const jQueryMessages = getMessages();
    return jQueryMessages[messageId] || null;
}

function getMessageFingerprint(messageElement)
{
    if (!messageElement) return "";
    const author = getMessageAuthor(messageElement);
    const content = getMessageContent(messageElement);
    return `${normalizeCharacterName(author)}::${content}`;
}

function sendStatRequest(messageContent, targetCharacterName){
    let aiPrompt = getAIPrompt()
    if (!aiPrompt.includes("{{jsonLayout}}"))
    {
        return Promise.reject(new Error("AI prompt missing {{jsonLayout}} placeholder"));
    }
    if (!aiPrompt.includes("{{exampleJsonLayout}}"))
    {
        return Promise.reject(new Error("AI prompt missing {{exampleJsonLayout}} placeholder"));
    }
    const descriptionText = buildStatDescriptionText();
    const charactersInChat = getCharactersInChat();
    const characterStats = getChatCharacterStatsString();

    // History contains last 5 messages.
    const messages = getMessages();
    const trimedHistory = messages.slice(-Math.min(messages.length,5));
    const history = []
    trimedHistory.each((index, messageElement) => {
        const characterName = $(messageElement).find(".name_text").first().text().trim(); // If no character name is found default to "Unknown" to avoid confusion for the AI, it can be assumed that messages without a character name are from an unknown character rather than a system message or something else.
        const messageText = getMessageContent(messageElement);
        if (!messageText || !characterName) return;
        history.push(`${characterName}: ${messageText}`);
    });

    aiPrompt = aiPrompt.replaceAll("{{prompt}}", messageContent)
        .replaceAll("{{jsonLayout}}", getJsonLayout())
        .replaceAll("{{exampleJsonLayout}}", getExampleJsonLayout())
        .replaceAll("{{history}}", history.join('\n'))
        .replaceAll('{{stat_descriptions}}', descriptionText)
        .replaceAll('{{character_stats}}', Array.from(characterStats).join('\n'))
        .replaceAll('{{character}}', targetCharacterName || getMessageAuthor(getLastMessage()))
        console.log("Final AI Prompt:", aiPrompt);
    return sendGenerationRequest(aiPrompt,
        {
            temperature:1.25
        }
    );
}
function getLastMessage()
{
    // last message has these classes: mes last_mes
    return $(".mes.last_mes");
}
function getMessageBeforeLast(amount)
{
    const messages = getMessages();
    if (messages.length < amount + 1) return null;
    return messages.eq(messages.length - 1 - amount);
}

function getProfileStats(profileName)
{
    const profile = getProfileByName(profileName);
    return profile ? profile.stats : [];
}

function scheduleStatGeneration(messageId, triggerSource)
{
    if (!isActive()) return;

    const numericMessageId = Number(messageId);
    if (!Number.isInteger(numericMessageId) || numericMessageId < 0) return;

    const existingTimer = pendingMessageTimers.get(numericMessageId);
    if (existingTimer)
    {
        clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
        pendingMessageTimers.delete(numericMessageId);
        onMessageSent(numericMessageId, triggerSource);
    }, 120);

    pendingMessageTimers.set(numericMessageId, timer);
}

function onMessageSent(messageId, triggerSource = "unknown")
{
    const currentMessage = getMessageById(messageId);
    if (!currentMessage) {
        setGeneratingState(false);
        return;
    }

    const rawCharacterName = getMessageAuthor(currentMessage);
    const fingerprint = getMessageFingerprint(currentMessage);
    if (processedMessageFingerprints.get(messageId) === fingerprint)
    {
        return;
    }

    const messageContent = getMessageContent(currentMessage);
    setGeneratingState(true)
    sendStatRequest(messageContent, rawCharacterName).then(httpResponse=>{
        const responseText = httpResponse.response;
        const data = dumbassDecodeJson(responseText);

        const reasoning = data.reasoning || "No reasoning provided.";
        const stats = data.stats || {};
        const normalizedStats = {};
        for (const statName in stats) {
            normalizedStats[String(statName).trim().toLowerCase()] = stats[statName];
        }
        const blocked = data.blocked || {
            isBlocked: false,
            replacementMessage: null
        }

        let loggingLines = []
        loggingLines.push("AI Generation Result:");
        loggingLines.push(`Trigger: ${triggerSource}`);
        loggingLines.push(`Message Index: ${messageId}`);
        loggingLines.push(`Target Character: ${rawCharacterName}`);
        loggingLines.push("Reasoning:");
        loggingLines.push(reasoning);
        loggingLines.push("Stats:");
        // Using const [a,b] doesnt work in jQuery.
        for (const statName in stats)
        {
            const statValue = stats[statName];
            loggingLines.push(`${statName}: ${statValue}`);
        }
        loggingLines.push("Blocked:");
        loggingLines.push(`Is Blocked: ${blocked.isBlocked}`);
        if (blocked.isBlocked)
        {
            loggingLines.push(`Block Reason: ${blocked.reason}`);
            loggingLines.push(`Replacement Message: ${blocked.replacementMessage}`);
        }

        const resolvedCharacter = resolveCharacterFromMessageAuthor(rawCharacterName);
        const characterName = resolvedCharacter.characterName;
        const characterData = resolvedCharacter.characterData;
        if (!characterData || characterData.activeProfile == null) {
            loggingLines.push(`Character gate failed for message author '${rawCharacterName}'. Resolved name: '${characterName}'.`);
            console.log("Received response from backend!", loggingLines.join('\n'));
            return;
        }
        const profileStats = getProfileStats(characterData.activeProfile);
        if (profileStats.length === 0) {
            loggingLines.push(`Profile gate failed for '${characterName}'. Active profile '${characterData.activeProfile}' has no stats.`);
            console.log("Received response from backend!", loggingLines.join('\n'));
            return;
        }
        profileStats.forEach(stat => {
            const currentStatData = getCharacterStatForActiveChat(characterName, characterData.activeProfile, stat.name);
            const statData = currentStatData || {
                name: stat.name,
                value: typeof stat.default === "number" ? stat.default : 0,
                delta: 0
            };

            const rawChangedValue = normalizedStats[String(stat.name).trim().toLowerCase()];
            if (rawChangedValue === undefined) return;

            const changedValue = Number(rawChangedValue);
            if (Number.isNaN(changedValue) || changedValue === 0) return;

            statData.value = statData.value + changedValue;
            statData.delta = changedValue;
            saveCharacterStatForActiveChat(characterName, stat.name, statData);
            loggingLines.push(`Updated stat ${stat.name} to value ${statData.value} (changed by ${changedValue})`);
        })

        console.log("Received response from backend!", loggingLines.join('\n'));
        processedMessageFingerprints.set(messageId, fingerprint);
    })
    .catch(error=>{
        console.error("Error during stat generation:", error);
        toastError("An error occurred while generating stats. Please check the console for more details.");
    })
    .finally(()=>{
        reloadDisplays();
        setGeneratingState(false)
    });
}

function setupEventListeners()
{
    eventSource.on(event_types.USER_MESSAGE_RENDERED, (messageId)=>{
        scheduleStatGeneration(messageId, "USER_MESSAGE_RENDERED");
    });
    eventSource.on(event_types.MESSAGE_EDITED, (messageId)=>{
        scheduleStatGeneration(messageId, "MESSAGE_EDITED");
    });
    eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, (messageId)=>{
        scheduleStatGeneration(messageId, "CHARACTER_MESSAGE_RENDERED");
    });
    eventSource.on(event_types.MESSAGE_SWIPED, (messageId)=>{
        scheduleStatGeneration(messageId, "MESSAGE_SWIPED");
    });
}

export { checkAuxilStatus, checkOllamaStatus, sendGenerationRequest, setupEventListeners };