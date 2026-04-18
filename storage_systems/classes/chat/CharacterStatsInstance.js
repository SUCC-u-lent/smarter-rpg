// @ts-ignore
import SillyTavernClassBase from "../SillyTavernClassBase.js";

export default class CharacterStatsInstance extends SillyTavernClassBase {
    // Stats are stored by Object<string,number> where the key is the stat name and the value is the stat value. This allows for dynamic stats without needing to define a fixed schema.
    static get fieldSchema()
    {
        return {
            stats: { default: {}, hydrate: (/** @type {Object<String,number>} */ value)=>value && typeof value === "object" && !Array.isArray(value) ? value : {} },
        };
    }
    /**
     * @param {Object<string,number>|undefined} stats
     */
    constructor(stats) {
        super();
        // @ts-ignore
        if (stats !== undefined) this._setField("stats", stats);
    }
    /**
     * @param {string} statName
     * @param {number} value
     * Sets the value of a stat. If the stat doesn't exist, it will be created.
     */
    setStat(statName, value){
        const currentStats = this.getStats();
        currentStats[statName] = value;
        // @ts-ignore
        this._setField("stats", currentStats);
    }
    /**
     * @param {string} statName
     * @returns {boolean} Returns true if the stat exists, false otherwise.
     */
    hasStat(statName)
    {
        const currentStats = this.getStats();
        return Object.keys(currentStats).includes(statName)
    }
    /** @returns {Object<string,number>} Returns all stats as an object. */
    getStats()
    {
        return this._getField("stats");
    }
    /**
     * @param {string} statName
     * @returns {number | undefined} Returns the value of the stat, or undefined if the stat doesn't exist.
    */
    getStat(statName)
    {
        const currentStats = this.getStats();
        return currentStats[statName];
    }
    /**
     * @param {import("../global/StatClass").default[]} defaultStats
     */
    static fromDefaultStats(defaultStats)
    {
        const statsObject = {};
        defaultStats.forEach(stat => {
            // @ts-ignore
            statsObject[stat.getName()] = stat.getDefaultValue();
        });
        // @ts-ignore
        return new CharacterStatsInstance(statsObject);
    }
}