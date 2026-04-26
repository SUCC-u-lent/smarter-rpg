import ChatStorage from "../storage/ChatStorage.js";
import ExtensionStorage from "../storage/ExtensionStorage.js";
import { getMessageIdFromElement, getNMessagesBefore, getSlashIdFromElement } from "../utilities/MessageUtilities.js";
import GlobalCharacter from "./global_character.js";

export default class ChatMessageData
{
    /** @type {string} */
    #author;
    /** @type {number} */
    #messageId;
    /** @type {number} */
    #slashId;
    /** @type {Object<string, number|string>} */
    #stats;
    constructor(author, messageId, slashId, stats)
    {
        this.#author = author;
        this.#messageId = messageId;
        this.#slashId = slashId;
        this.#stats = stats;
    }

    static getMessageId(author, mesid, slashId)
    {
        return `${author}-${mesid}-${slashId}`;
    }

    /** @param {JQuery<HTMLElement>} messageElement  */
    static getMessageAuthor(messageElement)
    {
        const userElement = messageElement.find(".name_text")
        return userElement.text().trim() || "Unknown";
    }

    static setStatsToMessage(messageElement, stats)
    {
        const author = ChatMessageData.getMessageAuthor(messageElement);
        const mesId = getMessageIdFromElement(messageElement) || 0;
        const slashId = getSlashIdFromElement(messageElement) || 0;
        const messageData = new ChatMessageData(author, mesId, slashId, stats);
        messageData.save();
    }

    /**
     * @param {JQuery<HTMLElement>} messageElement 
     * @param {Object<string, number>} stats 
     */
    static addStatsToMessage(messageElement, stats)
    {
        const existingData = ChatMessageData.convertFromMessage(messageElement);
        const existingStats = existingData.getStats() || {};
        for (const [statName, statValue] of Object.entries(stats))
        {
            if (existingStats[statName] && typeof existingStats[statName] === "number" && typeof statValue === "number")
            {
                existingStats[statName] = (existingStats[statName] || 0) + statValue;
            }
            else
            {
                existingStats[statName] = statValue;
            }
        }
        ChatMessageData.setStatsToMessage(messageElement, existingStats);
    }

    static canConvertMessage(messageElement)
    {
        try {
            ChatMessageData.convertFromMessage(messageElement);
            return true;
        } catch (e) {
            return false;
        }
    }

    /** @param {JQuery<HTMLElement>} message  */
    static convertFromMessage(message)
    {
        const author = ChatMessageData.getMessageAuthor(message);
        const messId = getMessageIdFromElement(message) || (()=> { throw new Error("Message ID not found on message element"); })();
        const slashId = getSlashIdFromElement(message) || 0;
        const existingData = ChatStorage.get(ChatMessageData.getMessageId(author, messId, slashId), {}) || {};
        const stats = existingData.stats || {};

        return new ChatMessageData(author, messId, slashId, stats);
    }
    static deleteMessageData(message)
    {
        const author = ChatMessageData.getMessageAuthor(message);
        const messId = getMessageIdFromElement(message) || (()=> { throw new Error("Message ID not found on message element"); })();
        const slashId = getSlashIdFromElement(message) || 0;
        ChatStorage.delete(ChatMessageData.getMessageId(author, messId, slashId));
    }
    
    toObject()
    {
        return {
            author: this.#author || "",
            messageId: this.#messageId || 0,
            slashId: this.#slashId || 0,
            stats: this.#stats || {}
        }
    }

    save()
    {
        ChatStorage.set(ChatMessageData.getMessageId(this.#author, this.#messageId, this.#slashId), this.toObject());
    }
    setStat(statName, statValue)
    {
        this.#stats[statName] = statValue;
        return this;
    }
    verifyStats()
    {
        if (!GlobalCharacter.isValidName(this.#author))
        {
            this.#stats = {};
            return;
        }
        // Removes any stat that does now show up in the characters active profile.
        const character = GlobalCharacter.getByName(this.#author);
        if (!character)
        {
            this.#stats = {};
            return;
        }
        const activeProfile = character.getActiveProfileData();
        if (!activeProfile) {
            this.#stats = {};
            return;
        }
        const validStatNames = activeProfile.getStats().map(s => s.getName());
        for (const statName of Object.keys(this.#stats))
        {
            if (!validStatNames.includes(statName))
            {
                delete this.#stats[statName];
            }
        }
    }
    /** @param {Object<string, number|string>} stats */
    setStats(stats)
    {
        this.#stats = stats;
        return this;
    }

    getMessageId()
    {
        return this.#messageId || 0;
    }
    getSlashId()
    {
        return this.#slashId || 0;
    }
    getStats()
    {
        return this.#stats || {};
    }

    static getMessagesBefore(message)
    {
        const previousMessages = getNMessagesBefore(message, ExtensionStorage.get("history_message_count", ExtensionStorage.Defaults.history_message_count));
        return previousMessages.map(m => ChatMessageData.convertFromMessage(m));
    }
    static getAllMessages()
    {
        const allMessages = ChatStorage.getAll();
        return Object.values(allMessages).map(m => {
            const data = ChatStorage.get(ChatMessageData.getMessageId(m.author, m.messageId, m.slashId), {}) || {};
            return new ChatMessageData(m.author, m.messageId, m.slashId, data.stats || {});
        });
    }

    /**
     * @param {JQuery<HTMLElement> | null} beforeMessage 
     * @returns {Object<string,Object<string,string|number>>} Returns an object where the keys are character names and the values are objects of statName: statValue pairs representing the latest stats for each character up to the specified message. If beforeMessage is null, it returns the latest stats for all characters in the chat history.
     */
    static getCurrentChatStats(beforeMessage = null)
    { // When getting the current stats its the latest per character, aka if the character has 100 HP at the start and their latest message they have 10 HP, then the final value will be 10.
        const messages = beforeMessage ? ChatMessageData.getMessagesBefore(beforeMessage) : ChatMessageData.getAllMessages();
        const aggregatedStats = {};
        for (const messageData of messages)
        {
            aggregatedStats[messageData.#author] = aggregatedStats[messageData.#author] || {};
            messageData.verifyStats();
            const stats = messageData.getStats() || {};
            for (const [statName, statValue] of Object.entries(stats))
            { aggregatedStats[messageData.#author][statName] = statValue; }
        }
        return aggregatedStats;
    }
}