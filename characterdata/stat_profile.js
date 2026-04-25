export default class StatProfile {
    /** @type {string} */
    #name;
    /** @type {Stat[]} */
    #stats;
    constructor(name, stats)
    {
        this.#name = name;
        this.#stats = StatProfile.normalizeStats(stats);
    }

    /** @param {any} stats */
    static normalizeStats(stats)
    {
        if (Array.isArray(stats))
        {
            return stats;
        }
        if (stats && typeof stats === "object")
        {
            return Object.values(stats);
        }

        return [];
    }

    toJSON()
    {
        return {
            name: this.#name,
            stats: this.#stats.map(stat => stat.toJSON()),
        };
    }
    /** @param {{name:string,stats:{
            name: string,
            description: string,
            defaultValue: number|string,
            type: string,
            minRange: number,
            maxRange: number,
        }[]}} data  */
    static decompile(data){
        const decompiledStats = [];
        const sourceStats = StatProfile.normalizeStats(data.stats);
        if (Array.isArray(sourceStats)){
            for (const statData of sourceStats){
                decompiledStats.push(Stat.decompile(statData));
            }
        }
        return new StatProfile(data.name, decompiledStats);
    }
    getStat(statName)
    {
        const stats = this.getStats();
        return stats.find(s => s.getName() === statName);
    }
    setStats(stats)
    {
        this.#stats = StatProfile.normalizeStats(stats);
    }
    getStats()
    {
        return this.#stats || [];
    }
    getName()
    {
        return this.#name || "Unnamed Profile";
    }
}

export class Stat {
    /** @type {string} */
    #name;
    /** @type {string} */
    #description;
    /** @type {number|string} */
    #defaultValue;
    /** @type {string} */
    #type;
    /** @type {number} */
    #minRange;
    /** @type {number} */
    #maxRange;
    constructor(name, description, defaultValue, type = "number", minRange = null, maxRange = null)
    {
        this.#name = name || "Unnamed Stat";
        this.#description = description || "";
        this.#defaultValue = defaultValue || (type === "number" ? 0 : "");
        this.#type = type || "number";
        this.#minRange = minRange || -Infinity;
        this.#maxRange = maxRange || Infinity;
    }
    toJSON()
    {
        return {
            name: this.#name,
            description: this.#description,
            defaultValue: this.#defaultValue,
            type: this.#type,
            minRange: this.#minRange,
            maxRange: this.#maxRange,
        };
    }
    static decompile(data){
        return new Stat(data.name, data.description, data.defaultValue, data.type, data.minRange, data.maxRange);
    }
    getName()
    {
        return this.#name;
    }
    getDescription()
    {
        return this.#description;
    }
    getDefaultValue()
    {
        return this.#defaultValue;
    }
    getType()
    {
        return this.#type;
    }
    getMinRange()
    {
        return this.#minRange;
    }
    getMaxRange()
    {
        return this.#maxRange;
    }
}