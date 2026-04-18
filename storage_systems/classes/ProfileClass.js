import Stat from "./StatClass";

export default class Profile {
    #name;
    /** @type {Stat[]} */
    #stats = [];
    /**
     * @param {string} name
     */
    constructor(name) {
        this.#name = name;
        this.#stats = [];       
    }
}