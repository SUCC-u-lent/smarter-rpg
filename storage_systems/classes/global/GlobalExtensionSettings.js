import Config from "./ConfigClass.js";
import Profile from "./ProfileClass.js";
import SillyTavernClassBase from "../SillyTavernClassBase.js";
import { setGlobalExtensionStorage } from "../../GlobalExtensionStorage.js";
import { extensionEventSource, extensionEventTypes } from "../../../events/ExtensionEvents.js";

export class GlobalExtensionSettings extends SillyTavernClassBase {
    static get fieldSchema()
    {
        return {
            config: { type: Config, default: () => new Config() },
            profiles: { arrayOf: Profile, default: () => [] },
        };
    }

    /**
     * @param {string | number | boolean | import("./StatClass.js").default[] | import("./ConnectivityClass.js").default | null | undefined} [config]
     * @param {string | number | boolean | import("./StatClass.js").default[] | import("./ConnectivityClass.js").default | null | undefined} [profiles]
     */
    constructor(config, profiles) {
        super();
        if (config !== undefined) this._setField("config", config);
        if (profiles !== undefined) this._setField("profiles", profiles);
    }
    getProfiles()
    {
        return this._getField("profiles");
    }
    /** @returns {Config} */
    getConfig()
    {
        return this._getField("config");
    }
    /**
     * @param {string} profileId
     */
    hasProfile(profileId)
    {
        const profiles = this.getProfiles();
        return profiles.some((/** @type {{ getId: () => string; }} */ p) => p.getId() === profileId);
    }
    /**
     * @param {any} profileId
     * @return {Profile | undefined}
     */
    getProfile(profileId)
    {
        const profiles = this.getProfiles();
        return profiles.find((/** @type {{ getId: () => any; }} */ p) => p.getId() === profileId);
    }
    /**
     * @param {Profile} profile
     */
    pushProfile(profile)
    {
        if (!(profile instanceof Profile)) {
            throw new Error("Invalid profile.");
        }
        const profiles = this.getProfiles();
        if (profiles.find((/** @type {{ getId: () => any; }} */ p) => p.getId() === profile.getId())) {
            throw new Error("Profile with this ID already exists.");
        }
        profiles.push(profile);
    }
    /**
     * @param {Profile} profile
     */
    replaceProfile(profile)
    {
        if (!(profile instanceof Profile)) {
            throw new Error("Invalid profile.");
        }
        const profiles = this.getProfiles();
        const index = profiles.findIndex((/** @type {{ getId: () => any; }} */ p) => p.getId() === profile.getId());
        if (index === -1) {
            throw new Error("Profile not found.");
        }
        profiles[index] = profile;
    }
    /**
     * @param {string} profileId
     */
    deleteProfile(profileId)
    {
        const profiles = this.getProfiles();
        const index = profiles.findIndex((/** @type {{ getId: () => string; }} */ p) => p.getId() === profileId);
        if (index !== -1) {
            profiles.splice(index, 1);
        }
    }
    /**
     * @param {Config} config
     */
    replaceConfig(config)
    {
        if (!(config instanceof Config)) {
            throw new Error("Invalid config.");
        }
        this._setField("config", config);
    }

    save()
    {
        setGlobalExtensionStorage(this);
        extensionEventSource.emit(extensionEventTypes.SETTINGS_SAVED, this)
    }
}