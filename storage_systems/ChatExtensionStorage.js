import { saveSettingsDebounced } from "../../../../../script.js";
import { extension_settings } from "../../../../extensions.js";
import { getExtensionName } from "../utilities/constants.js";
import { isValidCharacterName } from "./CharacterExtensionStorage.js";
import MessageId from "./classes/chat/MessageId.js";
import StoredMessage from "./classes/chat/StoredMessage.js";

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
 * @param {string} chatId
 * @param {StoredMessage} message
 */
function setChatExtensionStorageForMessage(chatId, message)
{
    const chatStorage = getChatExtensionStorage(chatId);
    const messageId = message.getMessageId();
    const existingMessageIndex = chatStorage.filter(m=>m.getMessageId() != null && m.getMessageId() != undefined)
        .findIndex(m => areMessageIdsEqual(m.getMessageId(), messageId));
    if (existingMessageIndex !== -1)    {
        chatStorage[existingMessageIndex] = message;
    }
    else {
        const fallbackMessageIndex = chatStorage.filter(m=>m.getMessageId() != null && m.getMessageId() != undefined)
            .findIndex(m => areMessageIndexEqual(m.getMessageId(), messageId));
        if (fallbackMessageIndex !== -1) {
            chatStorage[fallbackMessageIndex] = message;
        } else {
            chatStorage.push(message);
        }
    }
    setChatExtensionStorage(chatId, chatStorage);
}

/**
 * 
 * @param {string} chatId 
 * @param {MessageId} messageId 
 */
function getMessageFromId(chatId, messageId)
{
    const chatStorage = getChatExtensionStorage(chatId);
    const exactMatch = chatStorage.find(message => areMessageIdsEqual(message.getMessageId(), messageId));
    if (exactMatch) return exactMatch;

    const fallbackMatches = chatStorage.filter(message => areMessageIndexEqual(message.getMessageId(), messageId));
    if (fallbackMatches.length > 0) {
        return fallbackMatches[fallbackMatches.length - 1];
    }

    return new StoredMessage();
}

/**
 * @param {unknown} left
 * @param {unknown} right
 */
function areMessageIdsEqual(left, right)
{
    if (!left || !right || typeof left !== "object" || typeof right !== "object") return false;

    // @ts-ignore
    if (typeof left.equals === "function") return left.equals(right);
    // @ts-ignore
    if (typeof right.equals === "function") return right.equals(left);

    // @ts-ignore
    const leftMessageIndex = typeof left.getMessageIndex === "function" ? left.getMessageIndex() : left.messageIndex;
    // @ts-ignore
    const leftSwipeIndex = typeof left.getSwipeIndex === "function" ? left.getSwipeIndex() : left.swipeIndex;
    // @ts-ignore
    const rightMessageIndex = typeof right.getMessageIndex === "function" ? right.getMessageIndex() : right.messageIndex;
    // @ts-ignore
    const rightSwipeIndex = typeof right.getSwipeIndex === "function" ? right.getSwipeIndex() : right.swipeIndex;
    return leftMessageIndex === rightMessageIndex && leftSwipeIndex === rightSwipeIndex;
}

/**
 * @param {unknown} left
 * @param {unknown} right
 */
function areMessageIndexEqual(left, right)
{
    if (!left || !right || typeof left !== "object" || typeof right !== "object") return false;
    // @ts-ignore
    const leftMessageIndex = typeof left.getMessageIndex === "function" ? left.getMessageIndex() : left.messageIndex;
    // @ts-ignore
    const rightMessageIndex = typeof right.getMessageIndex === "function" ? right.getMessageIndex() : right.messageIndex;
    return leftMessageIndex === rightMessageIndex;
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
    getChatExtensionStorage, 
    setChatExtensionStorage,
    getMessageAuthor,
    getMessageFromId,
    setChatExtensionStorageForMessage
}