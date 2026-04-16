import { getContext } from "../../../../extensions.js";
import { getDataFor, saveDataFor } from "../data_storage/extension_storage.js";
import { getProfileByName } from "../data_storage/profile_constants.js";

function normalizeChatStatsStore(chatStats)
{
    if (Array.isArray(chatStats))
    {
        const migratedChatStats = {};

        Object.entries(chatStats).forEach(([chatId, chatData]) => {
            if (chatData && typeof chatData === "object")
            {
                migratedChatStats[chatId] = chatData;
            }
        });

        return migratedChatStats;
    }

    if (chatStats && typeof chatStats === "object")
    {
        return chatStats;
    }

    return {};
}

function normalizeCharacterStat(stat)
{
    if (!stat || typeof stat !== "object")
        return null;

    return {
        name: stat.name,
        value: stat.value,
        delta: typeof stat.delta === "number" ? stat.delta : 0,
    };
}

function normalizeCharacterStats(stats)
{
    if (!Array.isArray(stats))
        return [];

    return stats
        .map(normalizeCharacterStat)
        .filter(stat => stat && typeof stat.name === "string");
}

function getChatOwner()
{
    const storedChatStats = getDataFor("chat_data", {});
    const normalizedChatStats = normalizeChatStatsStore(storedChatStats);

    if (storedChatStats !== normalizedChatStats)
    {
        saveChatStats(normalizedChatStats);
    }

    return normalizedChatStats;
}

function getActiveChatId()
{
    const context = getContext();
    return context ? context.chatId : null;
}

// Format:
// chat_data: {
//   "example_chat_id":{
//      "example_character": [
//          { name: "Health", value: 100, delta: 0 },
//          { name: "Mana", value: 50, delta: 0 }
//      ]
//   },
// }

function getChatStats()
{
    return getChatOwner() || {};
}

function saveChatStats(stats)
{
    saveDataFor("chat_data", stats);
}

function getChatData(chatId)
{
    const chatStats = getChatStats();
    return chatStats[chatId] || {};
}
function getActiveChatData()
{
    const context = getContext();
    if (!context || !context.chatId) return {};
    return getChatData(context.chatId);
}
function saveChatData(chatId, data)
{
    const chatStats = getChatStats();
    chatStats[chatId] = data;
    saveChatStats(chatStats);
}

function saveActiveChatData(data)
{
    const context = getContext();
    if (!context || !context.chatId) return;
    saveChatData(context.chatId, data);
}

function getCharacterStatsForActiveChat(characterName)
{
    const chatId = getActiveChatId();
    if (!chatId) return [];
    return getCharacterStatsForChat(chatId, characterName);
}
function saveCharacterStatsForActiveChat(characterName, stats)
{
    const activeChatData = getActiveChatData();
    activeChatData[characterName] = normalizeCharacterStats(stats);
    saveActiveChatData(activeChatData);
}

function deleteCharacterStatsForActiveChat(characterName)
{
    const activeChatData = getActiveChatData();
    delete activeChatData[characterName];
    saveActiveChatData(activeChatData);
}

function getCharacterStatsForChat(chatId, characterName)
{
    const chatData = getChatData(chatId);
    const rawStats = chatData[characterName] || [];
    const normalizedStats = normalizeCharacterStats(rawStats);

    if (JSON.stringify(rawStats) !== JSON.stringify(normalizedStats))
    {
        chatData[characterName] = normalizedStats;
        saveChatData(chatId, chatData);
    }

    return normalizedStats;
}
function saveCharacterStatsForChat(chatId, characterName, stats)
{
    const chatData = getChatData(chatId);
    chatData[characterName] = normalizeCharacterStats(stats);
    saveChatData(chatId, chatData);
}
function deleteCharacterStatsForChat(chatId, characterName)
{
    const chatData = getChatData(chatId);
    delete chatData[characterName];
    saveChatData(chatId, chatData);
}

function getCharacterStatForActiveChat(characterName, profileName, statName)
{
    const chatId = getActiveChatId();
    if (!chatId) return null;
    return getCharacterStatForChat(chatId, characterName, profileName, statName);
}

function saveCharacterStatForActiveChat(characterName, statName, statValue)
{
    const chatId = getActiveChatId();
    if (!chatId) return;
    saveCharacterStatForChat(chatId, characterName, statName, statValue);
}

function getCharacterStatForChat(chatId, characterName, profileName, statName)
{
    // Return the stat value or the default value if not found
    const profileData = getProfileByName(profileName);
    const defaultStat = profileData ? profileData.stats.find(stat => stat.name === statName) : null;

    const characterStats = getCharacterStatsForChat(chatId, characterName);
    const stat = characterStats.find(s => s.name === statName);
    return stat ? stat : defaultStat;
}

function saveCharacterStatForChat(chatId, characterName, statName, statData)
{
    const characterStats = getCharacterStatsForChat(chatId, characterName);
    const statIndex = characterStats.findIndex(s => s.name === statName);
    if (statIndex !== -1)
    {
        characterStats[statIndex] = statData;
    }
    else {
        characterStats.push(statData);
    }
    saveCharacterStatsForChat(chatId, characterName, characterStats);
}

function resetCharacterStatForChat(chatId, characterName, statName)
{
    const profileName = getCharacterData(characterName)?.activeProfile;
    if (!profileName) return;
    const profileData = getProfileByName(profileName);
    const defaultValue = profileData ? profileData.stats.find(stat => stat.name === statName)?.default : null;
    saveCharacterStatForChat(chatId, characterName, statName, { name: statName, value: defaultValue, delta: 0 });
}
function resetCharacterStatForActiveChat(characterName, statName)
{
    const chatId = getActiveChatId();
    if (!chatId) return;
    resetCharacterStatForChat(chatId, characterName, statName);
}
function resetCharacterStatsForActiveChat(characterName){
    const chatId = getActiveChatId();
    if (!chatId) return;
    const profileName = getCharacterData(characterName)?.activeProfile;
    if (!profileName) return;
    const profileData = getProfileByName(profileName);
    if (!profileData) return;
    const defaultStats = profileData.stats.map(stat => ({ name: stat.name, value: stat.default, delta: 0 }));
    saveCharacterStatsForChat(chatId, characterName, defaultStats);
}
function resetCharacterStatsForChat(chatId, characterName){
    const profileName = getCharacterData(characterName)?.activeProfile;
    if (!profileName) return;
    const profileData = getProfileByName(profileName);
    if (!profileData) return;
    const defaultStats = profileData.stats.map(stat => ({ name: stat.name, value: stat.default, delta: 0 }));
    saveCharacterStatsForChat(chatId, characterName, defaultStats);
}

export{
    getChatStats,
    saveChatStats,
    getChatData,
    getActiveChatData,
    saveChatData,
    saveActiveChatData,
    getCharacterStatsForActiveChat,
    saveCharacterStatsForActiveChat,
    deleteCharacterStatsForActiveChat,
    getCharacterStatsForChat,
    saveCharacterStatsForChat,
    deleteCharacterStatsForChat,
    getCharacterStatForChat,
    saveCharacterStatForChat,
    getCharacterStatForActiveChat,
    saveCharacterStatForActiveChat,
    resetCharacterStatForChat,
    resetCharacterStatForActiveChat,
    resetCharacterStatsForActiveChat,
    resetCharacterStatsForChat
}