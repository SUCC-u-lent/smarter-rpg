import { getGlobalExtensionStorage } from "../../storage_systems/GlobalExtensionStorage.js";
import { awaitHtmlElement, getJQueryHtml } from "../../utilities/ExtensionUtilities.js"

export async function setupPromptSettingsUI()
{
    const globalSettings = getGlobalExtensionStorage()
    const config = globalSettings.getConfig();

    const promptTab = await getJQueryHtml("menu/prompt_tab.html");
    const topBarContainer = await awaitHtmlElement(null,"#statai-settings-button")
    const rightMenu = await awaitHtmlElement(topBarContainer,"#statai_extensions_settings2")
    rightMenu.append(promptTab)
    // Now do stuff.
    const injectionPromptLabel = $("#statai_injection_prompt")
    const injectionPromptMacros = $("#statai_injection_prompt_macrolist")
    const injectionPromptInput = $("#statai_injection_prompt_input")
    const injectionPromptReset = $("#statai_reset_injection_prompt")
    injectionPromptLabel.on("click",function(){
        const isVisible = injectionPromptMacros.prop("hidden")
        if (isVisible){
            injectionPromptMacros.prop("hidden", false);
        } else {
            injectionPromptMacros.prop("hidden", true);
        }
    })
    injectionPromptInput.on("change", function(){
        const newValue = $(this).val();
        if (typeof newValue === "string"){
            const connectivity = config.getConnectivity();
            connectivity.setMessagePrompt(newValue);
            connectivity.save();
        }
    })
    injectionPromptReset.on("click", function(){
        const connectivity = config.getConnectivity();
        connectivity.setMessagePrompt("");
        connectivity.save();
        injectionPromptInput.val(config.getConnectivity().getRAWMessagePrompt()).trigger("change");
    })
    injectionPromptInput.val(config.getConnectivity().getRAWMessagePrompt()).trigger("change")

    // Now do stuff.
    const auxilPromptLabel = $("#statai_auxil_prompt")
    const auxilPromptMacros = $("#statai_auxil_prompt_macrolist")
    const auxilPromptInput = $("#statai_auxil_prompt_input")
    const auxilPromptReset = $("#statai_reset_auxil_prompt")
    auxilPromptLabel.on("click",function(){
        const isVisible = auxilPromptMacros.prop("hidden")
        if (isVisible){
            auxilPromptMacros.prop("hidden", false);
        } else {
            auxilPromptMacros.prop("hidden", true);
        }
    })
    auxilPromptInput.on("change", function(){
        const newValue = $(this).val();
        if (typeof newValue === "string"){
            const connectivity = config.getConnectivity();
            connectivity.setAuxilPrompt(newValue);
            connectivity.save();
        }
    })
    auxilPromptReset.on("click", function(){
        const connectivity = config.getConnectivity();
        connectivity.setAuxilPrompt("");
        connectivity.save();
        auxilPromptInput.val(config.getConnectivity().getRAWAuxilPrompt()).trigger("change");
    })
    auxilPromptInput.val(config.getConnectivity().getRAWAuxilPrompt()).trigger("change")

    const promptMode = $("#statai_prompt_mode")
    promptMode.on("change", function(){
        const newValue = $(this).val();
        if (typeof newValue === "string"){
            config.setStatMode(newValue);
            config.save();
        }
    })
    promptMode.val(config.getStatMode()).trigger("change")
}