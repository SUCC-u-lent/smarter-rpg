import { extension_settings } from "../../../../extensions.js";
import { saveSettingsDebounced } from "../../../../../script.js";

const extensionName = "smarter-rpg";
let instance = null;
export default class Settings {
    static getExtensionName() { return extensionName; }
    static getExtensionFolder() { return `scripts/extensions/third-party/${extensionName}`; }
    static async getJQueryElement(...path) { return $(await $.get(`${Settings.getExtensionFolder()}/html/${path.join("/")}`)); }

    #data;
    constructor(data) {
        this.#data = data || {};
    }

    /** @returns {Settings} */
    static load()
    {
        if (instance) { return instance; }
        const data = extension_settings[extensionName] || {};
        instance = new Settings(data || {});

        return instance;
    }

    static log()
    {
        console.log("Current settings for", extensionName, ":", extension_settings[extensionName]);
    }

    static reset()
    {
        instance = null;
        extension_settings[extensionName] = {};
        saveSettingsDebounced();
        console.log("Cache cleared, settings reset.", extension_settings[extensionName]);
    }

    /** @returns {Settings} */
    static set(key, value)
    {
        const settings = Settings.load();
        settings.set(
            key,
            value,
        );

        return settings;
    }

    /**
     * @param {string} key The key to retrieve from the settings.
     * @param {*} defaultValue The value to return if the key does not exist in the settings. Defaults to null.
     * @returns {*} The value associated with the key in the settings, or defaultValue if the key does not exist.
     */
    static get(key, defaultValue = null)
    {
        const settings = Settings.load();

        return settings.get(key, defaultValue);
    }

    save()
    {
        // Cant use #data here because its a private field.
        const dataExposed = {};
        // eslint-disable-next-line guard-for-in
        for (const key in this.#data) {
            dataExposed[key] = this.#data[key];
        }
        extension_settings[extensionName] = dataExposed;
        // eslint-disable-next-line consistent-this
        instance = this;
        saveSettingsDebounced();
    }

    /**
     * @param {string} key The key to retrieve from the settings.
     * @param {any|null} defaultValue The value to return if the key does not exist in the settings. Defaults to null.
     * @returns {any|null} The value associated with the key, or defaultValue if the key does not exist.
     */
    get(key, defaultValue = null)
    {
        return this.#data[key] ?? defaultValue;
    }

    /**
     * Sets the value for a given key in the settings, does not save the settings immediately.
     * @param {string} key The key to set in the settings.
     * @param {any} value The value to associate with the key in the settings.
     * @return {Settings} The current instance of the Settings class, allowing for method chaining.
     */
    set(key, value)
    {
        this.#data[key] = value;

        return this;
    }
}