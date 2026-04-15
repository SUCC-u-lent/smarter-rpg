import { getDataFor, saveDataFor } from "./extension_storage.js";
import { logInfo } from "../extensionLogging.js";

function getAllCharacterData()
{
    const characterData = getDataFor("character_data", []);

    if (Array.isArray(characterData))
        return characterData;

    if (characterData && typeof characterData === "object")
    {
        const migratedProfiles = Object.values(characterData)
            .filter(profile => profile && typeof profile === "object");
        saveCharacterData(migratedProfiles);
        logInfo("Migrated profiles storage to array format.");
        return migratedProfiles;
    }

    saveCharacterData([]);
    return [];
}

function saveAllCharacterData(data)
{
    saveDataFor("character_data", data);
}

function getCharacterData(characterName)
{
    const allCharacterData = getAllCharacterData();
    return allCharacterData.find(character => character.name === characterName);
}
function saveCharacterData(characterData)
{
    const allCharacterData = getAllCharacterData();
    const existingCharacterIndex = allCharacterData.findIndex(c => c.name === characterData.name);
    if (existingCharacterIndex !== -1)
    {
        allCharacterData[existingCharacterIndex] = characterData;
        saveAllCharacterData(allCharacterData);
    } else {
        allCharacterData.push(characterData);
        saveAllCharacterData(allCharacterData);
    }
}

export { getAllCharacterData, saveAllCharacterData, getCharacterData, saveCharacterData };