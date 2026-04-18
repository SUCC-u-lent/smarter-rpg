import { getGlobalExtensionStorage } from "../../GlobalExtensionStorage.js";
import Profile from "../global/ProfileClass.js";
import SillyTavernClassBase from "../SillyTavernClassBase.js";

export class CharacterProfileData extends SillyTavernClassBase {
    static get fieldSchema()
    {
        return {
            id: { default: "", hydrate: (/** @type {any} */ value) => typeof value === "string" ? value : "" },
            activeProfileId: { default: null, hydrate: (/** @type {null} */ value) => typeof value === "string" || value === null ? value : null },
        };
    }

    /**
     * @param {string} id
     * @param {string | null} activeProfileId
     */
    constructor(id, activeProfileId) {
        super();
        if (id !== undefined) this._setField("id", id);
        if (activeProfileId !== undefined) this._setField("activeProfileId", activeProfileId);
    }
    getId() {
        return this._getField("id");
    }
    getActiveProfileId() {
        return this._getField("activeProfileId");
    }
    /** @returns {Profile | null} */
    getActiveProfile()
    {
        const storage = getGlobalExtensionStorage()        
        const activeProfileId = this.getActiveProfileId()
        if (!activeProfileId) return null
        const profiles = storage.getProfiles()
        return profiles.find((/** @type {Profile} */ profile) => profile.getId() === activeProfileId) || null
    }
    /**
     * @param {string | null} selectedProfileId
     */
    setActiveProfileId(selectedProfileId)
    {
        this._setField("activeProfileId", selectedProfileId);
    }
}