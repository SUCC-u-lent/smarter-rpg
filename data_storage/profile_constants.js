import { getDataFor, saveDataFor } from "./extension_storage.js";
import { logInfo } from "../extensionLogging.js";

function getProfiles()
{
    const storedProfiles = getDataFor("profiles", []);

    if (Array.isArray(storedProfiles))
        return storedProfiles;

    if (storedProfiles && typeof storedProfiles === "object")
    {
        const migratedProfiles = Object.values(storedProfiles)
            .filter(profile => profile && typeof profile === "object");
        saveProfiles(migratedProfiles);
        logInfo("Migrated profiles storage to array format.");
        return migratedProfiles;
    }

    saveProfiles([]);
    return [];
}

function saveProfiles(data)
{
    saveDataFor("profiles", data);
}

function getProfileByName(name)
{
    const profiles = getProfiles();
    return profiles.find(profile => profile.name === name);
}

function getActiveProfile()
{
    const profiles = getProfiles();
    return profiles.find(profile => profile.active);
}

function saveProfile(profile)
{
    const profiles = getProfiles();
    const existingProfileIndex = profiles.findIndex(p => p.name === profile.name);
    if (existingProfileIndex !== -1)
    {
        profiles[existingProfileIndex] = profile;
        saveProfiles(profiles);
    }
}

function addProfile(profileName, active = false, stats = [])
{
    const profiles = getProfiles();
    profiles.push({
        name: profileName,
        active: active,
        stats: stats
    });
    saveProfiles(profiles);
}
function deleteProfile(profileName)
{
    if (profileName === "all")
    {
        saveProfiles([]);
        return;
    }
    let profiles = getProfiles();
    profiles = profiles.filter(profile => profile.name !== profileName);
    saveProfiles(profiles);
}
function setActiveProfile(profileName)
{
    const profiles = getProfiles();
    profiles.forEach(profile => {
        if (profileName == null)
            profile.active = false;
        else
            profile.active = (profile.name === profileName);
    });
    saveProfiles(profiles);
}

export {
    getProfiles,
    getProfileByName,
    getActiveProfile,
    saveProfile,
    addProfile,
    deleteProfile,
    setActiveProfile
}