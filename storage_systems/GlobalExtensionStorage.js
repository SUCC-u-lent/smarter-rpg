import { saveSettingsDebounced } from "../../../../../script.js";
import { extension_settings } from "../../../../extensions.js";
import { getExtensionName } from "../utilities/constants.js";
import { GlobalExtensionSettings } from "./classes/global/GlobalExtensionSettings.js";
/** @returns {GlobalExtensionSettings} */
function getGlobalExtensionStorage()
{
    const extensionName = getExtensionName();
    // @ts-ignore
    const extensionSettings = extension_settings[extensionName] || {}
    const globalExtensionSettings = extensionSettings["global"] || {};
    if (globalExtensionSettings instanceof GlobalExtensionSettings) {
        return globalExtensionSettings;
    }

    if (globalExtensionSettings && typeof globalExtensionSettings === "object") {
        const hydratedSettings = GlobalExtensionSettings.fromJSON(globalExtensionSettings);
        if (hydratedSettings instanceof GlobalExtensionSettings) {
            setGlobalExtensionStorage(hydratedSettings);
            return hydratedSettings;
        }
    }

    const newSettings = new GlobalExtensionSettings();
    setGlobalExtensionStorage(newSettings);
    return newSettings;
}

/** @param {GlobalExtensionSettings} storage  */
function setGlobalExtensionStorage(storage)
{
    const extensionName = getExtensionName();
    if (storage instanceof GlobalExtensionSettings) {
        // @ts-ignore
        const extensionSettings = extension_settings[extensionName] || {}
        extensionSettings["global"] = storage;
        // @ts-ignore
        extension_settings[extensionName] = extensionSettings;
        saveSettingsDebounced(); // Required or SillyTavern won't recognize the changes
    }
    else
    {
        throw new Error("Storage must be an instance of GlobalExtensionSettings");
    }
}
function getExtensionEnabled()
{
    const storage = getGlobalExtensionStorage();
    return storage.getConfig().getEnabled();
}

export { getGlobalExtensionStorage, setGlobalExtensionStorage, getExtensionEnabled }