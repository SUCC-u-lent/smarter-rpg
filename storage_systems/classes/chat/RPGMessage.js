import { EmbedPosition } from "../../../enums/EmbedPosition.js";
import { getCharacterData, getCharacterIdByName } from "../../CharacterExtensionStorage.js";
import { getMessageAuthor, getMessageFromId, setChatExtensionStorageForMessage } from "../../ChatExtensionStorage.js";
import { getGlobalExtensionStorage } from "../../GlobalExtensionStorage.js";
import { CharacterProfileData } from "../character/CharacterProfileData.js";
import CharacterStatsInstance from "./CharacterStatsInstance.js";
import MessageId from "./MessageId.js";
import StoredMessage from "./StoredMessage.js";

/**
 * SillyTavern messages converted to a class structure for easier handling.
 * Aka the in-memory message.
 */
export default class RPGMessage 
{
    author;
    container;
    messageElement;
    messageIndex;
    characterId;
    charData;
    /** @type{CharacterStatsInstance} */
    stats;
    /**
     * @param {string} chatId
     * @param {number} messageIndex
     * @param {HTMLElement} messageElement
     */
    constructor(chatId,messageIndex,messageElement)
    {
        const author = getMessageAuthor($(messageElement));
        if (!author) throw new Error("Could not determine author of message, skipping RPGMessage creation");
        this.author = author;
        const container = this.#getEmbedContainer(messageElement);
        if (!container) throw new Error("Could not find container for message, skipping RPGMessage creation");
        this.container = container;
        this.messageElement = messageElement;
        this.messageIndex = messageIndex;
        this.chatId = chatId;
        const characterId = getCharacterIdByName(this.author)
        if (!characterId) throw new Error(`Could not find character ID for author ${this.author}`);
        this.characterId = characterId;
        this.charData = getCharacterData(characterId) || new CharacterProfileData(characterId, null);
        const storedMessage = getMessageFromId(chatId, this.getMessageId());
        const defaultStats = this.charData.getActiveProfile()?.getStats() || [];
        this.stats = storedMessage ? storedMessage.getStats() : CharacterStatsInstance.fromDefaultStats(defaultStats);
    }
    /**
     * @param {HTMLElement} messageElement
     */
    #getEmbedContainer(messageElement){
        const embedPosition = getGlobalExtensionStorage().getConfig().getEmbedPosition();
        const jQueryMessage = $(messageElement)
        let container;
        if (embedPosition === EmbedPosition.BELOW_MESSAGE)
        {
            container = jQueryMessage.find(".mes_block").first()
        } else {
            container = jQueryMessage.find(".mesAvatarWrapper").first()
        }
        if (container.length === 0) return null; // If we can't find the container, we skip this message since we won't have anywhere to put the embeds.
        return container;
    }
    /** 
     * @param {string} chatId 
     * @param {HTMLElement[]} messageList  
     * @returns {RPGMessage[]}
    */
    static fromMessageList(chatId,messageList)
    {
        /** @type {RPGMessage[]} */
        const rpgMessages = []
        messageList.forEach((message, index) => {
            const rpgMessage = new RPGMessage(chatId, index, message)
            if (rpgMessage.author && rpgMessage.container) // Only add messages we can determine the author of and find the container for.
            {
                rpgMessages.push(rpgMessage)
            }
        });
        return rpgMessages;
    }
    /**
     * This function returns both the stats stored in the message as well as the default stats from the character's active profile, with the message stats taking precedence over the default stats.
     * @returns {CharacterStatsInstance}
     */
    getStats()
    {
        const defaultStats = this.charData.getActiveProfile()?.getStats() || [];
        const messageStats = this.stats || CharacterStatsInstance.fromDefaultStats(defaultStats);
        defaultStats.forEach(stat => {
            if (!messageStats.hasStat(stat.getName())) {
                messageStats.setStat(stat.getName(), stat.getDefaultValue());
            }
        });
        return messageStats || CharacterStatsInstance.fromDefaultStats(defaultStats);
    }
    getMessageId(){
        const rawMessageIndex = $(this.messageElement).attr("mesid");
        const parsedMessageIndex = rawMessageIndex ? parseInt(rawMessageIndex, 10) : NaN;
        const messageIndex = Number.isNaN(parsedMessageIndex) ? this.messageIndex : parsedMessageIndex;

        const rawSwipeIndex = $(this.messageElement).attr("swipeid");
        const parsedSwipeIndex = rawSwipeIndex ? parseInt(rawSwipeIndex, 10) : NaN;
        const swipeIndex = Number.isNaN(parsedSwipeIndex) ? 0 : parsedSwipeIndex;

        return new MessageId(messageIndex, swipeIndex);
    }
    /** 
     * @param {string} chatId
     * @returns {StoredMessage} */
    parseMessage(chatId)
    {
        const storedMessage = new StoredMessage();
        storedMessage.setChatId(chatId);
        storedMessage.setMessageId(this.getMessageId());
        return storedMessage;
    }
    /**
     * @param {CharacterStatsInstance} stats
     */
    setStats(stats)
    {
        this.stats = stats;
    }
    save()
    {
        const storedMessage = this.parseMessage(this.charData.getId());
        storedMessage.setStats(this.stats);
        setChatExtensionStorageForMessage(this.chatId,storedMessage);
    }

}