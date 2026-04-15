import { saveSettingsDebounced } from "../../../../script.js";
import { extension_settings } from "../../../extensions.js";

const extensionName = "smarter-rpg";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;
const defaultSettings = {};

var active = true;

function isActive() { return active; }
function setActive(value) { active = value; }
function isKeyPresent(key) { return key in getExtensionSettings(); }
function getExtensionSettings() { return extension_settings[extensionName]; }
function saveSettings(settings)
{
    extension_settings[extensionName] = settings;
    saveSettingsDebounced(); // Required or SillyTavern won't recognize the changes
}
function getSetting(key, defaultValue) { return isKeyPresent(key) ? getExtensionSettings()[key] : defaultValue; }
function setSetting(key, value) { getExtensionSettings()[key] = value; }

export {
    extensionName,
    extensionFolderPath,
    defaultSettings,
    isActive,
    setActive,
    isKeyPresent,
    getExtensionSettings,
    saveSettings,
    getSetting,
    setSetting
}