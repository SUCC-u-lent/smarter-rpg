import { event_types, eventSource } from "../../../../events.js" // All imports must have their file extension specified.
import { extensionEventSource, extensionEventTypes } from "../events/ExtensionEvents.js"
import { getCharacterData, getCharacterIdByName, getCurrentCharacterName } from "../storage_systems/CharacterExtensionStorage.js"
import { getGlobalExtensionStorage } from "../storage_systems/GlobalExtensionStorage.js"
import { awaitHtmlElement, getJQueryHtml } from "../utilities/ExtensionUtilities.js"

function setupCharacterUI()
{
    console.log("setupCharacterUI() called");
    console.log("extensionEventSource:", extensionEventSource);
    console.log("extensionEventTypes.CREATE_PROFILE:", extensionEventTypes.CREATE_PROFILE);
    
    eventSource.on(event_types.CHARACTER_EDITOR_OPENED,async ()=>{
        await reloadCharacterUI();
        await reloadPersonaUI();
    })
    extensionEventSource.on(extensionEventTypes.CREATE_PROFILE, async ()=>{
        console.log("CREATE_PROFILE event received in setupCharacterUI");
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
        dropdown.val(currentCharacterData.getActiveProfile()?.getName() || "")
    }
    dropdown.off("change").on("change", async function(){
        const selectedProfileId = $(this).val()
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
        dropdown.val(currentCharacterData.getActiveProfile()?.getName() || "")
    }
    dropdown.off("change").on("change", async function(){
        const selectedProfileId = $(this).val()
        const currentCharacterName = await getCurrentCharacterName(false)
        const currentCharacterId = getCharacterIdByName(currentCharacterName)
        console.log("Selected profile ID:", selectedProfileId);
        console.log("Current character name:", currentCharacterName);
        console.log("Current character ID:", currentCharacterId);
        if (!currentCharacterId) return;
        const currentCharacterData = getCharacterData(currentCharacterId)
        if (currentCharacterData) {
            const isUndefined = selectedProfileId === undefined || selectedProfileId === "undefined" || selectedProfileId === null || selectedProfileId === "null" || selectedProfileId === ""
            currentCharacterData.setActiveProfileId(isUndefined ? null : selectedProfileId.toString())
            extensionEventSource.emit(extensionEventTypes.ACTIVE_CHARACTER_PROFILE_CHANGED, isUndefined ? null : selectedProfileId.toString())
        }
    })
}

export { setupCharacterUI }