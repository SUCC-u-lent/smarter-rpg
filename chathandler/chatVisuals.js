import { event_types, eventSource, getCurrentChatId } from "../../../../../script.js";
import { extensionEventSource, extensionEventTypes } from "../events/ExtensionEvents.js";
import RPGMessage from "../storage_systems/classes/chat/RPGMessage.js";

function setupChatVisuals()
{
    extensionEventSource.on(extensionEventTypes.ACTIVE_CHARACTER_PROFILE_CHANGED, ()=>loadMessageVisuals())
    extensionEventSource.on(extensionEventTypes.ACTIVE_PERSONA_PROFILE_CHANGED, ()=>loadMessageVisuals())
    extensionEventSource.on(extensionEventTypes.RELOAD_CHAT_VISUALS, ()=>loadMessageVisuals())
    eventSource.on(event_types.CHAT_LOADED, ()=>loadMessageVisuals())
}

function loadMessageVisuals()
{
    const messages = $(".mes")
    const chatId = getCurrentChatId();
    if (!chatId) throw new Error("Could not determine current chat ID, cannot load message visuals");
    /** @type {RPGMessage[]} */
    const messageContainers = RPGMessage.fromMessageList(chatId,messages.toArray());
    messageContainers.forEach(message => {
        const messageContainer = $(message.container)
        const messageBreakline = assertExistence(messageContainer, messageContainer.find("#statai_stat_embed_breakline").first(), `<hr id="statai_stat_embed_breakline" class="sysHR"></hr>`)
        const messageEmbed = assertExistence(messageContainer, messageContainer.find("#statai_stat_embed").first(), `<div id="statai_stat_embed" class="statai_stat_embed"></div>`)
        const activeProfile = message.charData.getActiveProfile()
        if (!activeProfile) {
            console.log("No active profile for message, displaying no stats");
            messageEmbed.append(`<span class="statai-stat-display">No Stats</span>`)
            return;
        }
        const stats = message.getStats()
        if (!stats || Object.keys(stats.getStats()).length === 0) {
            messageEmbed.append(`<span class="statai-stat-display">No Stats</span>`)
            return;
        }
        Object.keys(stats.getStats()).forEach(statName => {
            const statValue = stats.getStat(statName);
            if (statValue === undefined) return;
            const statElement = $(`<div class="statai_stat_embed_stat"><span class="statai_stat_embed_stat_name">${statName}</span>: <span class="statai_stat_embed_stat_value">${statValue}</span></div>`)
            messageEmbed.append(statElement)
        })
    })
}

/**
 * @param {JQuery<HTMLElement>} parent
 * @param {JQuery<HTMLElement>} element
 * @param {string} creationString
 */
function assertExistence(parent,element, creationString = `<div></div>`)
{
    if (element.length === 0) {
        element = $(creationString);
        parent.append(element)
    } else {
        element = element.first();
        element.empty();
    }
    return element;
}

export { setupChatVisuals }