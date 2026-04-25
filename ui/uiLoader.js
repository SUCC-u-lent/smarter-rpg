import StatProfile from "../characterdata/stat_profile.js";
import { extensionEventSource, extensionEventTypes } from "../events/extension_events.js";
import Settings from "../settings/ExtensionSettings.js";
import ExtensionStorage from "../storage/ExtensionStorage.js";

export default function loadUI()
{
    const defaultFontSize = ExtensionStorage.get("default_font_size", ExtensionStorage.Defaults.default_font_size);
    // Set global var for font size so it can be used in CSS.
    document.documentElement.style.setProperty("--statai-font-size", defaultFontSize);
    $("#statai_enable")
        .prop(
            "checked",
            Settings.get(
                "enabled",
                false,
            ),
        );
    $("#statai_font_size_counter").val(defaultFontSize);
    $("#statai_font_size_multiplier").val(defaultFontSize);
    loadConfigUI();
    loadPromptUI();
    loadProfileUI($("#statai_profiles_module"));
}

function loadPromptUI()
{
    const auxilPromptInput = $("#statai_auxil_prompt_input");
    const inMessageTemplateInput = $("#statai_in_message_template_input");
    auxilPromptInput.val(ExtensionStorage.get("stat_gen_prompt", ExtensionStorage.Defaults.stat_gen_prompt));
    inMessageTemplateInput.val(ExtensionStorage.get("message_prompt", ExtensionStorage.Defaults.message_prompt));
}

function loadConfigUI()
{
    $("#statai_auxil_url").val(ExtensionStorage.get("auxil_url", ExtensionStorage.Defaults.auxil_url));
    $("#statai_auxil_model").val(ExtensionStorage.get("auxil_model", ExtensionStorage.Defaults.auxil_model));
    $("#statai_use_main_api_fallback").prop("checked", ExtensionStorage.get("use_main_api_fallback", ExtensionStorage.Defaults.use_main_api_fallback));
    $("#statai_history_message_count").val(ExtensionStorage.get("history_message_count", ExtensionStorage.Defaults.history_message_count));
    $("#statai_stat_position").val(ExtensionStorage.get("stat_position", ExtensionStorage.Defaults.stat_position));
    $("#statai_stat_depth").val(ExtensionStorage.get("stat_depth", ExtensionStorage.Defaults.stat_depth));
    $("#statai_stat_worldinfo_included").prop("checked", ExtensionStorage.get("stat_worldinfo_included", ExtensionStorage.Defaults.stat_worldinfo_included));
}

function loadProfileUI(profilesModule)
{
    // Loading settings menu...
    const select = profilesModule.find("#statai_profiles_select");
    select.empty();
    select.append(`<option value="" disabled selected>Select a Profile</option>`);
    /** @type {StatProfile[]} */
    const profiles = ExtensionStorage.get("profiles", ExtensionStorage.Defaults.profiles)
        .map(profile => StatProfile.decompile(profile));
    if (profiles.length !== 0)
    {
        for (const profile of profiles)
        { select.append(`<option value="${profile.getName()}">${profile.getName()}</option>`); }
    }
    select.val("").trigger("change");

}