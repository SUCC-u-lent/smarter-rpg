import { getExtensionSettings, saveSettings } from "../constants.js";

function getExtensionStorage()
{
    return getExtensionSettings() || {};
}

function saveExtensionStorage(newStorage)
{
    saveSettings(newStorage)
}
function getDataFor(key, defaultValue = {})
{
    const storage = getExtensionStorage();
    return storage[key] || defaultValue;
}
function saveDataFor(key, data)
{
    const storage = getExtensionStorage();
    storage[key] = data;
    saveExtensionStorage(storage);
}

export {
    getExtensionStorage,
    saveExtensionStorage,
    getDataFor,
    saveDataFor
}