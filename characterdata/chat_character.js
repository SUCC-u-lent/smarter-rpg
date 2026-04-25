import { characters } from "../../../../../script.js";
import { power_user } from "../../../../power-user.js";
import CharacterStorage from "../storage/CharacterStorage.js";
import ChatStorage from "../storage/ChatStorage.js";
import { getPersonaList } from "../utilities/ExtensionUtilities.js";
import GlobalCharacter from "./global_character.js";
import ChatMessageData from "./message_data.js";

/** The chat character class, a variant of the global character class focused on the chat state, e.g their message log. */
export default class ChatCharacter extends GlobalCharacter
{
    /** @type {ChatMessageData[]} */
    #message_log;
    constructor(name, description, personality, scenario, first_mes, mes_example, creatorcomment, tags, talkativeness, fav, create_date, data, chat, avatar, json_data, shallow, active_profile, message_log)
    {
        super(name, description, personality, scenario, first_mes, mes_example, creatorcomment, tags, talkativeness, fav, create_date, data, chat, avatar, json_data, shallow, active_profile);
        this.#message_log = message_log;
    }
    
    static getCharacters()
    {
        /** @type {ChatCharacter[]} */
        const chars = []
        characters.forEach(char=>{
            const globalCharStored = ChatStorage.get(this.getEntityId(), {}) || {}
            const globalChar = new ChatCharacter(
                char.name,
                char.description,
                char.personality,
                char.scenario,
                char.first_mes,
                char.mes_example,
                char.creatorcomment,
                char.tags,
                char.talkativeness,
                char.fav,
                char.create_date,
                char.data,
                char.chat,
                char.avatar,
                char.json_data,
                char.shallow,
                globalCharStored.active_profile || null,
                (globalCharStored.message_log || []).map(m => new ChatMessageData(m.author, m.messageId, m.slashId, m.stats))
            )
            chars.push(globalChar);
        })
        return chars;
    }
    static getPersonas()
    {
        /** @type {ChatCharacter[]} */
        const chars = [];
        getPersonaList().forEach(char => {
            const globalCharStored = ChatStorage.get(this.getEntityId(), {}) || {}
            
            const globalChar = new ChatCharacter(
                char.name || (()=>{throw new Error("Persona is missing a name")})(),
                char.description || "",
                char.personality || "",
                char.scenario || "",
                char.first_mes || "",
                char.mes_example || "",
                char.creatorcomment || "",
                char.tags || [],
                char.talkativeness || 0,
                char.fav || false,
                char.create_date || "",
                char.data || {},
                char.chat || {},
                char.avatar || "",
                char.json_data || {},
                char.shallow || false,
                globalCharStored.active_profile || null,
                (globalCharStored.message_log || []).map(m => new ChatMessageData(m.author, m.messageId, m.slashId, m.stats))
            )
            chars.push(globalChar);
        });
        return chars;
    }

    static getAllCharacters()
    {
        return [...this.getCharacters(), ...this.getPersonas()];
    }
    static getCharacterByName(name)
    {
        const char = this.getCharacters().find(c=>c.name === name);
        if(!char) throw new Error(`Character with name "${name}" not found`);
        return char;
    }
    static getCharacterByAvatar(avatar)
    {
        const char = this.getCharacters().find(c=>c.avatar === avatar);
        if(!char) throw new Error(`Character with avatar "${avatar}" not found`);
        return char;
    }
    static getPersonaByName(name)
    {
        const char = this.getPersonas().find(c=>c.name === name);
        if(!char) throw new Error(`Persona with name "${name}" not found`);
        return char;
    }
    static getPersonaByAvatar(avatar)
    {
        const char = this.getPersonas().find(c=>c.avatar === avatar);
        if(!char) throw new Error(`Persona with avatar "${avatar}" not found`);
        return char;
    }
    static getByName(name)
    {
        const char = this.getAllCharacters().find(c=>c.name === name);
        if(!char) throw new Error(`Character or Persona with name "${name}" not found`);
        return char;
    }
    static getByAvatar(avatar)    {
        const char = this.getAllCharacters().find(c=>c.avatar === avatar);
        if(!char) throw new Error(`Character or Persona with avatar "${avatar}" not found`);
        return char;
    }

    toObject()
    {
        return {
            name: this.getName(),
            description: this.description,
            personality: this.personality,
            scenario: this.scenario,
            first_mes: this.first_mes,
            mes_example: this.mes_example,
            creatorcomment: this.creatorcomment,
            tags: this.tags,
            talkativeness: this.talkativeness,
            fav: this.fav,
            create_date: this.create_date,
            data: this.data,
            chat: this.chat,
            avatar: this.avatar,
            json_data: this.json_data,
            shallow: this.shallow,
            active_profile: this.#active_profile,
            message_log: this.#message_log.map(m=>m.toObject())
        }
    }

    save()
    {
        ChatStorage.set(this.getEntityId(), this.toObject());
    }

}