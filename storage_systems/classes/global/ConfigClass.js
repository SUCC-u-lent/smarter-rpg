import Connectivity from "./ConnectivityClass.js";
import SillyTavernClassBase from "../SillyTavernClassBase.js";
import { EmbedPosition } from "../../../enums/EmbedPosition.js";
import { getGlobalExtensionStorage } from "../../GlobalExtensionStorage.js";
import { extensionEventSource, extensionEventTypes } from "../../../events/ExtensionEvents.js";

export default class Config extends SillyTavernClassBase {
    static get fieldSchema()
    {
        return {
            embedPosition: { default: EmbedPosition.BELOW_MESSAGE, hydrate: (/** @type {string} */ value) => typeof value === "string" && Object.values(EmbedPosition).includes(value) ? value : EmbedPosition.BELOW_MESSAGE },
            connectivity: { type: Connectivity, default: () => new Connectivity() },
            enabled: { default: false, hydrate: (/** @type {any} */ value) => typeof value === "boolean" ? value : false },
            statMode: { default: "normal", hydrate: (/** @type {string} */ value) => typeof value === "string" && value.trim() ? value : "normal" },
            fontSize: { default: 1, hydrate: (/** @type {number} */ value) => typeof value === "number" ? value : 1 },
        };
    }

    /**
     * @param {Connectivity} [connectivity]
     * @param {boolean} [enabled]
     * @param {string} [statMode]
     * @param {string} [embedPosition]
     * @param {number} [fontSize]
     */
    constructor(connectivity, enabled, statMode, embedPosition, fontSize) {
        super();
        if (connectivity !== undefined) this._setField("connectivity", connectivity);
        if (enabled !== undefined) this._setField("enabled", enabled);
        if (statMode !== undefined) this._setField("statMode", statMode);
        if (embedPosition !== undefined) this._setField("embedPosition", embedPosition);
        if (fontSize !== undefined) this._setField("fontSize", fontSize);
        // Normal stat mode = Constrained to defined profile stats
        // Crazy stat mode = Constrained to any profile stats even ones its not assigned to
        // Wild stat mode = AI Unhinged unleashed. AI can create and use any stat it wants with no constraints.
    }

    /** @returns {Connectivity} */
    getConnectivity()
    {
        return this._getField("connectivity");
    }

    getEnabled()
    {
        return this._getField("enabled");
    }

    getStatMode()
    {
        return this._getField("statMode");
    }
    /** @returns {string} */
    getEmbedPosition()
    {
        return this._getField("embedPosition");
    }
    getFontSize()
    {
        return this._getField("fontSize");
    }
    /**
     * @param {string} position
     */
    setEmbedPosition(position)
    {
        if (typeof position !== "string" || !Object.values(EmbedPosition).includes(position)) {
            throw new Error(`Invalid embed position: ${position}`);
        }
        this._setField("embedPosition", position);
    }
    /**
     * @param {string} mode
     */
    setStatMode(mode)
    {
        if (typeof mode !== "string" || !mode.trim()) {
            throw new Error(`Invalid stat mode: ${mode}`);
        }
        this._setField("statMode", mode);
    }
    /**
     * @param {boolean} enabled
     */
    setEnabled(enabled)
    {
        if (typeof enabled !== "boolean") {
            throw new Error(`Enabled must be a boolean value.`);
        }
        this._setField("enabled", enabled);
    }
    /**
     * @param {string} url
     */
    setConnectionUrl(url)
    {
        const connectivity = this.getConnectivity();
        connectivity.setBackendUrl(url);
        this._setField("connectivity", connectivity);
    }
    /**
     * @param {number} size
     */
    setFontSize(size)
    {
        if (typeof size !== "number") {
            throw new Error("Font size must be a number.");
        }
        this._setField("fontSize", size);
    }
    /**
     * @param {Connectivity} connectivity
     */
    setConnectivity(connectivity)
    {
        if (!(connectivity instanceof Connectivity)) {
            throw new Error("Invalid connectivity object.");
        }
        this._setField("connectivity", connectivity);
    }
    save()
    {
        const globalStorage = getGlobalExtensionStorage();
        globalStorage.replaceConfig(this)
        globalStorage.save()
        extensionEventSource.emit(extensionEventTypes.CONFIG_SAVED, this)
    }
}