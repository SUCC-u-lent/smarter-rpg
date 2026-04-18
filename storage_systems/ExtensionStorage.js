import { saveSettingsDebounced } from "../../../../../script.js";
import { extension_settings } from "../../../../extensions.js";
import { getExtensionName } from "../constants.js";
import { ExtensionSettings } from "./classes/ExtensionSettings.js";

function getExtensionStorage()
{
    const extensionName = getExtensionName();
    const extensionSettings = extension_settings[extensionName];
    // Check if extension settings is of the ExtensionSettings class
    if (extensionSettings instanceof ExtensionSettings) {
        return extensionSettings;
    }
    else {
        const newSettings = new ExtensionSettings();
        saveExtensionSettings(newSettings);
        return newSettings;
    }
}

/** @param {ExtensionSettings} settings  */
function saveExtensionSettings(settings)
{
    const extensionName = getExtensionName();
    if (settings instanceof ExtensionSettings) {
        extension_settings[extensionName] = settings;
        saveSettingsDebounced(); // Required or SillyTavern won't recognize the changes
    }
    else
    {
        throw new Error("Settings must be an instance of ExtensionSettings");
    }
}