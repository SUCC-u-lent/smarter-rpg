import { event_types, eventSource } from "../../../../events.js";
import { getContext } from "../../../../extensions.js";
import { getCharacterStatForActiveChat } from "../chat_mini_display/chat_storage.js";
import { getMessagePrompt } from "../connectivity/extensionConnectivity.js";
import { isActive } from "../constants.js";
import { getCharacterData } from "../data_storage/character_config.js";
import { getProfileByName, getProfiles } from "../data_storage/profile_constants.js";
import { getPlaceholderValue } from "../placeholderConstants.js";

function setupChatEventHandler() 
{
    eventSource.on(event_types.GENERATION_STARTED, ()=>{
        if (!isActive()) return;
        injectStats();
    })
}

const injectionSettings = {
    position: 0, // 0 = top, 1 = middle, 2 = bottom
    depth: 0,    // 0 = same level as message, -1 = above message, 1 = below message
    include_wi: false // Whether to include the WI in the prompt (if applicable)
}

function isSystemName(name)
{
    const ctx = getContext();
    const allCharacters = ctx.characters || [];
    // A system name is any name that does not appear in the ctx.characters array, this is because they aren't a real character.
    return !allCharacters.some(character => character.name === name);
}

function injectStats()
{
    const ctx = getContext();

    if (isSystemName(ctx?.name2)) {
        ctx.setExtensionPrompt("SMARTRPG_STATS", '', injectionSettings.position, injectionSettings.depth, injectionSettings.include_wi);
        return;
    }

    const statBlock = buildGlobalStatLine();

    if (!statBlock.trim()) {
        ctx.setExtensionPrompt("SMARTRPG_STATS", '', injectionSettings.position, injectionSettings.depth, injectionSettings.include_wi);
        return;
    }
    // setExtensionPrompt(EXTENSION_PROMPT_TAG, '', settings.position, settings.depth, settings.include_wi);

    ctx.setExtensionPrompt(
        "SMARTRPG_STATS",     // unique key
        statBlock,
        injectionSettings.position,    // position (0 = top)
        injectionSettings.depth,       // depth
        injectionSettings.include_wi   // scan
    );
}

function getCharactersInChat()
{
    const ctx = getContext();
    if (!ctx) return [];
    const allCharacters = ctx.characters || []; // This is NOT the characters in the chat but every character that has a card, meaning they may or may not be in the chat, this is literally every possible characters character card.
    // Characters in the chat are defined in the ctx by `.chat` specifically that is their messages, so it can contain duplicates, additionally those messages may reference other characters in the chat that have yet to send a message, the final filter is if they have data, if not just assume they aren't in the chat yet. or at least their stats are still default.
    const charactersInChat = new Set();
    if (Array.isArray(ctx.chat)) {
        ctx.chat.forEach(message => {
            if (message?.name) {
                charactersInChat.add(message.name);
            } else if (message?.mes)
            {
                const mesText = message.mes;
                allCharacters.forEach(character => {
                    if (mesText.includes(character.name)) {
                        charactersInChat.add(character.name);
                    }
                });
            }
        });
    }
    return Array.from(charactersInChat);
}

// Stat descriptions appear as:
// [Stat Descriptions]
// ## Stat Name: Stat Description
// ## Stat Name 2: Stat Description2
//
// While this may appear less token efficent its better for understanding.

function buildStatDescriptionText()
{
    const profiles = getProfiles();
    if (profiles.length === 0) return '';
    const descriptions = {};
    profiles.forEach(profile => {
        profile.stats.forEach(stat => {
            if (!descriptions[stat.name.toLowerCase()]) {
                let description = stat.description || '';
                if (description.length === 0)
                {
                    description = 'The purpose of this stat is implied in its name.';
                }
                descriptions[stat.name.toLowerCase()] = description;
            }
        });
    });
    if (Object.keys(descriptions).length === 0) return '';
    const statDescriptions = [];
    for (const statName in descriptions)
    {
        const description = descriptions[statName];
        if (description)
        {
            statDescriptions.push(`## ${statName}: ${description}`); // uses ## to make sure the AI can tell the stat description apart.
        }
    }
    return statDescriptions.join('\n');
}

// Final output appears as:
// [Stat Descriptions]
// ## Stat Name: Stat Description
// ## Stat Name 2: Stat Description2
// [Character1's Stats: Stat1: Value, Stat2: Value]
// [Character2's Stats: Stat1: Value, Stat2: Value]
// [System Behavior]
// - Stats must always influence character actions, dialogue, and outcomes.
// - Higher stats subtly dominate interactions without explicitly referencing numbers.
// - Differences in stats should be reflected through tone, success, hesitation, or failure.
// - Never mention stats or calculations in dialogue or narration.
// The above text is ~142 tokens, it can be more or less, users can reduce token usage by decreasing the length of the stat name and description

function getChatCharacterStatsString()
{
    const characterStats = new Set();
    const charactersInChat = getCharactersInChat();
    charactersInChat.forEach(characterName => {
        const characterProfile = getCharacterData(characterName)?.activeProfile;
        if (!characterProfile) return;

        const profileStats = getProfileByName(characterProfile)?.stats || [];
        if (profileStats.length === 0) return;

        const resolvedStats = profileStats.map(stat => {
            const statData = getCharacterStatForActiveChat(characterName, characterProfile, stat.name);
            const statValue = statData?.value ?? stat.default;

            return `${stat.name}: ${statValue}`;
        });

        if (resolvedStats.length === 0) {
            return;
        }

        const statLine = resolvedStats.join(', ');
        characterStats.add(`[${characterName}'s Stats: ${statLine}]`);
    });
    return characterStats;
}

function buildGlobalStatLine()
{
    const descriptionText = buildStatDescriptionText();
    const charactersInChat = getCharactersInChat();
    const characterStats = getChatCharacterStatsString();
    let characterFormatString = getMessagePrompt()
    characterFormatString = characterFormatString.replace('{{stat_descriptions}}', descriptionText);
    characterFormatString = characterFormatString.replace('{{character_stats}}', Array.from(characterStats).join('\n'));
    return characterFormatString;
}

export { 
    setupChatEventHandler,
    buildStatDescriptionText,
    getCharactersInChat,
    getChatCharacterStatsString
};