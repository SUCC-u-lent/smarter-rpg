import { callGenericPopup, POPUP_TYPE } from "../../../../popup.js";
import { restartHeartbeat } from "../ai/ai_heartbeat.js";
import StatProfile, { Stat } from "../characterdata/stat_profile.js";
import { extensionEventSource, extensionEventTypes } from "../events/extension_events.js";
import Settings from "../settings/ExtensionSettings.js";
import ExtensionStorage from "../storage/ExtensionStorage.js";
import { toastError, toastInfo } from "../utilities/logging.js";

export default async function wireUI()
{
    const extensionTab = await Settings.getJQueryElement("extensionTab.html"),
        settingTab = $("#extensions_settings");
    settingTab.append(extensionTab);
    const profilesModule = await Settings.getJQueryElement("profiles_module.html");
    settingTab.find("#statai-settings-container-primary").append(profilesModule);
    const uiConfigModule = await Settings.getJQueryElement("ui_config.html");
    settingTab.find("#statai-settings-container-primary").append(uiConfigModule);
    const promptModule = await Settings.getJQueryElement("prompt_module.html");
    settingTab.find("#statai-settings-container-primary").append(promptModule);
    wireConfigModule(uiConfigModule);
    $("#statai_font_size_counter").on("change",()=>{
        const value = parseFloat($("#statai_font_size_counter").val());
        if (isNaN(value)) return;
        $("#statai_font_size_multiplier").val(value)
        ExtensionStorage.set("default_font_size", value);
        document.documentElement.style.setProperty("--statai-font-size", value);
    });
    $("#statai_font_size_multiplier").on("change",()=>{
        const value = parseFloat($("#statai_font_size_multiplier").val());
        if (isNaN(value)) return;
        $("#statai_font_size_counter").val(value)
        ExtensionStorage.set("default_font_size", value);
        document.documentElement.style.setProperty("--statai-font-size", value);
    });
    extensionEventSource.on(extensionEventTypes.ON_AUXIL_STATUS_CHANGE, async (statusCode) => {
        // Uses html status code. Between green, orange and red.
        const statusElement = $("#statai_auxil_status");
        const statusIconElement = $("#statai_auxil_status_icon");
        if (!statusElement || !statusIconElement) return;
        if (statusCode >= 200 && statusCode < 300)
        {
            statusElement.text("Auxil Status: 🟢 Operational");
            statusIconElement.text("🟢");
        }
        else
        {
            statusElement.text(`Auxil Status: 🔴 Unavailable (Code: ${statusCode})`);
            statusIconElement.text("🔴");
        }
    });
    extensionEventSource.on(extensionEventTypes.ON_AUXIL_CONNECTION_LOST, async () => {
        // Uses html status code. Between green, orange and red.
        const statusElement = $("#statai_auxil_status");
        const statusIconElement = $("#statai_auxil_status_icon");
        if (!statusElement || !statusIconElement) return;
        statusElement.text("Auxil Status: 🟠 Connection Lost");
        statusIconElement.text("🟠");
    });
    
    writeProfileModule(profilesModule)
    writePromptModule(promptModule);

    $("#statai_enable").on(
        "change",
        onToggledRPG,
    );
    $("#statai_clear_cache").on(
        "click",
        Settings.reset,
    );
}

function writePromptModule(promptModule)
{
    // statai_auxil_prompt_input, statai_in_message_template_input, statai_auxil_prompt_reset, statai_in_message_template_reset
    const auxilPromptInput = promptModule.find("#statai_auxil_prompt_input");
    const inMessageTemplateInput = promptModule.find("#statai_in_message_template_input");
    const auxilPromptResetButton = promptModule.find("#statai_auxil_prompt_reset");
    const inMessageTemplateResetButton = promptModule.find("#statai_in_message_template_reset");
    auxilPromptInput.val(ExtensionStorage.get("stat_gen_prompt", ExtensionStorage.Defaults.stat_gen_prompt));
    inMessageTemplateInput.val(ExtensionStorage.get("message_prompt", ExtensionStorage.Defaults.message_prompt));
    auxilPromptInput.on("change", (event) => {
        const value = $(event.target).val();
        if (!value) return;
        ExtensionStorage.set("stat_gen_prompt", value);
    });
    inMessageTemplateInput.on("change", (event) => {
        const value = $(event.target).val();
        if (!value) return;
        ExtensionStorage.set("message_prompt", value);
    });
    auxilPromptResetButton.on("click", () => {
        if (!confirm("Are you sure you want to reset the Auxil prompt to its default value?"))
        {
            return;
        }
        ExtensionStorage.set("stat_gen_prompt", ExtensionStorage.Defaults.stat_gen_prompt);
        auxilPromptInput.val(ExtensionStorage.get("stat_gen_prompt", ExtensionStorage.Defaults.stat_gen_prompt));
    });
    inMessageTemplateResetButton.on("click", () => {
        if (!confirm("Are you sure you want to reset the in-message prompt to its default value?"))
        {
            return;
        }
        ExtensionStorage.set("message_prompt", ExtensionStorage.Defaults.message_prompt);
        inMessageTemplateInput.val(ExtensionStorage.get("message_prompt", ExtensionStorage.Defaults.message_prompt));   
    });
}

/** @param {JQuery<HTMLElement>} configModule */
function wireConfigModule(configModule)
{
    const saveInteger = (key, rawValue) => {
        const parsed = Number.parseInt(`${rawValue ?? ""}`, 10);
        if (Number.isNaN(parsed)) return;
        ExtensionStorage.set(key, parsed);
    };

    configModule.find("#statai_auxil_url").on("change", (event) => {
        const value = `${$(event.target).val() ?? ""}`.trim();
        if (!value) return;
        ExtensionStorage.set("auxil_url", value);
        restartHeartbeat();
    });

    configModule.find("#statai_auxil_model").on("change", (event) => {
        const value = `${$(event.target).val() ?? ""}`.trim();
        if (!value) return;
        ExtensionStorage.set("auxil_model", value);
    });

    configModule.find("#statai_use_main_api_fallback").on("change", (event) => {
        ExtensionStorage.set("use_main_api_fallback", $(event.target).prop("checked"));
    });

    configModule.find("#statai_history_message_count").on("change", (event) => {
        saveInteger("history_message_count", $(event.target).val());
    });

    configModule.find("#statai_stat_position").on("change", (event) => {
        saveInteger("stat_position", $(event.target).val());
    });

    configModule.find("#statai_stat_depth").on("change", (event) => {
        saveInteger("stat_depth", $(event.target).val());
    });

    configModule.find("#statai_stat_worldinfo_included").on("change", (event) => {
        ExtensionStorage.set("stat_worldinfo_included", $(event.target).prop("checked"));
    });
}

function writeProfileModule(profilesModule)
{
    const select = profilesModule.find("#statai_profiles_select");
    select.on("change", onProfileChange);
    const addProfileButton = profilesModule.find("#statai_profile_new");
    addProfileButton.on("click", onAddProfile);
    const removeProfileButton = profilesModule.find("#statai_profile_remove");
    removeProfileButton.on("click", onRemoveProfile);
    const addStatButton = profilesModule.find("#statai_stat_create");
    addStatButton.prop("disabled", true);
    removeProfileButton.prop("disabled", true);
}

function onRemoveProfile()
{
    const select = $("#statai_profiles_select");
    const profileName = select.val();
    if (!profileName || profileName === "") return;
    /** @type {StatProfile[]} */
    const profiles = ExtensionStorage.get("profiles", ExtensionStorage.Defaults.profiles)
        .map(profile => StatProfile.decompile(profile));
    const profileIndex = profiles.findIndex(p => p.getName() === profileName);
    if (profileIndex === -1)
    {
        select.val("").trigger("change");
        return;
    }
    if (!confirm(`Are you sure you want to delete the profile "${profileName}"? This action cannot be undone.`))
    {
        return;
    }
    profiles.splice(profileIndex, 1);
    ExtensionStorage.set(
        "profiles",
        profiles.map(p => p.toJSON()),
    );
    toastInfo("Profile deleted", `Profile "${profileName}" has been deleted successfully.`);
    extensionEventSource.emit(extensionEventTypes.ON_RELOAD_CHARACTER_MENUS);
    select.find(`option[value="${profileName}"]`).remove();
    select.val("").trigger("change");
}

function onAddProfile()
{
    const profileName = prompt("Enter a name for the new profile:");
    if (!profileName || profileName.trim() === "")
    {
        alert("Profile name cannot be empty.");
        return;
    }
    /** @type {StatProfile[]} */
    const profiles = ExtensionStorage.get("profiles", ExtensionStorage.Defaults.profiles)
        .map(profile => StatProfile.decompile(profile));
    if (profiles.some(p => p.getName() === profileName))
    {
        alert("A profile with this name already exists. Please choose a different name.");
        return;
    }
    const newProfile = new StatProfile(profileName, []);
    profiles.push(newProfile);
    ExtensionStorage.set(
        "profiles",
        profiles.map(p => p.toJSON()),
    );
    extensionEventSource.emit(extensionEventTypes.ON_RELOAD_CHARACTER_MENUS);
    toastInfo("Profile created", `Profile "${profileName}" has been created successfully.`);
    const select = $("#statai_profiles_select");
    select.append(`<option value="${newProfile.getName()}">${newProfile.getName()}</option>`);
    select.val(newProfile.getName()).trigger("change");
}

function onProfileChange(event)
{
    const profileModule = $("#statai_profiles_module");
    const removeProfileButton = profileModule.find("#statai_profile_remove");
    const addStatButton = profileModule.find("#statai_stat_create");

    const select = $(event.target);
    const profileName = select.val();
    addStatButton.prop("disabled", profileName === "" || !profileName);
    removeProfileButton.prop("disabled", profileName === "" || !profileName);
    if (!profileName || profileName === "") return;
    /** @type {StatProfile[]} */
    const profiles = ExtensionStorage.get("profiles", ExtensionStorage.Defaults.profiles)
        .map(profile => StatProfile.decompile(profile));
    /** @type {StatProfile} */
    const profile = profiles.find(p => p.getName() === profileName);
    if (!profile)
    {
        select.val("").trigger("change");
        return;
    }
    onEditProfile(profile);
}

/** @param {StatProfile} profile  */
async function onEditProfile(profile)
{
    const profileModule = $("#statai_profiles_module");
    const titleField = $("#statai_active_profile_title");
    titleField.text(profile.getName());
    const addStatButton = profileModule.find("#statai_stat_create");
    addStatButton.off("click").on("click", async () => {
        const statName = prompt("Enter the name of the new stat:");
        if (!statName || statName.trim() === "")
        {
            return;
        }
        const stats = profile.getStats();
        if (stats.some(s => s.getName() === statName))
        {
            alert("A stat with this name already exists. Please choose a different name.");
            return;
        }
        stats.push(new Stat(statName, "None Set"));
        profile.setStats(stats);
        saveProfile(profile);
        toastInfo("Stat created", `Stat "${statName}" has been created successfully.`);
        await onEditProfile(profile);
    });
    const statsContainer = profileModule.find("#statai_active_profile_stats");
    statsContainer.empty();
    const stats = profile.getStats();
    for (const stat of stats)
    {
        await onStatFieldAdded(profile, stat.getName(), statsContainer);
    }
}

async function onStatFieldAdded(profile, statName, fieldContainer)
{
    console.log(`Adding field for stat "${statName}"`);
    const statTemplate = await Settings.getJQueryElement("profile/stat_template.html");
    fieldContainer.append(statTemplate);

    const statNameField = statTemplate.find(".statai_stat_name");
    statNameField.text(statName);
    const statEditButton = statTemplate.find(".statai_stat_edit");
    const statRemoveButton = statTemplate.find(".statai_stat_remove");
    let editing = false;
    statEditButton.off("click").on("click", async (event) => {
        if (editing) return;
        editing = true;
        const editPopup = await Settings.getJQueryElement("profile/stat_edit_menu.html");
        onStatEdit(profile, statName, editPopup);
        await callGenericPopup(
            editPopup,
            POPUP_TYPE.TEXT,
            ''
        )
        editing = false;
    });
    statRemoveButton.off("click").on("click", async (event) => {
        event.preventDefault();
        if (!confirm(`Are you sure you want to delete the stat "${statName}"? This action cannot be undone.`))
        {
            return;
        }
        const stats = profile.getStats();
        profile.setStats(stats.filter(s => s.getName() !== statName));
        saveProfile(profile);
        await onEditProfile(profile);
        toastInfo("Stat deleted", `Stat "${statName}" has been deleted successfully.`);
    });
}

/**
 * @param {StatProfile} profile 
 * @param {string} statName 
 * @param {JQuery<HTMLElement>} editPopup 
 */
function onStatEdit(profile, statName, editPopup)
{
    const stats = profile.getStats();
    const stat = stats.find(s => s.getName() === statName);
    if (!stat){
        toastError("Error", `Could not find stat "${statName}" to edit.`);
        return;
    }
    const statNameField = editPopup.find(".statai_stat_name_input")
    const statDescriptionField = editPopup.find(".statai_stat_description_input");
    const statDefaultValueField = editPopup.find(".statai_stat_default_value_input");
    const statTypeField = editPopup.find(".statai_stat_type_input");
    const statRangeContainer = editPopup.find(".statai_range_inputs")
    const statMinValueField = editPopup.find(".statai_stat_min_range_input");
    const statMaxValueField = editPopup.find(".statai_stat_max_range_input");
    const saveButton = editPopup.find(".statai_stat_save_button");

    statTypeField.off("change").on("change", (event) => {
        const selectedType = $(event.target).val();
        if (selectedType === "range" || selectedType === "percentage")
        { statRangeContainer.show(); }
        else
        { statRangeContainer.hide(); }
    })
    saveButton.off("click").on("click", () => {
        const updatedStatName = statNameField.val();
        if (!updatedStatName || updatedStatName.trim() === "")        {
            alert("Stat name cannot be empty.");
            return;
        }
        const stats = profile.getStats();
        if (updatedStatName !== statName && stats.some(s => s.getName() === updatedStatName))
        {
            alert("A stat with this name already exists. Please choose a different name.");
            return;
        }
        const statIndex = stats.findIndex(s => s.getName() === statName);
        if (statIndex === -1)
        {
            toastError("Error", `Could not find stat "${statName}" to save.`);
            return;
        }
        const type = statTypeField.val();
        const minValue = type === "range" || type === "percentage"
            ? statMinValueField.val()
            : stat.getMinRange();
        const maxValue = type === "range" || type === "percentage"
            ? statMaxValueField.val()
            : stat.getMaxRange();
        stats[statIndex] = new Stat(
            updatedStatName,
            statDescriptionField.val(),
            statDefaultValueField.val(),
            type,
            minValue,
            maxValue,
        );
        profile.setStats(stats);
        saveProfile(profile);
        toastInfo("Stat updated", `Stat "${updatedStatName}" has been updated successfully.`);
    })

    statNameField.val(stat.getName()).trigger("change");
    statDescriptionField.val(stat.getDescription()).trigger("change");
    statDefaultValueField.val(stat.getDefaultValue()).trigger("change");
    statTypeField.val(stat.getType()).trigger("change");
    statMinValueField.val(stat.getMinRange()).trigger("change");
    statMaxValueField.val(stat.getMaxRange()).trigger("change");
}

function saveProfile(profile){
    /** @type {StatProfile[]} */
    const profiles = ExtensionStorage.get("profiles", ExtensionStorage.Defaults.profiles)
        .map(profile => StatProfile.decompile(profile));
    const profileIndex = profiles.findIndex(p => p.getName() === profile.getName());
    if (profileIndex === -1)    {
        toastInfo("Error", `Could not find profile "${profile.getName()}" to save changes.`);
        return;
    }
    profiles[profileIndex] = profile;
    ExtensionStorage.set(
        "profiles",
        profiles.map(p => p.toJSON()),
    );
}

function onToggledRPG(event)
{
    const element = $(event.target);
    Settings.set(
        "enabled",
        element.prop("checked"),
    ).save();
}