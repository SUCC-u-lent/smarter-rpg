import Connectivity from "./ConnectivityClass.js";
import SillyTavernClassBase from "../SillyTavernClassBase.js";
import { EmbedPosition } from "../../../enums/EmbedPosition.js";

export default class Config extends SillyTavernClassBase {
    static get fieldSchema()
    {
        return {
            embedPosition: { default: EmbedPosition.BELOW_MESSAGE, hydrate: (/** @type {string} */ value) => typeof value === "string" && Object.values(EmbedPosition).includes(value) ? value : EmbedPosition.BELOW_MESSAGE },
            connectivity: { type: Connectivity, default: () => new Connectivity() },
            enabled: { default: false, hydrate: (/** @type {any} */ value) => typeof value === "boolean" ? value : false },
            statMode: { default: "normal", hydrate: (/** @type {string} */ value) => typeof value === "string" && value.trim() ? value : "normal" },
        };
    }

    /**
     * @param {Connectivity} [connectivity]
     * @param {boolean} [enabled]
     * @param {string} [statMode]
     * @param {string} [embedPosition]
     */
    constructor(connectivity, enabled, statMode, embedPosition) {
        super();
        if (connectivity !== undefined) this._setField("connectivity", connectivity);
        if (enabled !== undefined) this._setField("enabled", enabled);
        if (statMode !== undefined) this._setField("statMode", statMode);
        if (embedPosition !== undefined) this._setField("embedPosition", embedPosition);
        // Normal stat mode = Constrained to defined profile stats
        // Crazy stat mode = Constrained to any profile stats even ones its not assigned to
        // Wild stat mode = AI Unhinged unleashed. AI can create and use any stat it wants with no constraints.
    }

    getConnectivity()
    {
        return this._getField("connectivity");
    }

    isEnabled()
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
}