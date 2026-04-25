import { sendGenerationRequest, testAuxil } from "../../ai/ai_backend.js";
import ChatMessageData from "../../characterdata/message_data.js";
import ExtensionStorage from "../../storage/ExtensionStorage.js";
import { doesStatExist, getMessageAuthorDefaultProfile, getStatDescription } from "../../utilities/ExtensionUtilities.js";
import { toastError } from "../../utilities/logging.js";
import { getAuthorFromMessage, getLastMessage, getMessageBefore, getMessageBeforeN, getMessageContent, getNMessagesBefore, getMessageBeforeLast } from "../../utilities/MessageUtilities.js";

/** @returns {JQuery<HTMLElement>} */
export async function onMessageGenerated(generatingMessage)
{
    if (!generatingMessage) {return {}}
    const messageSource = getMessageBefore(generatingMessage);
    if (!messageSource || !generatingMessage) {return {}}
    const messageData = ChatMessageData.convertFromMessage(messageSource);
    if (messageData && messageData.stats && Object.keys(messageData.stats).length > 0)
    { return messageData.stats || {} }
    if (!await testAuxil())
    {
        toastError("Cannot connect to Auxil. Please check your settings and ensure the server is running.");
        return {};
    }
    const stats = await generateStatsForMessage(messageSource)
    return stats || {};
}

function buildPrompt(message)
{
    const author = getAuthorFromMessage(message);
    if (!author) {
        throw new Error("Author not found for message");
    }
    const historyMessageCount = ExtensionStorage.get("history_message_count", ExtensionStorage.Defaults.history_message_count);
    const contextMessages = getNMessagesBefore(message, historyMessageCount, true).reverse();
    const chatStats = ChatMessageData.getCurrentChatStats(message) || {};
    const effectiveChatStats = {};
    const statTypeByName = {};
    const knownStatDescriptions = new Set();

    contextMessages.forEach(contextMessage => {
        const author = getAuthorFromMessage(contextMessage);
        if (!author) {
            return;
        }

        const defaultProfile = getMessageAuthorDefaultProfile(contextMessage);
        if (!defaultProfile) {
            return;
        }

        const mergedStats = { ...(chatStats[author] || {}) };
        if (defaultProfile) {
            defaultProfile.getStats().forEach(stat => {
                const statName = stat.getName();
                statTypeByName[statName] = mapProfileStatType(stat.getType());
                if (mergedStats[statName] === undefined) {
                    mergedStats[statName] = stat.getDefaultValue();
                }
            });
        }

        effectiveChatStats[author] = mergedStats;
        Object.keys(mergedStats).forEach(statName => knownStatDescriptions.add(statName));
    });

    const hasAnyStats = Object.values(effectiveChatStats).some(stats => Object.keys(stats).length > 0);
    const statValues = hasAnyStats
        ? Object.entries(effectiveChatStats)
            .map(([characterName, stats]) => {
                const statEntries = Object.entries(stats);
                if (statEntries.length === 0) {
                    return `[${characterName} Stats: No stats set]`;
                }
                const statLines = statEntries.map(([statName, statValue]) => `- ${statName}: ${statValue}`).join(", ");
                return `[${characterName} Stats: ${statLines}]`;
            }).join("\n")
        : "No stats are currently set for any character.";

    const statDescriptions = knownStatDescriptions.size > 0
        ? Array.from(knownStatDescriptions).map(statName => `${statName} is described as: ${getStatDescription(statName)}`)
        : ["No stat descriptions are currently available."];

    const chatCtx = contextMessages.slice(0, -1).map(m => {
        const content = getMessageContent(m);
        const author = getAuthorFromMessage(m);
        return `${author}: ${content}`;
    }).join("\n");

    // Stats as example appears as a typed schema (for example: {"HP": number}).
    const statsAsExample = buildStatsTypeExample(effectiveChatStats, statTypeByName);

    return ExtensionStorage.get("stat_gen_prompt", ExtensionStorage.Defaults.stat_gen_prompt)
        .replaceAll("{{history}}", chatCtx || "No prior chat history available.")
        .replaceAll("{{character_stats}}", statValues)
        .replaceAll("{{stat_descriptions}}", statDescriptions.join("\n"))
        .replaceAll("{{prompt}}", getMessageContent(message))
        .replaceAll("{{target_character}}", author)
        .replaceAll("{{exampleJsonLayout}}",ExtensionStorage.Defaults.exampleJsonLayout)
        .replaceAll("{{stats_as_example}}", statsAsExample)
}

/** @param {"number"|"range"|"percentage"|"string"|"boolean"|string} profileType */
function mapProfileStatType(profileType)
{
    return profileType === "boolean" ? "boolean" : "number";
}

/**
 * @param {Object<string, Object<string, string | number | boolean>>} effectiveChatStats
 * @param {Object<string, "number" | "boolean">} statTypeByName
 */
function buildStatsTypeExample(effectiveChatStats, statTypeByName)
{
    const statTypeMap = { ...statTypeByName };

    Object.values(effectiveChatStats).forEach(stats => {
        Object.keys(stats || {}).forEach(statName => {
            if (!statTypeMap[statName]) {
                statTypeMap[statName] = "number";
            }
        });
    });

    const entries = Object.entries(statTypeMap);
    if (entries.length === 0) {
        return "{}";
    }

    return `{\n${entries.map(([statName, statType]) => `  \"${statName}\": ${statType}`).join(",\n")}\n}`;
}

function decompileResponse(response)
{
    const jsoned = JSON.parse(response.response);
    /** @type {Object<string, string | number>} */
    const stats = jsoned.stats || {};
    // doesStatExist use this on all entries.
    return Object.fromEntries(Object.entries(stats).filter(([statName])=>doesStatExist(statName))
        .filter(([_, statValue])=>typeof statValue === "string" || typeof statValue === "number"));
}

async function generateStatsForMessage(message)
{
    const prompt = buildPrompt(message);
    const response = await sendGenerationRequest(prompt, {
        temperature: ExtensionStorage.get("stat_gen_temperature", ExtensionStorage.Defaults.stat_gen_temperature),
        max_tokens: ExtensionStorage.get("stat_gen_max_tokens", ExtensionStorage.Defaults.stat_gen_max_tokens),
    }, "json");
    if (response && response.response)
    {
        return decompileResponse(response);
    }
    toastError("Failed to generate stats. Please try again.");
    console.error("Failed to generate stats. Response:", response);
}

export { generateStatsForMessage };