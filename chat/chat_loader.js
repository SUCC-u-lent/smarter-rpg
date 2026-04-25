import { setExtensionPrompt } from "../../../../../script.js";
import { event_types, eventSource } from "../../../../events.js";
import BaseCharacter from "../characterdata/base_character.js";
import GlobalCharacter from "../characterdata/global_character.js";
import ChatMessageData from "../characterdata/message_data.js";
import { extensionEventSource, extensionEventTypes } from "../events/extension_events.js";
import ExtensionStorage from "../storage/ExtensionStorage.js";
import { getStatDescription } from "../utilities/ExtensionUtilities.js";
import { getAuthorFromMessage, getLastMessage, getMessageBefore } from "../utilities/MessageUtilities.js";
import addMessageRenderers from "./rendering/chat_renderer.js";
import { generateStatsForMessage } from "./runtime/chatGeneration.js";

/** Temporarily store pending stats to attach to the next AI message */
let pendingStats = null;


export function loadChat()
{
    eventSource.on(event_types.MESSAGE_DELETED, ()=>{
        // Clear pending stats if a message is deleted
        pendingStats = null;
    })
    eventSource.on(event_types.CHAT_CHANGED, addMessageRenderers)
    eventSource.on(event_types.USER_MESSAGE_RENDERED, addMessageRenderers)
    eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, async (messageId)=>{
        // Attach pending stats to the newly rendered AI message
        if (pendingStats && Object.keys(pendingStats).length > 0) {
            const aiMessage = getLastMessage();
            if (aiMessage) {
                const messageData = ChatMessageData.convertFromMessage(aiMessage);
                messageData.setStats(pendingStats);
                messageData.save();
                console.log("Attached stats to AI message:", pendingStats);
                pendingStats = null; // Clear after attaching
            }
        }
        addMessageRenderers();
    })
    extensionEventSource.on(extensionEventTypes.ON_RELOAD_CHAT, addMessageRenderers)
    
    eventSource.on(event_types.GENERATION_ENDED, async ()=>{
        preProcessMessage(getLastMessage(), "generation_end");
    })
    eventSource.makeFirst(event_types.MESSAGE_SWIPED, async ()=>{
        const lastMessage = getLastMessage(); // The swiped AI message is the last in the DOM — stats are stored against it.
        if (!lastMessage) {return}
        ChatMessageData.deleteMessageData(lastMessage);
        // Delete the swiped message's stats so they are regenerated fresh on the next swipe generation.
    })
    eventSource.makeLast(event_types.GENERATE_BEFORE_COMBINE_PROMPTS, async ()=>{
        // Get the last user message (the prompt message) to derive stats from
        const promptMessage = getMessageBefore(getLastMessage());
        if (!promptMessage) {return}
        const stats = await preProcessMessage(promptMessage, "generate");
        
        // Store stats temporarily; will attach to AI message when it renders
        pendingStats = stats;

        const statValues = Object.entries(stats).map(([statName, statValue])=>`- ${statName}: ${statValue}`).join("\n");
        const statDescriptions = Object.keys(stats).map(statName=>{
            const description = getStatDescription(statName);
            return `${statName} is described as: ${description}`;
        }).join("\n");

        const rawMessagePrompt = ExtensionStorage.get("message_prompt", ExtensionStorage.Defaults.message_prompt)
            .replaceAll("{{character_stats}}", statValues)
            .replaceAll("{{stat_descriptions}}", statDescriptions);

        setExtensionPrompt(
            "smarter-rpg",
            rawMessagePrompt,
            ExtensionStorage.get("stat_position", ExtensionStorage.Defaults.stat_position),
            ExtensionStorage.get("stat_depth", ExtensionStorage.Defaults.stat_depth),
            ExtensionStorage.get("stat_worldinfo_included", ExtensionStorage.Defaults.stat_worldinfo_included)
        )
    })
    eventSource.on(event_types.MESSAGE_SENT,async ()=>{
        // This handler runs after the user sends a message, so lastMessage is the user message
        // Only generate stats if it's from a character persona (not a user message)
        const lastMessage = getLastMessage();
        if (!lastMessage) {return}
        const authorName = getAuthorFromMessage(lastMessage);
        try {
            const character = BaseCharacter.getPersonaByName(authorName) || GlobalCharacter.getPersonaByName(authorName);
            if (character){
                const stats = await generateStatsForMessage(lastMessage);
                if (stats && Object.keys(stats).length > 0) {
                    pendingStats = stats;
                }
            }
        } catch (err) {
            // Author not found in personas (likely a user message), which is expected - just skip
        }
    })
}

/** @returns {Promise<Object<string,number>>} */
function preProcessMessage(message, context)
{ // Take the message and extract stats from it, if they are missing then generate them. Return stats but don't save them yet.
    // Stats will be saved to the AI message (which comes after) in CHARACTER_MESSAGE_RENDERED.
    if (!message) {return {}}
    const messageData = ChatMessageData.convertFromMessage(message); // Extracts the current data but doesn't guarantee the default stats are included.
    messageData.verifyStats();
    const stats = messageData.getStats() || {};
    const authorName = getAuthorFromMessage(message);
    const globalCharacter = GlobalCharacter.getByName(authorName);
    const activeProfile = globalCharacter ? globalCharacter.getActiveProfileData() : undefined;
    let defaultStatCount = 0;
    if (activeProfile)
    {
        const defaultStats = activeProfile.getStats() || [];
        defaultStatCount = defaultStats.length;
        defaultStats.forEach(stat=>{
            if (stats[stat.getName()] === undefined)
            {
                stats[stat.getName()] = stat.getDefaultValue();
            }
        })
    }
    if (Object.keys(messageData.getStats() || {}).length !== 0)
    {
        console.log(`Stats already exist for message, skipping generation.`,stats);
        return stats; // If stats exist then we assume they are correct and return them.
    }
    // If the stats are missing or empty then we generate them and return them (don't save yet)
    return generateStatsForMessage(message).then(generatedStats=>{
        const finalStats = {...stats, ...generatedStats};
        extensionEventSource.emit(extensionEventTypes.ON_RELOAD_CHAT);
        console.log(`Final stats after generation:`, finalStats);
        return finalStats;
    }).catch(err=>{
        console.error("Failed to generate stats:", err);
        return stats; // Return default stats on error
    });
}

