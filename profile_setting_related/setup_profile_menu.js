import { reloadDisplays } from "../chat_mini_display/message_display.js";
import { getCharacterData, saveCharacterData } from "../data_storage/character_config.js";
import { getProfiles } from "../data_storage/profile_constants.js";
import { logInfo } from "../extensionLogging.js";

export function reloadProfileMenu()
{
    let $profileSelect = $("#statai-profile-select");
    if ($profileSelect.length === 0)
    {
        $profileSelect = $(`<select id="statai-profile-select" style="background-color:black;color:white;margin-top:10px;"></select>`);
        $("#right-nav-panel").find("#rm_ch_create_block").find("#form_create").append($profileSelect);  
    }
    const profiles = getProfiles();

    $profileSelect.empty();
    $profileSelect.append(`<option value="" title="No stat profile.">Select Profile</option>`);
    setSelectedProfileInMenu();

    profiles.forEach(profile => {
        let statLines = new Set();
        statLines.add(`Stats for profile: ${profile.name}`);
        profile.stats.forEach(stat => {
            statLines.add(`${stat.name}: ${stat.default}`);
        });
        $profileSelect.append(`<option value="${profile.name}" title="${Array.from(statLines).join("\n")}">${profile.name}</option>`);
    });
    return $profileSelect;
}

export function setupCharacterProfileMenu()
{
    const $profileSelect = reloadProfileMenu();

    setSelectedProfileInMenu();

    $profileSelect.on("change", function() {
        const selectedProfileName = $(this).val();
        setActiveForCharacter(selectedProfileName);
    });

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