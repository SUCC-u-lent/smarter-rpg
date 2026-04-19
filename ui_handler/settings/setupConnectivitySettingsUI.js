import { saveSettingsDebounced } from "../../../../../../script.js";
import { extension_settings } from "../../../../../extensions.js";
import { resetAIHeartbeatAttempts, setupAIHeartbeat } from "../../aiHandler/aiHeartbeatHandler.js";
import { extensionEventSource, extensionEventTypes } from "../../events/ExtensionEvents.js";
import { getGlobalExtensionStorage } from "../../storage_systems/GlobalExtensionStorage.js";
import { getExtensionName } from "../../utilities/constants.js";
import { awaitHtmlElement, getJQueryHtml } from "../../utilities/ExtensionUtilities.js";
import { runProfileTabUI } from "./profileHandler.js";

export async function setupConnectivitySettingUI()
{
    const settings = getGlobalExtensionStorage();
    const config = settings.getConfig();

    const topSettingsMenu = await awaitHtmlElement(null,"#top-settings-holder")
    if (topSettingsMenu.length === 0) {throw new Error("Could not find top settings menu element")}
    const container = await getJQueryHtml("menu/rpg_topButton.html");
    topSettingsMenu.append(container);
    const toggleButton = await awaitHtmlElement(container,".drawer-toggle")
    const buttonVisual = await awaitHtmlElement(toggleButton, ".drawer-icon.fa-solid.fa-cubes.fa-fw.interactable")
    const drawerContent = await awaitHtmlElement(container,"#statai_extension_block")
    toggleButton.off("click").on("click",()=>{
        const isClosed = buttonVisual.hasClass("closedIcon")
        // For visual swap class closedIcon to openIcon
        if (isClosed){
            buttonVisual.removeClass("closedIcon").addClass("openIcon")
            drawerContent.removeClass("closedDrawer").addClass("openDrawer")
        } else {
            buttonVisual.removeClass("openIcon").addClass("closedIcon")
            drawerContent.removeClass("openDrawer").addClass("closedDrawer")
        }
    })
    const leftMenu = await awaitHtmlElement(container,"#statai_extensions_settings")
    const bottomMenu = await awaitHtmlElement(container,"#statai_extensions_settings3")

    const connectivityTab = await getJQueryHtml("menu/connectivity_tab.html")
    leftMenu.append(connectivityTab)
    const profileTab = await getJQueryHtml("menu/profile_tab.html")
    bottomMenu.append(profileTab)
    runProfileTabUI(profileTab);

    const stataiFontSizeInput = await awaitHtmlElement(connectivityTab, "#statai_font_size");
    const stataiFontSizeCounter = await awaitHtmlElement(connectivityTab, "#statai_font_size_counter");
    stataiFontSizeInput.off("input").on("input", function(){
        // @ts-ignore
        const newValue = parseFloat($(this).val());
        if (!isNaN(newValue)) {
            stataiFontSizeCounter.val(newValue);
            document.documentElement.style.setProperty('--statai-font-size', newValue.toString());
            extensionEventSource.emit(extensionEventTypes.FONT_SIZE_CHANGED, newValue);
            config.setFontSize(newValue)
            config.save()
        }
    });
    stataiFontSizeCounter.off("input").on("input", function(){
        // @ts-ignore
        const newValue = parseFloat($(this).val());
        if (!isNaN(newValue)) {
            stataiFontSizeInput.val(newValue);
            document.documentElement.style.setProperty('--statai-font-size', newValue.toString());
            extensionEventSource.emit(extensionEventTypes.FONT_SIZE_CHANGED, newValue);
            config.setFontSize(newValue)
            config.save()
        }
    });
    // Initialize with current config value
    stataiFontSizeInput.val(config.getFontSize()).trigger("input");
    stataiFontSizeCounter.val(config.getFontSize()).trigger("input");

    const enableToggle = await awaitHtmlElement(connectivityTab, "#statai_enable");
    enableToggle.off("change").on("change", function(){
        const isChecked = $(this).is(":checked");
        config.setEnabled(isChecked)
        extensionEventSource.emit(extensionEventTypes.EXTENSION_ENABLED_CHANGED, isChecked);
        config.save();
    })
    // Initialize with current config value
    enableToggle.prop("checked", config.getEnabled()).trigger("change");

    setupAIHeartbeat()
    const connectivityStatus = await awaitHtmlElement(connectivityTab, "#statai_connection_status");
    extensionEventSource.on(extensionEventTypes.CONNECTION_STATUS_CHANGED,(/** @type {number} */ statusCode, /** @type {string|undefined} */ reason)=>{
        let statusText = reason;
        let statusClass = "";
        switch (statusCode) {
            case 200:
                statusText = "Connected To Auxil";
                statusClass = "statai-valid-text-color";
                break;
            default:
                statusText = statusText ?? "Disconnected from Auxil";
                statusClass = "statai-invalid-text-color";
                break;
        }
        connectivityStatus.text(statusText).removeClass("statai-valid-text-color statai-invalid-text-color").addClass(statusClass);
    })

    const connectionUrl = await awaitHtmlElement(connectivityTab, "#statai_connection_url");
    connectionUrl.off("change").on("change", function(){
        const newValue = $(this).val();
        if (typeof newValue === "string") {
            config.setConnectionUrl(newValue);
            extensionEventSource.emit(extensionEventTypes.CONNECTION_URL_CHANGED, newValue);
            config.save();
        }
    })

    connectionUrl.val(config.getConnectivity().getBackendUrl()).trigger("change");

    const resetConnectionUrl = await awaitHtmlElement(connectivityTab, "#statai_reset_connection_url");
    resetConnectionUrl.off("click").on("click", function(){
        config.setConnectionUrl(""); // This will reset to default which is http://localhost:3000, as defined in the Connectivity class
        extensionEventSource.emit(extensionEventTypes.CONNECTION_URL_CHANGED, config.getConnectivity().getBackendUrl());
        config.save();
        connectionUrl.val(config.getConnectivity().getBackendUrl()).trigger("change");
    });
    const retryConnectionUrl = await awaitHtmlElement(connectivityTab, "#statai_retry_connection_url");
    retryConnectionUrl.off("click").on("click", function(){
        resetAIHeartbeatAttempts(); // This will cause the heartbeat handler to attempt reconnection immediately, rather than waiting for the next scheduled attempt.
    })

    const modelInput = await awaitHtmlElement(connectivityTab, "#statai_model");
    modelInput.off("change").on("change", function(){
        const newValue = $(this).val();
        if (typeof newValue === "string") {
            const connectivity = config.getConnectivity();
            connectivity.setModel(newValue);
            config.setConnectivity(connectivity)
            extensionEventSource.emit(extensionEventTypes.MODEL_CHANGED, newValue);
            config.save();
        }
    })

    modelInput.val(config.getConnectivity().getModel()).trigger("change");
    const clearCacheButton = await awaitHtmlElement(connectivityTab, "#statai_clear_cache");
    clearCacheButton.off("click").on("click", function(){
        // @ts-ignore
        extension_settings[getExtensionName()] = {}
        saveSettingsDebounced();
        extensionEventSource.emit(extensionEventTypes.CACHE_CLEARED);
    })
}
