import SillyTavernClassBase from "../SillyTavernClassBase.js";

class MessageId extends SillyTavernClassBase {
    static get fieldSchema()
    {
        return {
            messageIndex: { default: 0, hydrate: (/** @type {any} */ value) => typeof value === "number" ? value : 0 },
            swipeIndex: { default: 0, hydrate: (/** @type {any} */ value) => typeof value === "number" ? value : 0 },
        };
    }

    /** @param {number|undefined} messageIndex @param {number|undefined} swipeIndex */
    constructor(messageIndex, swipeIndex) {
        super();
        if (messageIndex !== undefined) this._setField("messageIndex", messageIndex);
        if (swipeIndex !== undefined) this._setField("swipeIndex", swipeIndex);
    }
    getMessageIndex() {
        return this._getField("messageIndex");
    }
    getSwipeIndex() {
        return this._getField("swipeIndex");
    }
    /** @param {JQuery<HTMLElement>} message */
    static fromMessage(message)
    {
        // Message ID stored in attribute "mesid" and swipe index stored in attribute "swipeid"
        const mesId = message.attr("mesid");
        const swipeId = message.attr("swipeid");
        if (!mesId || !swipeId) throw new Error("Message is missing mesid or swipeid attribute");
        return new MessageId(parseInt(mesId), parseInt(swipeId));
    }
}

export default MessageId;