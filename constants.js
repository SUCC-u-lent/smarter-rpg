import { extension_settings } from "../../../../extensions.js";

const extensionName = "smarter-rpg";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;
const defaultSettings = {};

function getExtensionName() { return extensionName; }
function getExtensionFolderPath() { return extensionFolderPath; }

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
    getExtensionName,
    getExtensionFolderPath,
    hashCode
}