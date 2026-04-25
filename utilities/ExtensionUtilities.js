import { characters } from "../../../../../script.js";
import { power_user } from "../../../../power-user.js";
import StatProfile from "../characterdata/stat_profile.js";
import CharacterStorage from "../storage/CharacterStorage.js";
import ExtensionStorage from "../storage/ExtensionStorage.js";

/** @returns {string} */
function getStatDescription(statName)
{
    const profiles = ExtensionStorage.get("profiles", ExtensionStorage.Defaults.profiles)
    .map(profile => StatProfile.decompile(profile));
    for (const profile of Object.values(profiles))
    {
        const stat = profile?.getStat(statName);
        if (stat && stat.getDescription())
        {
            return stat.getDescription();
        }
    }
    return "Stat with no description.";
}

/**
 * @param {string} selector 
 * @param {number|null} timeout 
 * @returns {Promise<Element>}
 */
function awaitElement(selector, timeout = null)
{
    return new Promise((resolve, reject) => {
        const element = document.querySelector(selector);
        if (element)
        {            
            resolve(element);
            return;
        }
        const observer = new MutationObserver((mutations) => {
            const element = document.querySelector(selector);
            if (element){
                resolve(element);
                observer.disconnect();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        if (timeout !== null) {
            setTimeout(() => {
                reject(new Error(`Element ${selector} not found within timeout`));
                observer.disconnect();
            }, timeout);
        }
    });
}

/**
 * @param {string} profileName
 * @returns {StatProfile|undefined} 
 */
function getProfileByName(profileName)
{
    const profiles = ExtensionStorage.get("profiles", ExtensionStorage.Defaults.profiles)
    .map(profile => StatProfile.decompile(profile));
    return profiles.find(p => p.getName() === profileName);
}

/** @param {JQuery<HTMLElement>} messageElement */
function getMessageAuthor(messageElement)
{
    const userElement = messageElement.find(".name_text");
    return userElement.text().trim() || "Unknown";
}

/** @param {{ avatar?: string, name?: string }} charData */
function getEntityId(charData)
{
    if (!charData) return null;
    return charData.avatar || charData.name || null;
}

/** @param {string} author */
function getStoredActiveProfile(author)
{
    const characterData = characters.find(char => char.name === author) || getPersonaList().find(char => char.name === author);
    const entityId = getEntityId(characterData);
    if (!entityId) return null;

    return CharacterStorage.get(entityId, {})?.active_profile || null;
}

function getMessageAuthorDefaultProfile(message)
{
    const author = getMessageAuthor(message);
    try {
        const activeProfile = getStoredActiveProfile(author);
        if (activeProfile){
            return getProfileByName(activeProfile);
        }
    } catch (e)    {
        console.warn(`Could not find character for message author "${author}" when trying to get default profile.`, e);
        return undefined;
    }
}

function getPersonaList()
{
    const personas = [];
    const rawPersonas = power_user?.personas ?? {};
    Object.values(rawPersonas).forEach(persona_name => {
        personas.push({
            name: persona_name,
            description: power_user.persona_descriptions[persona_name]?.description ?? '',
        })
    })
    return personas;
}

/**
 * @param {string} selector 
 * @param {number|null} timeout 
 * @returns {Promise<JQuery<HTMLElement>>}
 */
function awaitJQueryElement(selector, timeout = null)
{
    return new Promise((resolve, reject) => {
        const element = $(selector);
        if (element.length > 0)
        {
            resolve(element);
            return;
        }
        const observer = new MutationObserver((mutations) => {
            const element = $(selector);
            if (element.length > 0){
                resolve(element);
                observer.disconnect();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        if (timeout !== null) {
            setTimeout(() => {
                reject(new Error(`Element ${selector} not found within timeout`));
                observer.disconnect();
            }, timeout);
        }
    });
}

function doesStatExist(statName)
{
    const profiles = ExtensionStorage.get("profiles", ExtensionStorage.Defaults.profiles)
    .map(profile => StatProfile.decompile(profile));
    for (const profile of Object.values(profiles))
    {
        if (profile && profile.getStat(statName))
        {
            return true;
        }
    }
    return false;
}

export { getStatDescription, doesStatExist, awaitElement, awaitJQueryElement, getPersonaList, getMessageAuthorDefaultProfile, getProfileByName };