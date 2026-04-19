import { event_types, eventSource, getCurrentChatId } from "../../../../../script.js";
import { extensionEventSource, extensionEventTypes } from "../events/ExtensionEvents.js";
import RPGMessage from "../storage_systems/classes/chat/RPGMessage.js";
import { getExtensionEnabled } from "../storage_systems/GlobalExtensionStorage.js";

let isEnabled = false;
function setupChatVisuals()
{
    extensionEventSource.on(extensionEventTypes.ACTIVE_CHARACTER_PROFILE_CHANGED, ()=>{
        isEnabled = getExtensionEnabled();
        loadMessageVisuals();
    })
    extensionEventSource.on(extensionEventTypes.ACTIVE_PERSONA_PROFILE_CHANGED, ()=>{
        isEnabled = getExtensionEnabled();
        loadMessageVisuals();
    })
    extensionEventSource.on(extensionEventTypes.RELOAD_CHAT_VISUALS, ()=>{
        isEnabled = getExtensionEnabled();
        loadMessageVisuals();
    })
    extensionEventSource.on(extensionEventTypes.EXTENSION_ENABLED_CHANGED, async (/** @type {boolean} */ enabled) => {
        isEnabled = enabled;
        loadMessageVisuals();
    })
    eventSource.on(event_types.CHAT_LOADED, ()=>{
        isEnabled = getExtensionEnabled();
        loadMessageVisuals();
    })
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
        if (!isEnabled) {
            messageEmbed.hide();
            messageBreakline.hide();
            return;
        }
        messageEmbed.show();
        messageBreakline.show();
        const activeProfile = message.charData.getActiveProfile()
        if (!activeProfile) {
            console.log("No active profile for message, displaying no stats");
            messageEmbed.append(`<span class="statai-stat-display">No Stats</span>`)
            return;
        }
        const activeProfileStats = activeProfile.getStats();
        const stats = message.getStats()
        if (!stats || Object.keys(stats.getStats()).length === 0) {
            messageEmbed.append(`<span class="statai-stat-display">No Stats</span>`)
            return;
        }
        console.log("Loading stats for message", { messageIndex: message.getMessageId().getMessageIndex(), swipeIndex: message.getMessageId().getSwipeIndex(), stats: stats.getStats() });
        Object.keys(stats.getStats()).forEach(statName => {
            let statValue = stats.getStat(statName);
            if (statValue === undefined) return;

            const defaultStat = activeProfileStats.find(s => s.getName() === statName);
            if (defaultStat) {
                const defaultType = defaultStat.getType();
                if (typeof statValue === "number" && (defaultType === "range" || defaultType === "percentage")) {
                    statValue = Math.min(Math.max(statValue, defaultStat.getMin()), defaultStat.getMax());
                }
            }

            const statElement = $(`<div class="statai_stat_embed_stat"><span class="statai_stat_embed_stat_name"><b>${statName}</span>:</b> <input class="statai_stat_embed_stat_value statai-input dynasize" data-extra-size="10" value="${statValue}"/></div>`)
            messageEmbed.append(statElement)
            console.log("Added stat element for stat", statName, "with value", statValue);
            const inputElement = statElement.find(".statai_stat_embed_stat_value").first();
            inputElement.off("change").on("change", function(){
                const newValue = $(this).val();
                if (typeof newValue !== "string"){
                    $(this).val(stats.getStat(statName)?.toString() ?? "0");
                    return;
                }
                const numericValue = parseFloat(newValue);
                if (!isNaN(numericValue)) {
                    stats.setStat(statName, numericValue);
                    message.setStats(stats);
                    message.save();
                }
                else {
                    $(this).val(stats.getStat(statName)?.toString() ?? newValue ?? "0");
                }
            })
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