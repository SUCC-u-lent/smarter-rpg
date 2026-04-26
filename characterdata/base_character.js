import { characters } from "../../../../../script.js";
import { power_user } from "../../../../power-user.js";
import { getPersonaList } from "../utilities/ExtensionUtilities.js";

/** The base character class, basically a javascript version of the character data structure */
export default class BaseCharacter
{
    #name;
    #description;
    #personality;
    #scenario;
    #first_mes;
    #mes_example;
    #creatorcomment;
    #tags;
    #talkativeness;
    #fav;
    #create_date;
    #data;
    #chat;
    #avatar;
    #json_data;
    #shallow;
    constructor(name, description, personality, scenario, first_mes, mes_example, creatorcomment, tags, talkativeness, fav, create_date, data, chat, avatar, json_data, shallow)
    {
        this.#name = name;
        this.#description = description;
        this.#personality = personality;
        this.#scenario = scenario;
        this.#first_mes = first_mes;
        this.#mes_example = mes_example;
        this.#creatorcomment = creatorcomment;
        this.#tags = tags;
        this.#talkativeness = talkativeness;
        this.#fav = fav;
        this.#create_date = create_date;
        this.#data = data;
        this.#chat = chat;
        this.#avatar = avatar;
        this.#json_data = json_data;
        this.#shallow = shallow;
    }

    /** @returns {string} */
    static getEntityId(charData)
    { // Use the avatar as the ID as the developers of SillyTavern have stated that the avatar works as the unique identifier.
        if (!charData) throw new Error("Character data is required to get an entity ID");
        const avatar = typeof charData.getAvatar === 'function' ? charData.getAvatar() : charData.avatar;
        const name = typeof charData.getName === 'function' ? charData.getName() : charData.name;
        if (avatar) return avatar;
        if (name) return name; // Fall back to name if avatar is missing, but this is not ideal as names are not guaranteed to be unique.
        throw new Error("Character data must have an avatar to be used as an entity."+JSON.stringify(charData));
    }

    static getCharacters()
    {
        return characters.map(char=>new BaseCharacter(
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
            char.shallow
        ));
    }
    /** @returns {BaseCharacter[]} */
    static getPersonas()
    {
        return getPersonaList().map(char=>new BaseCharacter(
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
            char.shallow || false
        ));
    }

    static getAllCharacters()
    {
        return [...this.getCharacters(), ...this.getPersonas()];
    }
    static isNameMatching(value,name, inverted=false)
    {
        if (inverted)
        {
            const regex = new RegExp(`(${value})`,"gim");
            return regex.test(name);
        }
        const regex = new RegExp(`(${name})`,"gim")
        return regex.test(value);
    }
    static getCharacterByName(name)
    {
        const char = this.getCharacters().find(c=>BaseCharacter.isNameMatching(c.getName(), name));
        if(!char) throw new Error(`Character with name "${name}" not found`);
        return char;
    }
    static getCharacterByAvatar(avatar)
    {
        const char = this.getCharacters().find(c=>BaseCharacter.isNameMatching(c.getAvatar(), avatar));
        if(!char) throw new Error(`Character with avatar "${avatar}" not found`);
        return char;
    }
    static getPersonaByName(name)
    {
        const char = this.getPersonas().find(c=>BaseCharacter.isNameMatching(c.getName(), name));
        if(!char) throw new Error(`Persona with name "${name}" not found`);
        return char;
    }
    static getPersonaByAvatar(avatar)
    {
        const char = this.getPersonas().find(c=>BaseCharacter.isNameMatching(c.getAvatar(), avatar));
        if(!char) throw new Error(`Persona with avatar "${avatar}" not found`);
        return char;
    }
    static getByName(name)
    {
        const char = this.getAllCharacters().find(c=>BaseCharacter.isNameMatching(c.getName(), name));
        if(!char) throw new Error(`Character or Persona with name "${name}" not found`);
        return char;
    }
    static getByAvatar(avatar)    {
        const char = this.getAllCharacters().find(c=>BaseCharacter.isNameMatching(c.getAvatar(),avatar));
        if(!char) throw new Error(`Character or Persona with avatar "${avatar}" not found`);
        return char;
    }
    static isValidName(name)
    {
        const char = this.getAllCharacters().find(c=>BaseCharacter.isNameMatching(c.getName(), name));
        return !!char;
    }
    /** @type {string} */
    getName() {return this.#name;}
    /** @type {string} */
    getDescription() {return this.#description;}
    /** @type {string} */
    getPersonality() {return this.#personality;}
    /** @type {string} */
    getScenario() {return this.#scenario;}
    /** @type {string} */
    getFirstMes() {return this.#first_mes;}
    /** @type {string} */
    getMesExample() {return this.#mes_example;}
    /** @type {string} */
    getCreatorComment() {return this.#creatorcomment;}
    /** @type {string[]} */
    getTags() {return this.#tags;}
    /** @type {number} */
    getTalkativeness() {return this.#talkativeness;}
    /** @type {boolean} */
    getFav() {return this.#fav;}
    /** @type {string} */
    getCreateDate() {return this.#create_date;}
    /** @type {object} */
    getData() {return this.#data;}
    /** @type {object} */
    getChat() {return this.#chat;}
    /** @type {string} */
    getAvatar() {return this.#avatar;}
    /** @type {object} */
    getJsonData() {return this.#json_data;}
    /** @type {boolean} */
    isShallow() {return this.#shallow;}
}