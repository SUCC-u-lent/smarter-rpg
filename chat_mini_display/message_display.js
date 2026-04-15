import { characters } from "../../../../../script.js";
import { extensionFolderPath } from "../constants.js";
import { getCharacterData } from "../data_storage/character_config.js";
import { getProfiles } from "../data_storage/profile_constants.js";
import { logInfo, toastInfo } from "../extensionLogging.js";
import { getCharacterStatForActiveChat, saveCharacterStatForActiveChat } from "./chat_storage.js";

let messageObserver = null;
let messageContainerPollId = null;

function getMessages()
{
    return $(".mes") // Literally mes is the class for messages.
}

function getLastMessage()
{
    // last message has these classes: mes last_mes
    return $(".mes.last_mes");
}

async function setupMessageObserver()
{
    // The usual way to find the chat. $("#sheld").find("#chat")
    const messageContainer = document.querySelector("#sheld #chat");
    if (!messageContainer)
    {
        if (messageContainerPollId == null)
        {
            messageContainerPollId = window.setInterval(() => {
                const foundContainer = document.querySelector("#sheld #chat");
                if (foundContainer)
                {
                    window.clearInterval(messageContainerPollId);
                    messageContainerPollId = null;
                    setupMessageObserver();
                }
            }, 500);
        }
        return;
    }

    if (messageObserver)
        messageObserver.disconnect();

    messageObserver = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains("mes"))
                {
                    renderDisplays();
                }
            });
        });
    });
    messageObserver.observe(messageContainer, { childList: true });
    renderDisplays(); // Initial render for existing messages.
}

export function reloadDisplays()
{
    renderDisplays();
}

function renderDisplays()
{
    const characterMessages = {};
    getMessages().each((index, messageElement) => {
        // only setup stats if there is a character associated with the message and this is the latest message from that character.
        const characterName = getCharacterFromMessage(messageElement);
        const stCharacterData = getSTCharacterDataFromName(characterName);
        if (!characterName || !stCharacterData) return;
        let $messageElement = $(messageElement).find(".mes_block").first();
        // if the display is already rendered, we'll modify it instead of creating a new one.
        let displayElement = $messageElement.find(".statai-stat-display");
        if (displayElement.length === 0)
        {
            displayElement = $(`<div class="statai-stat-display"></div>`);
            $messageElement.append("<hr class=\"sysHR\" />")
            $messageElement.append(displayElement);
        } else { displayElement.empty(); }
        characterMessages[characterName] = displayElement;
    });
    // now render the stats for each character based on their latest message.
    for (const characterName in characterMessages)
    {
        const $displayElement = $(characterMessages[characterName]);
        const characterData = getCharacterData(characterName);
        if (!characterData || characterData.activeProfile == null)
        {
            $displayElement.append(
                `<span style="font-weight: bold;">No Stats</span>`
            )
            continue;
        }
        const profileStats = getProfileStats(characterData.activeProfile);
        if (profileStats.length === 0)
        {
            $displayElement.append(
                `<span style="font-weight: bold;">No Stats</span>`
            )
            continue;
        }

        // Stats are formatted as "<b>Stat Name</b>: Stat Value"

        profileStats.forEach(stat => {
            const statElement = $(`
                <div class="statai-stat">
                    <span class="statai-stat-name" style="font-weight: bold;"></span>
                    <input class="statai-stat-value"/>
                    <span class="statai-stat-delta"></span>
                </div>
            `);
            const statData = getCharacterStatForActiveChat(characterName, characterData.activeProfile, stat.name);
            let value = statData?.value ?? stat.default;
            let delta = statData?.delta ?? 0;
            statElement.find(".statai-stat-name").text(stat.name + ": ");
            const valueInput = statElement.find(".statai-stat-value");
            valueInput.val(value);
            if (stat.type == "range")
            {
                valueInput.prop("max", maxRange);
                valueInput.prop("min", minRange);
            }
            valueInput.on("change", function() {
                const newValue = $(this).val();
                statData.value = newValue;
                saveCharacterStatForActiveChat(characterName, stat.name, statData);
                toastInfo(`Updated ${stat.name} for ${characterName} to ${newValue}.`,{},10);
            });

            statElement.find(".statai-stat-delta").text(`(${delta > 0 ? "+" : "-"}${Math.abs(delta)})`);
            if (delta == 0)
            { statElement.find(".statai-stat-delta").hide(); } 
            else { statElement.find(".statai-stat-delta").show(); }
            $displayElement.append(statElement);
        });
    }
}

function getProfileStats(profileName)
{
    const profiles = getProfiles();
    const profile = profiles.find(p => p.name === profileName);
    return profile ? profile.stats : [];
}

function getSTCharacterDataFromName(characterName)
{
    if (!characterName) return null;
    return characters.find(character => character.name === characterName);
}

function getCharacterFromMessage(messageElement)
{
    return $(messageElement).find(".name_text").first().text().trim();
}

export {
    getMessages,
    getLastMessage,
    setupMessageObserver,
    renderDisplays
}