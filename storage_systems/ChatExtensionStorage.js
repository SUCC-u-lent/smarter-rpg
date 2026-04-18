import { saveSettingsDebounced } from "../../../../../script.js";
import { extension_settings } from "../../../../extensions.js";
import { getExtensionName } from "../utilities/constants.js";
import { getCurrentChat } from "../utilities/SillyTavernInterpreter.js";
import { isValidCharacterName } from "./CharacterExtensionStorage.js";
import MessageId from "./classes/chat/MessageId.js";
import StoredMessage from "./classes/chat/StoredMessage.js";

function getCurrentChatID()
{
    const currentChat = getCurrentChat()
    const id = currentChat ? currentChat.chatId : null;
    if (!id) throw new Error("Could not determine current chat ID");
    return id;
}

function getCurrentChatExtensionStorage()
{
    const chatId = getCurrentChatID();
    return getChatExtensionStorage(chatId);
}

/**
 * @param {StoredMessage[]} storage
 */
function setCurrentChatExtensionStorage(storage){
    const chatId = getCurrentChatID();
    setChatExtensionStorage(chatId, storage);
}

/**
 * @param {string} chatId
 * @returns {StoredMessage[]} 
 */
function getChatExtensionStorage(chatId)
{
    const extensionName = getExtensionName();
    // @ts-ignore
    const extensionSettings = extension_settings[extensionName] || {}
    const allChatExtensionSettings = extensionSettings["chat"] || {};
    const chatExtensionSettings = allChatExtensionSettings[chatId] || [];
    if (chatExtensionSettings instanceof Array && chatExtensionSettings.every(item => item instanceof StoredMessage))
    {
        return chatExtensionSettings;
    }

    const hydratedStorage = StoredMessage.fromJSON(chatExtensionSettings);
    if (hydratedStorage instanceof Array && hydratedStorage.every(item => item instanceof StoredMessage))
    {
        setChatExtensionStorage(chatId, hydratedStorage);
        return hydratedStorage;
    }
    return [];
}

/**
 * @param {string} chatId
 * @param {StoredMessage[]} storage
 */
function setChatExtensionStorage(chatId, storage)
{
    const extensionName = getExtensionName();
    // @ts-ignore
    const extensionSettings = extension_settings[extensionName] || {}
    const allChatExtensionSettings = extensionSettings["chat"] || {};
    allChatExtensionSettings[chatId] = storage;
    extensionSettings["chat"] = allChatExtensionSettings;
    // @ts-ignore
    extension_settings[extensionName] = extensionSettings;
    saveSettingsDebounced(); // Required or SillyTavern won't recognize the changes
}

/**
 * 
 * @param {string} chatId 
 * @param {MessageId} messageId 
 */
function getMessageFromId(chatId, messageId)
{
    const chatStorage = getChatExtensionStorage(chatId);
    return chatStorage.find(message => message.getMessageId().equals(messageId)) || new StoredMessage();
}

/** @param {JQuery<HTMLElement>} message  */
function getMessageAuthor(message)
{
    const rawName = $(message).find(".name_text").first().text().trim();
    if (!rawName) return null;
    if (!isValidCharacterName(rawName)) return null;
    return rawName;
}

export { 
    getCurrentChatExtensionStorage, 
    setCurrentChatExtensionStorage, 
    getChatExtensionStorage, 
    setChatExtensionStorage,
    getMessageAuthor,
    getMessageFromId
}