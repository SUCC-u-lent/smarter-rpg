import Config from "./ConfigClass";
import Profile from "./ProfileClass";

export class ExtensionSettings {
    #config = new Config();
    /** @type {Profile[]} */
    #profiles = [];
    constructor() {
        this.#config = new Config();
        /** @type {Profile[]} */
        this.#profiles = [];
    }
}