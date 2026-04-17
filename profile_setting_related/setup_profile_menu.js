import { reloadDisplays } from "../chat_mini_display/message_display.js";
import { event_types, eventSource } from "../../../../events.js";
import { getCharacterData, saveCharacterData } from "../data_storage/character_config.js";
import { getProfiles } from "../data_storage/profile_constants.js";
import { logInfo } from "../extensionLogging.js";

let profileMenuEventsBound = false;

function getCurrentEditedCharacterName()
{
    const rightNavName = $("#rm_button_selected_ch .interactable h2").first().text().trim();
    if (rightNavName) return rightNavName;

    const popupName = $("#character_popup_text h3").first().text().trim();
    if (popupName) return popupName;

    return null;
}

export function reloadProfileMenus()
{
    setupCharacterProfilePanel();
    setupPersonaProfilePanel();
}

function setupCharacterProfilePanel()
{
    const characterEditPanel = $("#rm_ch_create_block");
    if (characterEditPanel.length === 0)
    {
        const characterSelectMenu = $("#statai-character-profile-select-menu");
        if (characterSelectMenu.length === 0) return;
        characterSelectMenu.remove();
        return;
    }
    let characterSelectMenu = $("#statai-character-profile-select-menu");
    if (characterSelectMenu.length === 0)
    {
        characterEditPanel.append(`<select id="statai-character-profile-select-menu">
        </select>`);
        characterSelectMenu = $("#statai-character-profile-select-menu");
    }
    characterSelectMenu.empty();
    characterSelectMenu.append(`<option value="">Select Profile</option>`);
    const profiles = getProfiles();
    profiles.forEach(profile=>{
        characterSelectMenu.append(`<option value="${profile.name}">${profile.name}</option>`);
    });
    const characterId = getCharacterId();
    const characterData = characterId ? (getCharacterData(characterId) || {}) : {};
    const profileName = characterData?.activeProfile;
    if (characterId && profileName && profiles.some(p=>p.name === profileName))
    {
        characterSelectMenu.val(profileName);
    } else {
        characterSelectMenu.val("");
    }
}
function setupPersonaProfilePanel()
{
    const personaPanel = $(".persona_management_current_persona").first();
    if (personaPanel.length === 0) return;
    let personaSelectMenu = $("#statai-persona-profile-select-menu");
    if (personaSelectMenu.length === 0)
    {
        personaPanel.append(`<select id="statai-persona-profile-select-menu">
        </select>`);
        personaSelectMenu = $("#statai-persona-profile-select-menu");
    }
    personaSelectMenu.empty();
    personaSelectMenu.append(`<option value="">Select Profile</option>`);
    const profiles = getProfiles();
    profiles.forEach(profile=>{
        personaSelectMenu.append(`<option value="${profile.name}">${profile.name}</option>`);
    });
    const characterId = getCharacterId(true);
    if (!characterId) return;
    const characterData = getCharacterData(characterId) || {};
    const profileName = characterData.activeProfile;
    if (profileName && profiles.some(p=>p.name === profileName))
    {
        personaSelectMenu.val(profileName);
    } else {
        personaSelectMenu.val("");
    }
}

function getCharacterId(isPersona = false)
{
    if (isPersona)
    {
        const personaPanel = $(".persona_management_current_persona").first();
        const characerName = personaPanel.find("#your_name").text().trim();
        return characerName;
    }
    return getCurrentEditedCharacterName();
}

function onCharacterProfileChange(characterId, profileName, isPersona = false)
{
    console.log("Profile change detected:", { characterId, profileName, isPersona });
    const characterData = getCharacterData(characterId) || { name: characterId };
    const profiles = getProfiles();
    if (!profileName) {
        characterData.activeProfile = null;
        saveCharacterData(characterData);
        logInfo(`Cleared profile for ${isPersona ? "persona" : "character"} '${characterId}'.`);
        reloadDisplays();
        return;
    }

    if (!profiles.some(p=>p.name === profileName)) return;
    characterData.name = characterId;
    characterData.activeProfile = profileName;
    saveCharacterData(characterData);
    logInfo(`Loaded profile '${profileName}' for ${isPersona ? "persona" : "character"} '${characterId}'.`);
    reloadDisplays();
}

export function setupCharacterProfileMenu()
{
    reloadProfileMenus();

    if (profileMenuEventsBound)
    {
        return;
    }

    profileMenuEventsBound = true;

    $(document).off("change", "#statai-character-profile-select-menu");
    $(document).on("change", "#statai-character-profile-select-menu", function() {
        const selectedProfileName = $(this).val();
        const currentCharacterId = getCharacterId(false);
        if (!currentCharacterId) {
            console.warn("Character profile change ignored: could not resolve current character name.");
            return;
        }
        onCharacterProfileChange(currentCharacterId, selectedProfileName, false);
    });

    $(document).off("change", "#statai-persona-profile-select-menu");
    $(document).on("change", "#statai-persona-profile-select-menu", function() {
        const selectedProfileName = $(this).val();
        const currentPersonaId = getCharacterId(true);
        if (!currentPersonaId) {
            console.warn("Persona profile change ignored: could not resolve current persona name.");
            return;
        }
        onCharacterProfileChange(currentPersonaId, selectedProfileName, true);
    });

    eventSource.on(event_types.CHARACTER_EDITOR_OPENED, reloadProfileMenus);
    eventSource.on(event_types.CHARACTER_PAGE_LOADED, reloadProfileMenus);
    eventSource.on(event_types.PERSONA_CHANGED, reloadProfileMenus);
    eventSource.on(event_types.SETTINGS_UPDATED, reloadProfileMenus);
}