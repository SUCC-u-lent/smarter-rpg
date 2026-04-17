import { callGenericPopup, POPUP_TYPE } from "../../../../popup.js";
import { extensionFolderPath, getExtensionSettings, saveSettings } from "../constants.js";
import { addProfile, deleteProfile, getProfileByName, getProfiles, saveProfile, setActiveProfile } from "../data_storage/profile_constants.js";
import { logInfo, toastInfo } from "../extensionLogging.js";
import { reloadProfileMenu } from "../profile_setting_related/setup_profile_menu.js";

async function setupExtensionMenu(settingsExtensionContainer) 
{
    const profileContainer = await $.get(`${extensionFolderPath}/html/profileContainer.html`);
    const $profileContainer = $(profileContainer);
    $(settingsExtensionContainer).append($profileContainer);
    setupProfileSelectMenu(settingsExtensionContainer, $profileContainer);
}

function fallbackCopyToClipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.on("changed", function(){
        textArea.value = text; // No changing.
    })
    callGenericPopup(textArea, POPUP_TYPE.TEXT,"",{ wide: false, large: false, allowVerticalScrolling: true })
}
function fallbackCopyFromClipboard() {
    return new Promise((resolve, reject) => {
        const textArea = document.createElement("textarea");
        textArea.append(`<br/>`)
        textArea.append(`<span>After pasting, click the button below to confirm the import.</span><br/>`);
        const confirmButton = $(`<button>Confirm Import</button>`);
        confirmButton.on("click", function() {
            const importedText = textArea.val();
            if (!importedText) {
                alert("No text was pasted. Please paste the exported settings into the text area before confirming.");
                return;
            }
            try{
                const settings = JSON.parse(importedText);
                resolve(settings);
            }catch(err){
                alert("Failed to parse the imported text. Please ensure you pasted the correct exported settings.");
                reject(err);
            }
        });
        textArea.append(confirmButton);
        callGenericPopup(textArea, POPUP_TYPE.TEXT,"",{ wide: false, large: false, allowVerticalScrolling: true })
    });
}

async function setupProfileSelectMenu(settingsExtensionContainer, profileContainer)
{
    const profileExport = profileContainer.find("#statai-export-profile-button");
    const profileImport = profileContainer.find("#statai-import-profile-button");
    console.log(profileExport, profileImport);
    profileExport.on("click", () => {
        const settings = getExtensionSettings();
        if (navigation.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(JSON.stringify(settings))
                .then(function () {
                    toastInfo("Profile settings copied to clipboard.");
                    console.log("Exported Settings");
                })
                .catch(function (err) {
                    fallbackCopyToClipboard(JSON.stringify(settings));
                    console.error('Error copying text: ', err);
                    alert('Failed to copy settings to clipboard. Please allow clipboard access and try again.');
                });
        } else {
            fallbackCopyToClipboard(JSON.stringify(settings));
        }
    });
    profileImport.on('click', async function() {
        let text = "";
        if (navigator.clipboard && navigator.clipboard.readText) {
            try {
                text = await navigator.clipboard.readText();
            } catch (err) {
                console.error('Failed to read clipboard:', err);
                text = await fallbackCopyFromClipboard();
            }
        } else {
            text = await fallbackCopyFromClipboard();
        }
        if (!text) return;
        const settings = JSON.parse(text);
        if (settings && settings.profiles)
        {
            if (confirm("Importing profiles will overwrite your existing profiles. Do you want to continue?"))
            {
                saveSettings(settings)
            }
        }
    });


    const profileSelect = profileContainer.find("#statai-profile-selection");
    const profileAddButton = profileContainer.find("#statai-create-profile-button");
    const profileDeleteButton = profileContainer.find("#statai-delete-profile-button");
    const profileClearButton = profileContainer.find("#statai-clear-profiles-button");

    // On profile's select change, set the new selected profile to be the active profile within profile_constants.js
    profileSelect.on("change", () => {
        const selectedProfileName = profileSelect.val();
        const profile = getProfileByName(selectedProfileName);
        logInfo(`Selected profile: ${selectedProfileName}`);
        profileSetActive(profile, profileSelect, profileDeleteButton);
    })

    $("<option>").val("selectionprofile").text("Select a profile").appendTo(profileSelect);
    setModifiableState(false, profileDeleteButton);

    const profiles = getProfiles();
    profiles.forEach(profile => {
        const option = $("<option>").val(profile.name).text(profile.name);
        profileSelect.append(option);
    });

    profileAddButton.on("click", () => {
        const newProfileName = prompt("Enter a name for the new profile:").trim();
        if (newProfileName)
        {
            const newOption = $("<option>").val(newProfileName).text(newProfileName);
            profileSelect.append(newOption);
            profileSelect.val(newProfileName).trigger("change");
            addProfile(newProfileName,true)
            reloadProfileMenu();
        }
        else
        {
            alert("Profile name cannot be empty.");
            return;
        }
    })
    profileDeleteButton.on("click", () => {
        const selectedProfile = profileSelect.find("option:selected");
        const profileName = selectedProfile.val().trim();
        if (selectedProfile.length === 0){
            alert("Please select a profile to delete.");
            return;
        }
        if (!profileName)
        {
            alert("Profile name cannot be empty.");
            return;
        }
        if (profileName === "selectionprofile")
        {
            alert("Cannot delete the default profile.");
            return;
        }
        reloadProfileMenu();
        selectedProfile.remove();
        deleteProfile(profileName);
        profileSelect.val("selectionprofile").trigger("change");
    })
    profileClearButton.on("click", () => {
        if (confirm("Are you sure you want to clear all profiles? This action cannot be undone."))
        {
            profileSelect.find("option").not(":first").remove();
            setActiveProfile(null);
            deleteProfile("all");
            profileSelect.val("selectionprofile").trigger("change");
            reloadProfileMenu();
        }
    })
    await setupStatsMenu(settingsExtensionContainer, profileContainer);
}
async function setupStatsMenu(settingsExtensionContainer, profileContainer) {
    const profileSelect = profileContainer.find("#statai-profile-selection");

    profileSelect.on("change", () => {
        const selectedProfileName = profileSelect.val();
        const profile = getProfileByName(selectedProfileName);
        addActiveProfileStatsToMenu(profile);
    })

    const addStatButton = profileContainer.find("#statai-create-stat-button");
    const deleteStatButton = profileContainer.find("#statai-delete-stat-button");
    const saveStatButton = profileContainer.find("#statai-save-stat-button");
    const statContainer = $("#statai-stat-container");

    addStatButton.on("click", async () => {
        const profile = getActiveProfile(profileContainer);
        if (!profile)
        {
            alert("Please select a profile before adding stats.");
            return;
        }
        if (isDefaultProfile(profileContainer))
        {
            alert("Cannot add stats to the default profile.");
            return;
        }
        const statItem = $(await $.get(`${extensionFolderPath}/html/stat_item.html`));
        statContainer.append(statItem);
    });
    deleteStatButton.on("click", () => {
        const profile = getActiveProfile(profileContainer);
        if (!profile){
            alert("Please select a profile before deleting stats.");
            return;
        }
        if (isDefaultProfile(profileContainer))
        {
            alert("Cannot delete stats from the default profile.");
            return;
        }
        // Remove the last stat item from the container
        const statContainer = $("#statai-stat-container");
        const lastStatItem = statContainer.children().last();
        if (lastStatItem.length > 0)
        {
            const statName = lastStatItem.find("#statai-stat-name-input").val() || "Unnamed Stat";
            if (confirm(`Are you sure you want to delete the stat "${statName}"?`))
            {
                lastStatItem.remove();
            }
        }
        else {
            alert("No stats to delete.");
        }
    });

    // locate all select menus that use the class : "statai-stat-mode" and add an event listener to show/hide the range fields when the value changes
    statContainer.on("change", ".statai-stat-mode", function() {
        const statType = $(this).val();
        const rangeFields = $(this).closest(".statai-stat-row").find(".statai-range-fields");
        if (statType === "range")
        {            
            rangeFields.show();
        }
        else
        {
            rangeFields.hide();
        }
    });

    saveStatButton.on("click", () => {
        const profile = getActiveProfile(profileContainer);
        if (!profile){
            alert("Please select a profile before saving stats.");
            return;
        }
        if (isDefaultProfile(profileContainer))
        {
            alert("Cannot save stats to the default profile.");
            return;
        }
        const statContainer = $("#statai-stat-container");
        const statItems = statContainer.children();
        const stats = [];
        statItems.each(function() {
            const statName = $(this).find("#statai-stat-name-input").val().trim();
            const statDefault = Number($(this).find(".statai-stat-default, #statai-stat-default").val());
            const statType = $(this).find(".statai-stat-mode, #statai-stat-mode").val();
            const statMin = Number($(this).find(".statai-stat-min, #statai-stat-min").val());
            const statMax = Number($(this).find(".statai-stat-max, #statai-stat-max").val());
            const statDescription = $(this).find("#statai-stat-desc").val().trim();
            if (!statName){
                alert("Stat name cannot be empty.");
                return false; // Break out of the each loop
            }
            if (isNaN(statDefault)){
                alert(`Default value for stat "${statName}" must be a number.`);
                return false; // Break out of the each loop
            }
            if (statType === "range")
            {
                if (isNaN(statMin) || isNaN(statMax)){
                    alert(`Min and Max values for stat "${statName}" must be numbers.`);
                    return false; // Break out of the each loop
                }
                if (statMin > statMax){
                    alert(`Min value cannot be greater than Max value for stat "${statName}".`);
                    return false; // Break out of the each loop
                }
                if (statDefault < statMin || statDefault > statMax){
                    alert(`Default value for stat "${statName}" must be between Min and Max values.`);
                    return false; // Break out of the each loop
                }
            }
            stats.push({
                name: statName,
                default: statDefault,
                type: statType,
                minRange: statMin,
                maxRange: statMax,
                description: statDescription
            });
        });
        profile.stats = stats;
        saveProfile(profile);
        logInfo(`Saved stats for profile "${profile.name}": ${JSON.stringify(stats)}`);
        toastInfo(`Stats saved for profile "${profile.name}".`);
    });
}

function getActiveProfile(profileContainer)
{
    const profileSelect = profileContainer.find("#statai-profile-selection");
    const selectedProfileName = profileSelect.val();
    return getProfileByName(selectedProfileName);
}

function isDefaultProfile(profileContainer)
{
    const profileSelect = profileContainer.find("#statai-profile-selection");
    const selectedProfileName = profileSelect.val();
    return selectedProfileName === "selectionprofile";
}

function addActiveProfileStatsToMenu(profile)
{
    const statContainer = $("#statai-stat-container");
    statContainer.empty();
    if (profile && profile.stats)
    {
        profile.stats.forEach(async stat => {
            const statItem = $(await $.get(`${extensionFolderPath}/html/stat_item.html`));
            const statName = stat.name || "Unnamed Stat";
            const statMinRange = stat.minRange || -Infinity;
            const statMaxRange = stat.maxRange || Infinity;
            const statType = stat.type || "Number";
            const statDefault = stat.default || 0;
            const statDescription = stat.description || "";
            statItem.find("#statai-stat-name-input").val(statName);
            statItem.find(".statai-stat-default, #statai-stat-default").val(statDefault);
            statItem.find(".statai-stat-mode, #statai-stat-mode").val(statType.toLowerCase());
            statItem.find(".statai-stat-min, #statai-stat-min").val(statMinRange);
            statItem.find(".statai-stat-max, #statai-stat-max").val(statMaxRange);
            statItem.find("#statai-stat-desc").val(statDescription);

            statContainer.append(statItem);
        });
    }
}

function profileSetActive(profile, profileSelect, profileDeleteButton)
{
    const selectedProfileName = profileSelect.val();
    if (selectedProfileName && selectedProfileName !== "selectionprofile")
    {
        setActiveProfile(selectedProfileName);
    }
    else if (selectedProfileName === "selectionprofile")
        setActiveProfile(null);
    const modifiable = selectedProfileName && selectedProfileName !== "selectionprofile";
    logInfo(`Profile ${selectedProfileName} is now active. Modifiable: ${modifiable}`);
    setModifiableState(modifiable, profileDeleteButton);
}

function setModifiableState(isModifiable, profileDeleteButton)
{
    const addStatButton = $("#statai-create-stat-button");
    const deleteStatButton = $("#statai-delete-stat-button");
    const clearStatButton = $("#statai-save-stat-button");
    const disabled = !isModifiable;
    profileDeleteButton.prop("disabled", disabled);
    addStatButton.prop("disabled", disabled);
    deleteStatButton.prop("disabled", disabled);
    clearStatButton.prop("disabled", disabled);
}

export { setupExtensionMenu }