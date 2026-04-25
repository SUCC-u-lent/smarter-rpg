import BaseCharacter from "./base_character.js";
import { characters } from "../../../../../script.js";
import { power_user } from "../../../../power-user.js";
import CharacterStorage from "../storage/CharacterStorage.js";
import { getPersonaList, getProfileByName } from "../utilities/ExtensionUtilities.js";

/** The global character class, a variant of the base character class focused on the global state, e.g their active profile. */
export default class GlobalCharacter extends BaseCharacter
{
    #active_profile;
    constructor(name, description, personality, scenario, first_mes, mes_example, creatorcomment, tags, talkativeness, fav, create_date, data, chat, avatar, json_data, shallow, active_profile)
    {
        super(name, description, personality, scenario, first_mes, mes_example, creatorcomment, tags, talkativeness, fav, create_date, data, chat, avatar, json_data, shallow);
        this.#active_profile = active_profile;
    }
    
    static getCharacters()
    {
        /** @type {GlobalCharacter[]} */
        const chars = []
        characters.forEach(char=>{
            const globalCharStored = CharacterStorage.get(BaseCharacter.getEntityId(char), {}) || {}
            const globalChar = new GlobalCharacter(
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
                globalCharStored.active_profile || null
            )
            chars.push(globalChar);
        })
        return chars;
    }
    static getPersonas()
    {
        /** @type {GlobalCharacter[]} */
        const chars = [];
        getPersonaList().forEach(char => {
            const globalCharStored = CharacterStorage.get(BaseCharacter.getEntityId(char), {}) || {}
            
            const globalChar = new GlobalCharacter(
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
                globalCharStored.active_profile || null
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
        const char = this.getPersonas().find(c=>c.getName() === name);
        if(!char) throw new Error(`Persona with name "${name}" not found`);
        return char;
    }
    static getPersonaByAvatar(avatar)
    {
        const char = this.getPersonas().find(c=>c.getAvatar() === avatar);
        if(!char) throw new Error(`Persona with avatar "${avatar}" not found`);
        return char;
    }
    static getByName(name)
    {
        const char = this.getAllCharacters().find(c=>c.getName() === name);
        if(!char) throw new Error(`Character or Persona with name "${name}" not found`);
        return char;
    }
    static getByAvatar(avatar)    {
        const char = this.getAllCharacters().find(c=>c.getAvatar() === avatar);
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
            active_profile: this.#active_profile
        }
    }

    save()
    {
        CharacterStorage.set(BaseCharacter.getEntityId(this), this.toObject());
    }

    /** @param {string} profile */
    setActiveProfile(profile)
    {
        this.#active_profile = profile;
        return this;
    }
    /** @returns {string|null} */
    getActiveProfile()
    {
        return this.#active_profile;
    }
    getActiveProfileData()
    {
        const activeProfileName = this.getActiveProfile();
        if (!activeProfileName) {return undefined}
        return getProfileByName(activeProfileName);
    }

}