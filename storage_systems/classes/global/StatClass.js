import SillyTavernClassBase from "../SillyTavernClassBase.js";

export default class Stat extends SillyTavernClassBase
{
    static get fieldSchema()
    {
        return {
            name: { default: "Stat", hydrate: (/** @type {string} */ value) => typeof value === "string" && value.trim() ? value : "Stat" },
            description: { default: "No description provided", hydrate: (/** @type {string} */ value) => typeof value === "string" && value.trim() ? value : "No description provided" },
            defaultValue: { default: 0, hydrate: (/** @type {any} */ value) => typeof value === "number" || typeof value === "string" ? value : 0 },
            min: { default: -Infinity, hydrate: (/** @type {any} */ value) => typeof value === "number" ? value : -Infinity },
            max: { default: Infinity, hydrate: (/** @type {any} */ value) => typeof value === "number" ? value : Infinity },
            type: { default: "number", hydrate: (/** @type {any} */ value) => typeof value === "string" ? value : "number" },
            maxDelta: { default: null, hydrate: (/** @type {any} */ value) => typeof value === "number" ? value : null },
        };
    }

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
        super();
        // When called with arguments (direct construction), validate. fromJSON calls new this() with no args.
        if (arguments.length > 0) {
            if (!name) throw new Error("Stat must have a name");
            if (!description) throw new Error("Stat must have a description");
            this._setField("name", name);
            this._setField("description", description);
            this._setField("defaultValue", defaultValue);
            this._setField("min", min);
            this._setField("max", max);
            this._setField("type", type);
            this._setField("maxDelta", maxDelta);
        }
    }
    /**
     * @returns {string}
     */
    getName()
    {
        return this._getField("name");
    }
    getDescription()
    {
        return this._getField("description");
    }
    getDefaultValue()
    {
        return this._getField("defaultValue");
    }
    getMin()
    {
        return this._getField("min");
    }
    getMax()
    {
        return this._getField("max");
    }
    getType()
    {
        return this._getField("type");
    }
    getMaxDelta()
    {
        return this._getField("maxDelta");  
    }
    /**
     * @param {string} name
     */
    static newNamedStat(name)
    {
        if (!name) throw new Error("Stat must have a name");
        return new Stat(name, "No description provided", 0, -Infinity, Infinity, "number", null);
    }
}