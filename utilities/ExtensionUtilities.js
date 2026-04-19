import { getCurrentChatId } from "../../../../../script.js";
import { getChatExtensionStorage, setChatExtensionStorage } from "../storage_systems/ChatExtensionStorage.js";
import MessageId from "../storage_systems/classes/chat/MessageId.js";
import { getExtensionFolderPath } from "./constants.js";

/**
 * @param {string} localPath The path to the html file relative to the extension's html folder. For example, if the file is located at "smarter-rpg/html/ui/character.html", the localPath should be "ui/character.html".
 * @returns {Promise<JQuery<HTMLElement>>} A promise that resolves to a jQuery object containing the loaded HTML.
 */
async function getJQueryHtml(localPath)
{
    return $(await $.get(`${getExtensionFolderPath()}/html/${localPath}`));
}

/**
 * @param {JQuery<HTMLElement> | null} parentElement 
 * @param {any} selector
 * @param {number} timeout
 * @returns {Promise<JQuery<HTMLElement>>} A promise that resolves to a jQuery object containing the found HTML element.
 */
async function awaitHtmlElement(parentElement,selector, timeout = 10000)
{
    let element;
    if (parentElement) {
        element = parentElement.find(selector);
    } else {
        element = $(selector);
    }
    if (element.length > 0) { return Promise.resolve(element); }
    const startTime = Date.now();
    return new Promise((resolve, reject) => {
        const checkExist = setInterval(() => {
            let element;
            if (parentElement) {
                element = parentElement.find(selector);
            } else {
                element = $(selector);
            }
            if (element.length > 0) {
                clearInterval(checkExist);
                resolve(element);
            } else if (Date.now() - startTime > timeout) {
                clearInterval(checkExist);
                reject(new Error(`Element with selector "${selector}" not found within ${timeout}ms`));
            }
        }, 100);
    });
}

/**
 * @param {MessageId} messageId 
 */
function isMessageProcessed(messageId)
{
    /** @type {string|undefined|null} */
    const currentChatId = getCurrentChatId();
    if (!currentChatId) throw new Error("Could not determine current chat ID");
    const currentChatStorage = getChatExtensionStorage(currentChatId)
    const messageStorage = currentChatStorage.filter(m=>m.getMessageId()!=null&&m.getMessageId()!=undefined).find(m => m.getMessageId().equals(messageId));
    return messageStorage ? messageStorage.isProcessed() : false;
}

/**
 * @param {MessageId} messageId 
 */
function clearMessageProcessing(messageId){
    /** @type {string|undefined|null} */
    const currentChatId = getCurrentChatId();
    if (!currentChatId) throw new Error("Could not determine current chat ID");
    const currentChatStorage = getChatExtensionStorage(currentChatId)
    // to clear the message processing, delete it from storage.
    const newChatStorage = currentChatStorage.filter(m=>m.getMessageId()==null||m.getMessageId()==undefined||!m.getMessageId().equals(messageId));
    setChatExtensionStorage(currentChatId, newChatStorage);
}


export { getJQueryHtml, awaitHtmlElement, isMessageProcessed, clearMessageProcessing }