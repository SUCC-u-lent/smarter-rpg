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

export { getJQueryHtml, awaitHtmlElement }