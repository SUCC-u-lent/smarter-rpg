import SillyTavernClassBase from "../SillyTavernClassBase.js";

export default class Connectivity extends SillyTavernClassBase {
    static get fieldSchema()
    {
        return {
            ai_prompt: { default: "" },
            message_prompt: { default: "" },
            backend_url: { default: "" },
        };
    }

    /**
     * @param {string | undefined} [ai_prompt]
     * @param {string | undefined} [message_prompt]
     * @param {string | undefined} [backend_url]
     */
    constructor(ai_prompt, message_prompt, backend_url) {
        super();
        if (typeof ai_prompt === "string") this._setField("ai_prompt", ai_prompt);
        if (typeof message_prompt === "string") this._setField("message_prompt", message_prompt);
        if (typeof backend_url === "string") this._setField("backend_url", backend_url);
    }
}