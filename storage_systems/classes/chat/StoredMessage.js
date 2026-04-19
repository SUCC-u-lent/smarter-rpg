import SillyTavernClassBase from "../SillyTavernClassBase.js";
import CharacterStatsInstance from "./CharacterStatsInstance.js";
import MessageId from "./MessageId.js";

/**
 * Message stored in the storage.
 * @typedef {Object} StoredMessageData
 * @prop {string} chatId
 * @prop {MessageId} message
 * @prop {CharacterStatsInstance} stats
 */
export default class StoredMessage extends SillyTavernClassBase {
    static get fieldSchema()
    {
        return {
            chatId: { default: "", hydrate: (/** @type {any} */ value) => typeof value === "string" ? value : "" },
            message: { type: MessageId, default: () => new MessageId(undefined,undefined) },
            stats: { type: CharacterStatsInstance, default: () => new CharacterStatsInstance(undefined) },
        };
    }

    /** @returns {string} Returns the chat ID. */
    getChatId() {
        return this._getField("chatId");
    }
    /** @returns {MessageId} Returns the message ID. */
    getMessage() {
        return this._getField("message");
    }
    getMessageId()
    {
        return this._getField("message");
    }
    /** @returns {CharacterStatsInstance} Returns the character stats instance. */
    getStats() {
        return this._getField("stats");
    }
    /** @param {string} chatId */
    setChatId(chatId)
    {
        this._setField("chatId", chatId);
    }
    /** @param {MessageId} messageId */
    setMessageId(messageId)
    {
        this._setField("message", messageId);
    }
    /** @param {CharacterStatsInstance} stats */
    setStats(stats)
    {
        this._setField("stats", stats);
    }
    isProcessed()
    {
        return true; // For now assume if it exists then its been processed.
    }
}