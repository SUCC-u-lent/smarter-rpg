import { getGlobalExtensionStorage } from "../../GlobalExtensionStorage.js";
import Stat from "./StatClass.js";
import SillyTavernClassBase from "../SillyTavernClassBase.js";

export default class Profile extends SillyTavernClassBase
{
    static get fieldSchema()
    {
        return {
            id: { default: () => crypto.randomUUID(), hydrate: (/** @type {string} */ value) => typeof value === "string" && value.trim() ? value : crypto.randomUUID() },
            name: { default: "Unnamed Profile", hydrate: (/** @type {string} */ value) => typeof value === "string" && value.trim() ? value.trim() : "Unnamed Profile" },
            stats: { default: () => [], arrayOf: Stat },
        };
    }

    /**
     * @param {string} name
     * @param {string} [id]
     * @param {Stat[]} [stats]
     */
    constructor(name, id, stats) {
        super();
        if (name !== undefined) this._setField("name", name);
        if (id !== undefined) this._setField("id", id);
        if (stats !== undefined) this._setField("stats", stats);
    }
    /**
     * @param {Stat} stats
     */
    pushStat(stats)
    {
        const currentStats = this.getStats();
        currentStats.push(stats)
        this._setField("stats", currentStats);
    }
    /**
     * @param {string} statName
     */
    removeStat(statName)
    {
        const stats = this.getStats();
        const index = stats.findIndex(stat => stat.getName() === statName);
        if (index !== -1) {
            stats.splice(index, 1);
            this._setField("stats", stats);
        }
    }
    getId() {
        return this._getField("id");
    }
    getName() {
        return this._getField("name");
    }
    /**
     * @return {Stat[]}
    */
    getStats() {
        return this._getField("stats");
    }
    /**
     * @param {string} name
     * @return {boolean}
     */
    hasStat(name)
    {
        const stats = this.getStats();
        for (const stat of stats)
        {
            if (stat && stat.getName() === name) {
                return true;
            }
        }
        return false;
    }
    /**
     * @param {string} name
     */
    setName(name)
    {
        if (typeof name !== "string" || !name.trim()) {
            throw new Error("Profile name cannot be empty.");
        }
        this._setField("name", name.trim());
    }
    /**
     * @param {string} id
     */
    static getProfileById(id)
    {
        const storage = getGlobalExtensionStorage()
        const profiles = storage.getProfiles()
        return profiles.find((/** @type {{ getId: () => string; }} */ profile) => profile.getId() === id) || null;
    }
    /**
     * @param {string} name
     */
    static getProfileByName(name)
    {
        const storage = getGlobalExtensionStorage()
        const profiles = storage.getProfiles()
        return profiles.find((/** @type {{ getName: () => string; }} */ profile) => profile.getName() === name) || null;
    }
}