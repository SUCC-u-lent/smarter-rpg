import ExtensionStorage from "./ExtensionStorage.js";

const STORAGE_KEY = "character_storage";
export default class CharacterStorage {
    #storage = {};
    constructor(storage)
    {
        this.#storage = storage;
    }
    static load()
    {
        const storage = ExtensionStorage.get(
            STORAGE_KEY,
            {},
        );

        return new CharacterStorage(storage || {});
    }
    static get(key, defaultValue = null)
    {
        const storage = CharacterStorage.load();
        return storage.get(key, defaultValue);
    }
    static set(key, value)
    {
        const storage = CharacterStorage.load();
        storage.set(key, value).save();
    }
    static reset()
    {
        const storage = new CharacterStorage({});
        storage.save();
    }

    save()
    {
        const decompiled = {};
        // eslint-disable-next-line guard-for-in
        for (const key in this.#storage) {
            decompiled[key] = this.#storage[key];
        }
        ExtensionStorage.set(
            STORAGE_KEY,
            decompiled,
        );
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