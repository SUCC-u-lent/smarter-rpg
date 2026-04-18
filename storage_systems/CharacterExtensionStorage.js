import { characters, saveSettingsDebounced } from "../../../../../script.js";
import { extension_settings } from "../../../../extensions.js";
import { power_user } from "../../../../power-user.js";
import { getExtensionName } from "../utilities/constants.js";
import { awaitHtmlElement } from "../utilities/ExtensionUtilities.js";
import { CharacterProfileData } from "./classes/character/CharacterProfileData.js";

/** @returns {Object<string, CharacterProfileData>} */
function getAllCharacterData()
{
    const extensionName = getExtensionName();
    // @ts-ignore
    const extensionSettings = extension_settings[extensionName] || {}
    const allCharacterExtensionSettings = extensionSettings["character"] || {};
    const hydratedCharacterSettings = {};

    for (const [characterId, characterData] of Object.entries(allCharacterExtensionSettings)) {
        // @ts-ignore
        hydratedCharacterSettings[characterId] = characterData instanceof CharacterProfileData
            ? characterData
            : CharacterProfileData.fromJSON(characterData);
    }

    // @ts-ignore
    return hydratedCharacterSettings;
}

/**
 * @param {Object<string, CharacterProfileData>} data
 */
function setAllCharacterData(data)
{
    const extensionName = getExtensionName();
    // @ts-ignore
    const extensionSettings = extension_settings[extensionName] || {}
    extensionSettings["character"] = data;
    // @ts-ignore
    extension_settings[extensionName] = extensionSettings;
    saveSettingsDebounced(); // Required or SillyTavern won't recognize the changes
}

/**
 * @param {string} characterId
 */
function getCharacterData(characterId)
{
    const allData = getAllCharacterData();
    return allData[characterId] || new CharacterProfileData(characterId, null);
}
/**
 * @param {string} characterId
 * @param {CharacterProfileData} data
 */
function setCharacterData(characterId, data)
{
    const allData = getAllCharacterData();
    allData[characterId] = data;
    setAllCharacterData(allData);
}

async function getCurrentCharacterName(isPersona = false)
{
    if (isPersona)
    {
        const currentPersona = await awaitHtmlElement(null,".persona_management_current_persona")
        if (currentPersona.length === 0) {throw new Error("Could not find current persona element")}
        const nameElement = await awaitHtmlElement(currentPersona,"#your_name")
        if (nameElement.length === 0) {throw new Error("Could not find persona name element")}
        return nameElement.text().trim();
    }
    const rightPanel = await awaitHtmlElement(null,"#character_popup")
    if (rightPanel.length === 0) throw new Error("Could not find right panel element")
    const characterEditor = await awaitHtmlElement(rightPanel,"#character_popup-button-h3")
    if (characterEditor.length === 0) {throw new Error("Could not find character editor element")}
    return characterEditor.text().trim();
}

/** @param {string} name  */
function isValidCharacterName(name)
{
    // the global variable "characters" is an array containing specifically AI character objects.. aka non-persona characters.
    const aiCharacters = characters.find(c => c.name.toLowerCase() === name.toLowerCase()) || {}
    if (aiCharacters) return true; // We've confirmed its at least an AI character.
    // If it's not an AI character, it could still be a persona character, so we check for that.
    const personas = power_user.personas || {}
    console.log(personas)
    const personaCharacters = Object.values(personas).find(p => p.name.toLowerCase() === name.toLowerCase())
    return !!personaCharacters; // Return true if it's a persona character, false otherwise.
}

/**
 * @param {unknown} name
 * @returns {string | null}
 */
function getCharacterIdByName(name)
{
    if (typeof name !== "string") return null;
    const trimmedName = name.trim();
    if (!trimmedName) return null;
    return trimmedName.toLowerCase().replace(/\s/g, "_");
}

export { getCharacterData, setCharacterData, getAllCharacterData, setAllCharacterData, getCurrentCharacterName, getCharacterIdByName, isValidCharacterName }