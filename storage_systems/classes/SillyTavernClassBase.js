const privateState = new WeakMap();

/**
 * @param {{} | null} value
 */
function isPlainObject(value)
{
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * @param {{ default: () => any; }} definition
 */
function getDefaultValue(definition)
{
    if (typeof definition.default === "function") {
        return definition.default();
    }
    return definition.default;
}

/**
 * @param {{ map: (arg0: (item: any) => any) => any; toJSON: () => any; }} value
 * @param {{ type: any; } | { type?: undefined; }} definition
 */
function serializeWithDefinition(value, definition)
{
    // @ts-ignore
    if (typeof definition.serialize === "function") {
        // @ts-ignore
        return definition.serialize(value);
    }

    if (Array.isArray(value)) {
        // @ts-ignore
        const itemDefinition = definition.arrayOf ? { type: definition.arrayOf } : {};
        return value.map(item => serializeWithDefinition(item, itemDefinition));
    }

    if (value && typeof value.toJSON === "function") {
        return value.toJSON();
    }

    return value;
}

/**
 * @param {any[] | undefined} value
 * @param {{ type: any; hydrate?: any; arrayOf?: any; }} definition
 */
// @ts-ignore
function hydrateWithDefinition(value, definition)
{
    if (value === undefined) {
        // @ts-ignore
        return getDefaultValue(definition);
    }

    if (typeof definition.hydrate === "function") {
        return definition.hydrate(value);
    }

    if (definition.arrayOf) {
        if (!Array.isArray(value)) {
            // @ts-ignore
            return getDefaultValue(definition);
        }

        // @ts-ignore
        return value.map(item => hydrateWithDefinition(item, { type: definition.arrayOf }));
    }

    if (definition.type && typeof definition.type.fromJSON === "function") {
        if (value instanceof definition.type) {
            return value;
        }
        return definition.type.fromJSON(value);
    }

    return value;
}

class SillyTavernClassBase
{
    static get fieldSchema()
    {
        return {};
    }

    constructor()
    {
        if (new.target === SillyTavernClassBase) {
            throw new Error("Cannot instantiate SillyTavernClassBase directly.");
        }

        privateState.set(this, {});
        this._initializeDefaults();
    }

    _initializeDefaults()
    {
        const state = privateState.get(this);
        // @ts-ignore
        const schema = this.constructor.fieldSchema;

        for (const [fieldName, definition] of Object.entries(schema)) {
            state[fieldName] = getDefaultValue(definition);
        }
    }

    /**
     * @param {string} fieldName
     */
    _getField(fieldName)
    {
        const state = privateState.get(this);
        return state[fieldName];
    }

    /**
     * @param {string} fieldName
     * @param {string | number | boolean | import("./global/StatClass").default[] | import("./global/ConnectivityClass").default | null} value
     */
    _setField(fieldName, value)
    {
        const state = privateState.get(this);
        // @ts-ignore
        const definition = this.constructor.fieldSchema[fieldName] || {};
        // @ts-ignore
        state[fieldName] = hydrateWithDefinition(value, definition);
        return state[fieldName];
    }

    toJSON()
    {
        const state = privateState.get(this);
        // @ts-ignore
        const schema = this.constructor.fieldSchema;
        const data = {};

        for (const [fieldName, definition] of Object.entries(schema)) {
            // @ts-ignore
            data[fieldName] = serializeWithDefinition(state[fieldName], definition);
        }

        return data;
    }

    static fromJSON(data = {})
    {
        const instance = new this();
        const source = isPlainObject(data) ? data : {};

        for (const fieldName of Object.keys(this.fieldSchema)) {
            if (Object.prototype.hasOwnProperty.call(source, fieldName)) {
                // @ts-ignore
                instance._setField(fieldName, source[fieldName]);
            }
        }

        return instance;
    }
}

export default SillyTavernClassBase;