export default class Stat
{
    // Stats Template:
    // {
    //     "name": "Stat",
    //     "description": "A stat that can be used in the RPG system.",
    //     "default": string/number,
    //     "min": number,
    //     "max": number,
    //     "type": "number" | "string" | "percentage" | "range",
    //     "maxDelta": number (optional) // The maximum change that can be applied to this stat in a single update. This is used to prevent large changes that could break the game balance.
    // }
    #name;
    #description;
    #default;
    #min;
    #max;
    #type;
    #maxDelta;
    /**
     * @param {string} name
     * @param {string} description
     * @param {number|string} defaultValue
     * @param {number} min
     * @param {number} max
     * @param {string} type
     * @param {number|null} maxDelta
     */
    constructor(name, description, defaultValue, min, max, type, maxDelta) {
        if (!name) throw new Error("Stat must have a name");
        if (!description) throw new Error("Stat must have a description");
        this.#name = name;
        this.#description = description;
        this.#default = defaultValue || 0;
        this.#min = min || -Infinity;
        this.#max = max || Infinity;
        this.#type = type || "number"; // Default to number if not provided
        this.#maxDelta = maxDelta || null; // Optional
    }
}