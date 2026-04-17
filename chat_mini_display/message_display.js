// @ts-nocheck
import { characters, event_types, eventSource, name1 } from "../../../../../script.js";
import { power_user } from "../../../../power-user.js";
import { extensionFolderPath, getPosition, isActive } from "../constants.js";
import { getCharacterData } from "../data_storage/character_config.js";
import { getProfiles } from "../data_storage/profile_constants.js";
import { logInfo, toastInfo } from "../extensionLogging.js";
import { getCharacterStatForActiveChat, saveCharacterStatForActiveChat } from "./chat_storage.js";

let messageObserver = null;
let messageContainerPollId = null;
let generatingState = false;

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
    eventSource.on(event_types.MESSAGE_DELETED, ()=>{renderDisplays();});
}

export function setGeneratingState(isGenerating)
{
    generatingState = isGenerating;
    reloadDisplays();
}

export function reloadDisplays()
{
    renderDisplays()
}

const positionParentSelector = {
    "bottom": ".mes_block",
    "belowName": ".mesAvatarWrapper",
};

function prepareVisuals(characterName, messageElement)
{
    const normalizedCharacterName = String(characterName || "").trim();
    if (!normalizedCharacterName) return null;

    // Ignore unresolved template placeholders and macro-like names.
    if ((normalizedCharacterName.startsWith("${") && normalizedCharacterName.endsWith("}"))
        || (normalizedCharacterName.startsWith("{{") && normalizedCharacterName.endsWith("}}"))) {
        return null;
    }

    const stCharacterData = getSTCharacterDataFromName(normalizedCharacterName);
    if (!stCharacterData) {
        console.warn(`Could not find character data for character '${normalizedCharacterName}'. Stats will not be displayed for this character.`, { characterName: normalizedCharacterName, stCharacterData });
        return null;
    }

    const position = getPosition();
    const parentSelector = positionParentSelector[position];
    if (!parentSelector) {
        console.error(`Invalid position '${position}' for stat display.`, { position, validPositions: Object.keys(positionParentSelector) });
        return null;
    }

    const $messageElement = $(messageElement);
    const characterDisplay = $messageElement.find(parentSelector).first();
    if (characterDisplay.length === 0) {
        console.warn(`Could not find parent element for stat display with selector '${parentSelector}' for character '${normalizedCharacterName}'. Stats will not be displayed for this character.`, { parentSelector, characterName: normalizedCharacterName, messageElement });
        return null;
    }

    let displayElement = $messageElement.find(".statai-stat-display");
    let breaklineElement = $messageElement.find("#statai-message-hr");

    if (breaklineElement.length === 0)
        breaklineElement = $(`<hr id="statai-message-hr" class="sysHR"/>`).appendTo(characterDisplay);

    if (displayElement.length === 0)
        displayElement = $(`<div class="statai-stat-display"></div>`).appendTo(characterDisplay);
    else
        displayElement.empty();

    // If the elements are in the wrong parent (e.g. position changed), move them there.
    if (displayElement.parent()[0] !== characterDisplay[0])
    {
        displayElement.detach().appendTo(characterDisplay);
        breaklineElement.detach().insertBefore(displayElement);
    }

    return { displayElement, breaklineElement };
}

function renderDisplays()
{
    const isActiveState = isActive();
    const characterMessages = {};
    const messages = getMessages();
    messages.each((index, messageElement) => {
        const characterName = getCharacterFromMessage(messageElement);
        if (!characterName) return;
        const preparedVisuals = prepareVisuals(characterName, messageElement);
        if (!preparedVisuals) return;
        const displayElement = preparedVisuals.displayElement;
        const breaklineElement = preparedVisuals.breaklineElement;
        if (!displayElement || !breaklineElement) return;
        if (!isActiveState)
        {
            displayElement.hide();
            breaklineElement.hide();
        } else {
            displayElement.show();
            breaklineElement.show();
            characterMessages[characterName] = displayElement;
        }
    });
    if (!isActiveState) return;
    // now render the stats for each character based on their latest message.
    for (const characterName in characterMessages)
    {
        const spanStyle = `font-weight: bold; width: calc(${Math.max(1, String("No Stats").length)}ch)`
        const $displayElement = $(characterMessages[characterName]);
        if (generatingState)
        { // When generating status displays are changed to just show "Generating..." to avoid confusion from rapidly changing stats during generation.
            $displayElement.empty().append(
                `<span style="${spanStyle}">Generating...</span>`
            )
            continue;
        }
        const characterData = getCharacterData(characterName);
        if (!characterData || characterData.activeProfile == null)
        {
            $displayElement.append(
                `<span style="${spanStyle}">No Stats</span>`
            )
            continue;
        }
        const profileStats = getProfileStats(characterData.activeProfile);
        if (profileStats.length === 0)
        {
            $displayElement.append(
                `<span style="${spanStyle}">No Stats</span>`
            )
            continue;
        }

        // Stats are formatted as "<b>Stat Name</b>: Stat Value"

        profileStats.forEach(stat => {
            const statElement = $(`
                <div class="statai-stat">
                    <span class="statai-stat-name" style="font-weight: bold;"></span>
                    <input class="statai-stat-value"/>
                    <span class="statai-stat-delta" title="Not sent to the AI."></span>
                </div>
            `);
            const statData = getCharacterStatForActiveChat(characterName, characterData.activeProfile, stat.name) || {
                name: stat.name,
                value: stat.default,
                delta: 0
            };
            let value = statData?.value ?? stat.default;
            let delta = statData?.delta ?? 0;
            let maxRange = stat.max ?? Infinity;
            let minRange = stat.min ?? -Infinity;
            const unlimitedRange = (maxRange === Infinity && minRange === -Infinity);
            statElement.find(".statai-stat-name").text(stat.name + ": ");
            const valueInput = statElement.find(".statai-stat-value");
            valueInput.val(value);
            valueInput.css("width", `calc(${Math.max(1, String(value).length)}ch + 5px)`);
            if (stat.type == "range" && !unlimitedRange)
            {
                valueInput.prop("max", maxRange);
                valueInput.prop("min", minRange);
            }
            valueInput.on("change", function() {
                let newValue = $(this).val();
                if (stat.type == "range" && !unlimitedRange)
                {
                    if (newValue > maxRange)
                    {newValue = maxRange;}
                    if (newValue < minRange)
                    {newValue = minRange;}
                }
                $(this).css("width", `calc(${Math.max(1, String(newValue).length)}ch + 5px)`);
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

    const normalizedName = String(characterName).trim().toLowerCase();
    const char = characters.find(character => String(character?.name || "").trim().toLowerCase() === normalizedName);
    if (char) return char;

    // Current active user name should always be recognized as a persona identity.
    if (String(name1 || "").trim().toLowerCase() === normalizedName)
    {
        return { name: characterName, kind: "persona" };
    }

    // Resolve personas directly from the persona mapping.
    // Keys may be avatar IDs, filenames, or URLs depending on ST internals.
    const personaEntries = Object.entries(power_user?.personas || {});

    for (const [avatarId, personaName] of personaEntries)
    {
        if (!personaName) continue;

        if (String(personaName).trim().toLowerCase() === normalizedName)
        {
            return { name: personaName, avatarId, kind: "persona" };
        }
    }

    return null;
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