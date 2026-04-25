import { defaultSettings } from "../settings/DefaultSettingsContainer.js";
import Settings from "../settings/ExtensionSettings.js";

const STORAGE_KEY = "extension_storage";
export default class ExtensionStorage
{
    static Defaults = defaultSettings;
    #storage = {};
    constructor(storage)
    {
        this.#storage = storage;
    }
    static load()
    {
        const storage = Settings.get(
            STORAGE_KEY,
            defaultSettings,
        );
        for (const key in defaultSettings)
        {
            if (!(key in storage))
            {
                storage[key] = defaultSettings[key];
            }
        }
        return new ExtensionStorage(storage || {});
    }
    static get(key, defaultValue = null)
    {
        const storage = ExtensionStorage.load();
        return storage.get(key, defaultValue);
    }
    static set(key, value)
    {
        const storage = ExtensionStorage.load();
        storage.set(key, value).save();
    }
    static reset()
    {
        const storage = new ExtensionStorage({});
        storage.save();
    }

    save()
    {
        const decompiled = {};
        // eslint-disable-next-line guard-for-in
        for (const key in this.#storage) {
            decompiled[key] = this.#storage[key];
        }
        Settings.set(
            STORAGE_KEY,
            decompiled,
        ).save();
    }

    get(key, defaultValue = null)
    {
        return this.#storage[key] ?? defaultValue;
    }
    set(key, value)
    {
        this.#storage[key] = value;

        return this;
    }
}