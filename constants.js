import { saveSettingsDebounced } from "../../../../script.js";
import { extension_settings } from "../../../extensions.js";

const extensionName = "smarter-rpg";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;
const defaultSettings = {};

function isActive() { return getExtensionSettings()?.isExtensionActive || false; }
function setActive(value) 
{
    const set = getExtensionSettings();
    set.isExtensionActive = value;
    saveSettings(set);
}

function getPosition() { return getExtensionSettings()?.position || null; }
function setPosition(value) 
{
    const set = getExtensionSettings();
    set.position = value;
    saveSettings(set);
}

function isKeyPresent(key) { return key in getExtensionSettings(); }
function getExtensionSettings() { return extension_settings[extensionName]; }
function saveSettings(settings)
{
    extension_settings[extensionName] = settings;
    saveSettingsDebounced(); // Required or SillyTavern won't recognize the changes
}
function getSetting(key, defaultValue) { return isKeyPresent(key) ? getExtensionSettings()[key] : defaultValue; }
function setSetting(key, value) { getExtensionSettings()[key] = value; }
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return hash;
}
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
    setSetting,
    getPosition,
    setPosition,
    hashCode
}