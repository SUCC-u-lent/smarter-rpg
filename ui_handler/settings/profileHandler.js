import { callGenericPopup, POPUP_TYPE } from "../../../../../popup.js";
import { extensionEventSource, extensionEventTypes } from "../../events/ExtensionEvents.js";
import { toastInfo } from "../../logging.js";
import Profile from "../../storage_systems/classes/global/ProfileClass.js";
import Stat from "../../storage_systems/classes/global/StatClass.js";
import { getGlobalExtensionStorage, setGlobalExtensionStorage } from "../../storage_systems/GlobalExtensionStorage.js";
import { getJQueryHtml } from "../../utilities/ExtensionUtilities.js";

/**
 * @param {JQuery<HTMLElement>} profileTab
 */
export async function runProfileTabUI(profileTab)
{
    // Listen for the events we just emitted, helps to allow other parts of the extension to also invoke this code.
    const profileElement = await getJQueryHtml("menu/profile_element.html")
    const statTemplate = profileElement.find("#statai_stat_template").first()
    profileElement.find("#statai_stat_template").remove() // Remove the template from the DOM, we'll keep it in memory to clone for new stats.
    const selectMenu = profileTab.find("#statai_profile_select")
    const createProfileButton = profileTab.find("#statai-create-profile")
    createProfileButton.off("click").on("click",()=>{
        const profileName = prompt("Enter a name for the new profile:")
        if (!profileName)
        {
            return;
        }
        const profile = new Profile(profileName.trim())
        extensionEventSource.emit(extensionEventTypes.CREATE_PROFILE, profile)
        addProfileToSelect(profile);
        // Save the profile right now.
        const storage = getGlobalExtensionStorage()
        storage.pushProfile(profile)
        console.log("Pushed profile to storage, now saving storage.")
        console.log(`Current profiles in storage: ${storage.getProfiles().map((/** @type {{ getName: () => string; }} */ p) => p.getName()).join(", ")}`)
        setGlobalExtensionStorage(storage)
    })
    const clearProfilesButton = profileTab.find("#statai-clear-profile")
    clearProfilesButton.off("click").on("click",()=>{
        const confirmation = confirm("Are you sure you want to clear all profiles? This action cannot be undone.")
        if (confirmation)
        {
            extensionEventSource.emit(extensionEventTypes.CLEAR_PROFILES, null)
            const storage = getGlobalExtensionStorage()
            storage._setField("profiles", []) // Clear profiles array in storage.
            setGlobalExtensionStorage(storage)
            selectMenu.empty() // Clear the select menu as well.
            selectMenu.append(`<option value="">Select A Profile</option>`) // Add back the default option.
            profileTab.find("#statai-profile-container").empty()
        }
    })
    function addProfileToUI(/**@type {Profile} */profile)
    {
        const pe = profileElement.clone()
        profileTab.find("#statai-profile-container").append(pe)
        pe.find("#statai_profile_header").text(profile.getName())
        profile.getStats().forEach(stat=>{
            const statHtml = statTemplate.clone()
            statHtml.removeAttr("id")
            statHtml.prop("hidden", false)
            statHtml.find("#statai_stat_header").text(stat.getName().trim())
            pe.find("#statai-stats-container").append(statHtml)
            runStatEditor(profile, statHtml, stat.getName().trim(), stat).then(()=>{})
        })
        runProfileEditor(profile, pe,statTemplate,selectMenu)
    }
    selectMenu.off("change").on("change",()=>{
        console.log("Profile select menu changed.")
        // @ts-ignore
        const value = $(selectMenu).val()
        console.log(value)
        if (!value){
            profileTab.find("#statai-profile-container").empty() // Clear the profile editor if no profile is selected.
            return;
        }
        const profileValue = value.toString().trim()
        if (!profileValue){
            profileTab.find("#statai-profile-container").empty() // Clear the profile editor if no profile is selected.
            return;
        }
        console.log(profileValue)
        const storage = getGlobalExtensionStorage()
        if (storage.hasProfile(profileValue))
        {
            const profile = storage.getProfile(profileValue)
            if (profile) {addProfileToUI(profile);return;}
        }
        profileTab.find("#statai-profile-container").empty() // Clear the profile editor if no profile is selected.
    })

    function addProfileToSelect(/**@type {Profile} */profile)
    {
        selectMenu.append(`<option value=${profile.getId()}>${profile.getName()}</option>`)
        selectMenu.val(profile.getId()).trigger("change")
    }

    // Setup profiles that already exist.
    const storage = getGlobalExtensionStorage()
    const profiles = storage.getProfiles()
    for (const profile of profiles)
    { extensionEventSource.emit(extensionEventTypes.PROFILE_LOADED, profile); addProfileToSelect(profile); }
}

// Profile editor code.
// When editing stats in the profile editor the profile is not updated unless the "Save" button is clicked.
/**
 * @param {Profile} profile
 * @param {JQuery<HTMLElement>} element
 * @param {JQuery<HTMLElement>} statTemplate
 * @param {JQuery<HTMLElement>} selectMenu
 */
function runProfileEditor(profile, element, statTemplate, selectMenu)
{
    element.find("#statai-save-profile").off("click").on("click",function(){
        updateProfile(profile) // Save the profile to the storage.
        toastInfo("Profile saved.")
    })
    element.find("#statai-delete-profile").off("click").on("click",function()
    {
        const confirmation = confirm(`Are you sure you want to delete the profile "${profile.getName()}"? This action cannot be undone.`)
        if (confirmation)
        {
            selectMenu.find(`option[value="${profile.getId()}"]`).remove()
            selectMenu.val("")
            element.remove()
            const storage = getGlobalExtensionStorage()
            storage.deleteProfile(profile.getId())
            setGlobalExtensionStorage(storage)
        }
    })
    element.find("#statai-create-stat").off("click").on("click",()=>{
        const statName = prompt("Enter a name for the new stat:")
        if (!statName || !statName.trim())
        {
            return;
        }

        if (profile.hasStat(statName.trim()))
        {
            alert(`A stat with the name "${statName.trim()}" already exists in this profile.`)
            return;
        }
        const stat = Stat.newNamedStat(statName.trim())

        profile.pushStat(stat)

        updateProfile(profile) // Update the profile in storage to save the new stat.
        const statHtml = statTemplate.clone()
        statHtml.removeAttr("id")
        statHtml.prop("hidden", false)
        statHtml.find("#statai_stat_header").text(statName.trim())
        element.find("#statai-stats-container").append(statHtml)
        runStatEditor(profile, statHtml, statName.trim(), stat).then(()=>{})
    })
}
/**
 * @param {Profile} [profile]
 */
function updateProfile(profile)
{
    if (!profile) return;
    const storage = getGlobalExtensionStorage()
    storage.replaceProfile(profile)
    setGlobalExtensionStorage(storage)
}

// The save button for stats saves the stat into the current profile but does not update the profile in storage until the "Save Profile" button is clicked. This allows for multiple stat edits to be made before saving the profile.
/**
 * @param {Profile} profile
 * @param {JQuery<HTMLElement>} statElement
 * @param {string} statName
 * @param {Stat} stat
 */
async function runStatEditor(profile, statElement, statName, stat)
{
    statElement.find("#statai-delete-stat").off("click").on("click",()=>{
        if (!confirm(`Are you sure you want to delete the stat "${statName}"? This action cannot be undone.`))
        { return; }
        profile.removeStat(statName)
        statElement.remove()
    })
    const statEditElement = await getJQueryHtml("menu/stat_edit_menu.html")
    statElement.find("#statai-edit-stat").off("click").on("click",()=>{
        const nameInput = statEditElement.find("#statai_stat_name_input").first()
        const descriptionInput = statEditElement.find("#statai_stat_description_input").first()
        const defaultValueInput = statEditElement.find("#statai_stat_default_input").first()
        const rangeMinInput = statEditElement.find("#statai_stat_range_min_input").first()
        const rangeMaxInput = statEditElement.find("#statai_stat_range_max_input").first()
        const maxDeltaInput = statEditElement.find("#statai_stat_max_delta_input").first()
        const typeInput = statEditElement.find("#statai_stat_type_input").first()
        const rangeInputs = statEditElement.find("#statai_stat_range_inputs").first()

        nameInput.val(statName)
        descriptionInput.val(stat.getDescription())
        defaultValueInput.val(stat.getDefaultValue())
        rangeMinInput.val(stat.getMin())
        rangeMaxInput.val(stat.getMax())
        maxDeltaInput.val(stat.getMaxDelta() || Infinity)
        typeInput.off("change").on("change",function(){
            const type = $(this).val()
            if (type === "range" || type === "percentage")
            { rangeInputs.show() } 
            else 
            { rangeInputs.hide() }
        })
        typeInput.val(stat.getType()).trigger("change") // Trigger change to show/hide range inputs based on type.

        statEditElement.find("#statai_stat_save_button").off("click").on("click",()=>{
            const newName = nameInput.val()?.toString().trim() || statName
            if (newName !== statName && profile.hasStat(newName))
            {
                alert(`A stat with the name "${newName}" already exists in this profile.`)
                return;
            } 
            stat._setField("name", newName)
            stat._setField("description", descriptionInput.val()?.toString() || "")
            stat._setField("defaultValue", defaultValueInput.val()?.toString() || "")
            stat._setField("min", rangeMinInput.val()?.toString() || "")
            stat._setField("max", rangeMaxInput.val()?.toString() || "")
            stat._setField("type", typeInput.val()?.toString() || "number")
            stat._setField("maxDelta", maxDeltaInput.val()?.toString() || Infinity)
            statElement.find("#statai_stat_header").text(stat.getName().trim())
            profile.removeStat(statName)
            profile.pushStat(stat)
            toastInfo("Stat saved. Remember to click 'Save Profile' to save changes to storage.")
        })
        callGenericPopup(statEditElement, POPUP_TYPE.TEXT,'',{
            allowVerticalScrolling:true,
            allowEscapeClose:true
        })
    })
}