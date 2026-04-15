import { reloadDisplays } from "../chat_mini_display/message_display.js";
import { getCharacterData, saveCharacterData } from "../data_storage/character_config.js";
import { getProfiles } from "../data_storage/profile_constants.js";
import { logInfo } from "../extensionLogging.js";

export function setupCharacterProfileMenu()
{
    const $profileSelect = $(`<select id="statai-profile-select" style="background-color:black;color:white;margin-top:10px;"><option value="">Select Profile</option></select>`);
    const profiles = getProfiles();
    profiles.forEach(profile => {
        $profileSelect.append(`<option value="${profile.name}">${profile.name}</option>`);
    });

    setSelectedProfileInMenu();

    $profileSelect.on("change", function() {
        const selectedProfileName = $(this).val();
        setActiveForCharacter(selectedProfileName);
    });
    $("#right-nav-panel").find("#rm_ch_create_block").find("#form_create").append($profileSelect);

    // Create listener for character name change in #character_popup_text h3
    const characterNameElement = document.querySelector("#character_popup_text h3");
    if (characterNameElement)
    {
        const observer = new MutationObserver(() => {
            setSelectedProfileInMenu();
        });
        observer.observe(characterNameElement, { childList: true });
    }
}

function getCurrentlyEditingCharacterName()
{
    const characterName = document.querySelector("#character_popup_text h3");
    return characterName ? characterName.textContent : null;
}

function setSelectedProfileInMenu()
{
    const $profileSelect = $("#statai-profile-select");
    const characterName = getCurrentlyEditingCharacterName();
    if (!characterName){
        $profileSelect.val("");
        console.warn("Could not determine the character being edited, cannot set profile select.");
        return;
    }
    const characterData = getCharacterData(characterName);

    console.log(characterData);
    console.log(characterData == null ? "N/A" : characterData.activeProfile)
    console.log("Available profiles in select:", $profileSelect.find("option").map((i, option) => option.value).get());

    if (characterData && characterData.activeProfile && $profileSelect.find(`option[value="${characterData.activeProfile}"]`).length > 0)
    {
        $profileSelect.val(characterData.activeProfile);
        console.log("Set profile select to active profile:", characterData.activeProfile);
    } else {
        $profileSelect.val("");
        console.warn("No active profile for character or profile not found, set select to default.");
    }
}

function setActiveForCharacter(profileName)
{
    const characterName = getCurrentlyEditingCharacterName();
    if (!characterName)
    {
        alert("Could not determine the character being edited.");
        console.warn("Could not determine the character being edited.");
        return;
    }
    const characterData = getCharacterData(characterName) || { name: characterName };
    characterData.name = characterName;
    characterData.activeProfile = profileName || null;
    saveCharacterData(characterData);
    logInfo(`Set active profile for character ${characterName} to ${profileName}.`);
    reloadDisplays();
}