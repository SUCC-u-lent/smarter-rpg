import { event_types, eventSource } from "../../../../events.js" // All imports must have their file extension specified.
import { extensionEventSource, extensionEventTypes } from "../events/ExtensionEvents.js"
import { getCharacterData, getCharacterIdByName, getCurrentCharacterName, setCharacterData } from "../storage_systems/CharacterExtensionStorage.js"
import { getExtensionEnabled, getGlobalExtensionStorage } from "../storage_systems/GlobalExtensionStorage.js"
import { awaitHtmlElement, getJQueryHtml } from "../utilities/ExtensionUtilities.js"

let isEnabled = false;
function setupCharacterUI()
{
    console.log("setupCharacterUI() called");
    console.log("extensionEventSource:", extensionEventSource);
    console.log("extensionEventTypes.CREATE_PROFILE:", extensionEventTypes.CREATE_PROFILE);
    
    eventSource.on(event_types.CHARACTER_EDITOR_OPENED,async ()=>{
        isEnabled = getExtensionEnabled();
        await reloadCharacterUI();
        await reloadPersonaUI();
    })
    extensionEventSource.on(extensionEventTypes.CREATE_PROFILE, async ()=>{
        isEnabled = getExtensionEnabled();
        await reloadCharacterUI();
        await reloadPersonaUI();
    })
    extensionEventSource.on(extensionEventTypes.EXTENSION_ENABLED_CHANGED, async (/** @type {boolean} */ enabled) => {
        isEnabled = enabled;
        await reloadCharacterUI();
        await reloadPersonaUI();
    })
}
async function reloadPersonaUI()
{
    const currentPersona = await awaitHtmlElement(null,".persona_management_current_persona")
    if (currentPersona.length === 0) {throw new Error("Could not find current persona element")}
    
    let dropdown = await getJQueryHtml("ui/character_dropdown.html")
    if (dropdown.length === 0) {throw new Error("Could not load character dropdown HTML")}
    if (currentPersona.find("#statai-character-profile-select").length === 0) {
        currentPersona.append(dropdown)
    } else {dropdown = currentPersona.find("#statai-character-profile-select").first()}
    dropdown.empty()
    dropdown.append(`<option value="">Select A Profile</option>`)
    dropdown.val("") // Reset the dropdown to the default state
    const storage = getGlobalExtensionStorage()
    const profiles = storage.getProfiles()
    for (const profile of profiles)
        dropdown.append(`<option value="${profile.getId()}">${profile.getName()}</option>`)
    const currentCharacterName = await getCurrentCharacterName(true)
    const currentCharacterId = getCharacterIdByName(currentCharacterName)
    if (!currentCharacterId) return;
    const currentCharacterData = getCharacterData(currentCharacterId)
    if (currentCharacterData && currentCharacterData.getActiveProfile()) {
        // @ts-ignore
        assertValidDropdown(dropdown, currentCharacterData.getActiveProfile()?.getName() || "", true)
    }
    dropdown.off("change").on("change", async function(){
        const selectedProfileId = $(this).val()
        // @ts-ignore
        assertValidDropdown(dropdown, selectedProfileId, true)
        if ($(this).val() !== selectedProfileId) {
            console.error("Selected profile ID is not valid, ignoring change event");
            return;
        }
        const currentCharacterName = await getCurrentCharacterName(true)
        const currentCharacterId = getCharacterIdByName(currentCharacterName)
        if (!currentCharacterId) return;
        const currentCharacterData = getCharacterData(currentCharacterId)
        if (currentCharacterData) {
            const isUndefined = selectedProfileId === undefined || selectedProfileId === "undefined" || selectedProfileId === null || selectedProfileId === "null" || selectedProfileId === ""
            currentCharacterData.setActiveProfileId(isUndefined ? null : selectedProfileId.toString())
            extensionEventSource.emit(extensionEventTypes.ACTIVE_PERSONA_PROFILE_CHANGED, isUndefined ? null : selectedProfileId.toString())
        }
    })
    if (isEnabled)
    {
        dropdown.show()
    }
    else {
        dropdown.hide()
    }
}

async function reloadCharacterUI()
{
    const rightPanel = await awaitHtmlElement(null,"#right-nav-panel")
    const characterEditor = (await awaitHtmlElement(rightPanel,"#rm_ch_create_block")).first()
    let dropdown = await getJQueryHtml("ui/character_dropdown.html")
    if (dropdown.length === 0) {throw new Error("Could not load character dropdown HTML")}
    if (characterEditor.find("#statai-character-profile-select").length === 0) {
        characterEditor.find("#form_create").append(dropdown)
    } else {dropdown = characterEditor.find("#statai-character-profile-select").first()}
    dropdown.empty()
    dropdown.append(`<option value="">Select A Profile</option>`)
    dropdown.val("") // Reset the dropdown to the default state
    const storage = getGlobalExtensionStorage()
    const profiles = storage.getProfiles()
    for (const profile of profiles)
        dropdown.append(`<option value="${profile.getId()}">${profile.getName()}</option>`)
    const currentCharacterName = await getCurrentCharacterName(false)
    const currentCharacterId = getCharacterIdByName(currentCharacterName)
    if (!currentCharacterId) return;
    const currentCharacterData = getCharacterData(currentCharacterId)
    if (currentCharacterData && currentCharacterData.getActiveProfile()) {
        assertValidDropdown(dropdown, currentCharacterData.getActiveProfile()?.getName() || "", true)
    }
    dropdown.off("change").on("change", async function(){
        const selectedProfileId = $(this).val()
        // @ts-ignore
        assertValidDropdown(dropdown, selectedProfileId, true)
        if ($(this).val() !== selectedProfileId) {
            console.error("Selected profile ID is not valid, ignoring change event");
            return;
        }
        const currentCharacterName = await getCurrentCharacterName(false)
        const currentCharacterId = getCharacterIdByName(currentCharacterName)
        if (!currentCharacterId) return;
        const currentCharacterData = getCharacterData(currentCharacterId)
        if (currentCharacterData) {
            const isUndefined = selectedProfileId === undefined || selectedProfileId === "undefined" || selectedProfileId === null || selectedProfileId === "null" || selectedProfileId === ""
            currentCharacterData.setActiveProfileId(isUndefined ? null : selectedProfileId.toString())
            extensionEventSource.emit(extensionEventTypes.ACTIVE_CHARACTER_PROFILE_CHANGED, isUndefined ? null : selectedProfileId.toString())
            console.log(`Set active profile for character ${currentCharacterName} (ID: ${currentCharacterId}) to ${isUndefined ? "null" : selectedProfileId.toString()}`)
            setCharacterData(currentCharacterId, currentCharacterData) // Save the updated character data back to storage
        }
    })
    if (isEnabled)
    {
        dropdown.show()
    }
    else {
        dropdown.hide()
    }
}

/**
 * @param {JQuery<HTMLElement>} dropdown
 * @param {string|undefined} option
 * @param {boolean} setValue
 */
function assertValidDropdown(dropdown, option, setValue = false)
{ // Doesn't throw errors but in the case of a situation where it would it sets the dropdown to the default or last option
    if (dropdown.length === 0) {console.warn(`Could not find dropdown for ${option}`); return false;}
    if (dropdown.find("option").length === 0) {console.warn(`Dropdown for ${option} has no options`); return false;}
    // @ts-ignore
    if (dropdown.find("option").length === 1) {dropdown.val(dropdown.find("option").first().val()); return true;}
    if (option === undefined || option === "undefined" || option === null || option === "null" || option === "") {
        console.warn(`Option for ${option} is not valid, setting to default`);
        // @ts-ignore
        dropdown.val(dropdown.find("option").last().val());
        return false;
    }
    if (dropdown.find(`option[value="${option}"]`).length === 0) {
        console.warn(`Could not find option ${option} in dropdown`); 
        // @ts-ignore
        dropdown.val(dropdown.find("option").last().val());
        return false;
    }
    if (setValue) {
        dropdown.val(option);
    }
    return true;
}

export { setupCharacterUI }