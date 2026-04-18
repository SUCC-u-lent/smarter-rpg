export default class Connectivity {
    /** @readonly */
    #DefaultAIPrompt 
        = "";
    /** @readonly */
    #DefaultMessagePrompt 
        = "";
    /** @readonly */
    #DefaultBackendURL 
        = "";
    #ai_prompt = this.#DefaultAIPrompt; // Null for now,
    #message_prompt = this.#DefaultMessagePrompt; // Null for now,
    #backend_url = this.#DefaultBackendURL; // Null for now,
    /**
     * @param {string | undefined} [ai_prompt]
     * @param {string | undefined} [message_prompt]
     * @param {string | undefined} [backend_url]
     */
    constructor(ai_prompt, message_prompt, backend_url) {
        this.#ai_prompt = ai_prompt || this.#DefaultAIPrompt;
        this.#message_prompt = message_prompt || this.#DefaultMessagePrompt;
        this.#backend_url = backend_url || this.#DefaultBackendURL;
    }
}