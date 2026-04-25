function getAuthorFromMessage(messageElement)
{
    const authorElement = messageElement.find(".name_text");
    return authorElement.text().trim();
}

function getMessageContent(messageElement)
{
    const contentElement = messageElement.find(".mes_text").first().clone();
    contentElement.find(".stats-breakline, .stats-container").remove();
    return contentElement.text().trim();
}

function getMessageBefore(messageElement)
{
    const previousMessage = messageElement.prev(".mes");
    if (previousMessage.length > 0) {
        return previousMessage;
    }
    return null;
}
function getMessageAfter(messageElement)
{
    const nextMessage = messageElement.next(".mes");
    if (nextMessage.length > 0) {
        return nextMessage;
    }
    return null;
}
function getMessageBeforeLast(n)
{
    let message = getLastMessage();
    for (let i = 0; i < n; i++)
    {
        message = getMessageBefore(message);
        if (!message) {return null}
    }
    return message;
}
function getMessageBeforeN(messageElement, n)
{
    let currentMessage = messageElement;
    for (let i = 0; i < n; i++) {
        currentMessage = getMessageBefore(currentMessage);
        if (!currentMessage) {
            return null;
        }
    }
    return currentMessage;
}
function getMessageAfterN(messageElement, n)
{
    let currentMessage = messageElement;
    for (let i = 0; i < n; i++) {
        currentMessage = getMessageAfter(currentMessage);
        if (!currentMessage) {
            return null;
        }
    }
    return currentMessage;
}

function getFirstMessage()
{
    const firstMessage = $(".mes").first();
    if (firstMessage.length > 0) {
        return firstMessage;
    }
    return null;
}

function getLastMessage()
{
    const lastMessage = $(".mes").last();
    if (lastMessage.length > 0) {
        return lastMessage;
    }
    return null;
}
/** @returns {JQuery<HTMLElement>[]} */
function getNMessagesBefore(messageElement, n, includeCurrent = false)
{
    const messages = [];
    let currentMessage = messageElement;
    if (includeCurrent) {
        messages.push(currentMessage);
    }
    for (let i = 0; i < n; i++) {
        currentMessage = getMessageBefore(currentMessage);
        if (!currentMessage) {
            break;
        }
        messages.push(currentMessage);
    }
    return messages;
}

function getMessageIdFromElement(messageElement)
{
    const allMessages = $(".mes");
    for (let i = 0; i < allMessages.length; i++)
    {
        if (allMessages[i] === messageElement[0]){
            return i;
        }
    }
    return null;
}
function getSlashIdFromElement(messageElement)
{
    // messages generally appear as: `<div class="mes last_mes last_swipe" mesid="8" ch_name="Nyx" is_user="false" is_system="false" bookmark_link="" swipeid="0" force_avatar="false" timestamp="April 20, 2026 8:42 PM" type="">`
    // Slash id is clearly shown under "swipeid", but it doesn't always exist, so we will return 0 if it's not found.
    const swipeId = messageElement.attr("swipeid");
    if (swipeId === undefined) {
        return 0;
    }
    return parseInt(swipeId);
}

export {
    getAuthorFromMessage,
    getMessageContent,
    getMessageBefore,
    getMessageAfter,
    getMessageBeforeN,
    getMessageAfterN,
    getFirstMessage,
    getLastMessage,
    getNMessagesBefore,
    getMessageBeforeLast,
    getMessageIdFromElement,
    getSlashIdFromElement
}