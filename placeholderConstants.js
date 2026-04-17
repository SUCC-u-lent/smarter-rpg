import { getDataFor, saveDataFor } from "./data_storage/extension_storage.js";

function getPlaceholderData()
{
    return getDataFor("placeholder_data", {});
}
function setPlaceholderData(data)
{
    saveDataFor("placeholder_data", data);
}

function getPlaceholderValue(key)
{
    const placeholderData = getPlaceholderData();
    return placeholderData[key];
}

function setPlaceholderValue(key, value)
{
    const placeholderData = getPlaceholderData();
    placeholderData[key] = value;
    setPlaceholderData(placeholderData);
}

export { getPlaceholderValue, setPlaceholderValue };