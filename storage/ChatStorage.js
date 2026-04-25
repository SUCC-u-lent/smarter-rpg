import ExtensionStorage from "./ExtensionStorage.js";
import { getCurrentChatId } from "../../../../../script.js";

const STORAGE_KEY = "chat_storage";
export default class ChatStorage {
    #storage = {};
    constructor(storage)
    {
        this.#storage = storage;
    }
    static getChatId()
    {
        return getCurrentChatId();
    }
    static load()
    {
        const chatId = this.getChatId();
        if (!chatId) {
            throw new Error("No chat ID found");
        }
        const storage = ExtensionStorage.get(
            `${STORAGE_KEY}_${chatId}`,
            {},
        );

        return new ChatStorage(storage || {});
    }
    static delete(key)
    {
        const storage = ChatStorage.load();
        delete storage.#storage[key];
        storage.save();
    }
    static get(key, defaultValue = null)
    {
        const storage = ChatStorage.load();
        return storage.get(key, defaultValue);
    }
    static set(key, value)
    {
        const storage = ChatStorage.load();
        storage.set(key, value).save();
    }
    static reset()
    {
        const storage = new ChatStorage({});
        storage.save();
    }

    save()
    {
        const decompiled = {};
        // eslint-disable-next-line guard-for-in
        for (const key in this.#storage) {
            decompiled[key] = this.#storage[key];
        }
        const chatId = ChatStorage.getChatId();
        if (!chatId) {
            throw new Error("No chat ID found");
        }
        ExtensionStorage.set(
            `${STORAGE_KEY}_${chatId}`,
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