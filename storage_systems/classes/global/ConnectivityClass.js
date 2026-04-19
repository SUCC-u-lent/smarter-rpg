import { getGlobalExtensionStorage } from "../../GlobalExtensionStorage.js";
import SillyTavernClassBase from "../SillyTavernClassBase.js";

const DEFAULT_MODEL = "qwen2.5:1.5b-instruct";
const DEFAULT_BACKEND_URL = "http://localhost:3000";
const STAT_ALLOWED_PROMPT = `
Only create a stat change if:
- A clear, explicit event occurs (damage, healing, gaining/losing something significant)
- The outcome is directly stated (NOT implied)
- The affected character is clearly identifiable
- The stat belongs to that character

Stat changes must be additive (e.g. +10 or -5), do NOT return totals.

If the affected character or stat is unclear, do NOT apply a stat change.`;

const STAT_DISALLOWED_STRICT_PROMPT = `
Each stat belongs to a specific character.

You MUST ONLY modify stats for the character that OWNS those stats.

Do NOT:
- Assign a stat to a different character
- Modify stats for a character who does not have those stats
- Guess or transfer stats between characters

If a character does not have defined stats, you MUST NOT create or modify any stats for them.`;
const STAT_DISALLOWED_LOOSE_PROMPT = `
Only use stats that are explicitly listed in [Character Stat Descriptions].

Do NOT:
- Create new stat names
- Modify stats not listed
- Substitute similar names (e.g., "Health" instead of "HP")

If the exact stat name does not exist, do NOT apply a stat change.`;
const DEFAULT_AUXIL_PROMPT = `You are a factual, unbiased stat handling assistant for a roleplaying game.

Your task is to determine whether a stat change is warranted based ONLY on the current message and recent context.

Most messages should result in NO stat changes.

{{statCreationPrompt}}

Do NOT:
- Infer outcomes
- Assume results
- Create changes for dialogue or minor actions

If no valid change exists, return:
{{json_example_no_change}}

{{json_example}}
{{json_format}}

[Chat History]
{{history}}

[Stat Descriptions]
{{all_stat_descriptions}}

[Character Stats]
{{all_stats}}

[Current Message]
{{message}}

[Output Requirements - STRICT]
- Return valid JSON only
- Follow the exact schema
- Do NOT add extra keys
- Do NOT rename fields
- Only include ONE character at most
- Stat changes must be additive (e.g. +10 or -5), do not return new totals

[Target Selection Rules]
- The targetCharacter MUST be the character whose stats are being changed.
- Do NOT select a character just because they are mentioned.
- Do NOT select the player by default.
- If multiple characters are present, choose ONLY the one whose stats are directly affected.
- The targetCharacter must not be {{emptyCharacters}}.
`;
/** Unlike the auxil prompt this prompt is injected into the chat history, so its formatted in such a way its not the header but part of the body */
const DEFAULT_MESSAGE_PROMPT = `[Stat Descriptions]
{{all_stat_descriptions}}

[Character Stats]
{{all_stats}}

[Instructions]
- Stats may subtly influence tone and behavior.
- Do not reference or mention stats explicitly.
- A separate system manages stats.
`;
const JSON_FORMAT = `[JSON Format]
{
    "targetCharacter": string,
    "changes": Object<statName, statValue>,
    "reasoning": string,
    "blocked": null | string
}
`;
const JSON_EXAMPLE = `[JSON Example]
{
    "targetCharacter": "Alice",
    "changes": {
        "Health": -10,
        "Mana": +5
    },
    "reasoning": "Alice takes 10 damage from the goblin's attack but gains 5 mana from using a drinking a potion.",
    "blocked": null
}`;
const JSON_EXAMPLE_NO_CHANGE = `[JSON Example - No Change]
{
    "targetCharacter": null,
    "changes": {},
    "reasoning": "No stat changes are warranted because the message only contains dialogue with no significant events or outcomes.",
    "blocked": null
}`;

export default class Connectivity extends SillyTavernClassBase {
    static get fieldSchema()
    {
        return {
            auxil_prompt: { default: "" },
            message_prompt: { default: "" },
            backend_url: { default: "" },
            model: { default: "" },
        };
    }

    /**
     * @param {string | undefined} [auxil_prompt]
     * @param {string | undefined} [message_prompt]
     * @param {string | undefined} [backend_url]
     * @param {string | undefined} [model]
     */
    constructor(auxil_prompt, message_prompt, backend_url, model) {
        super();
        if (typeof auxil_prompt === "string") this._setField("auxil_prompt", auxil_prompt);
        if (typeof message_prompt === "string") this._setField("message_prompt", message_prompt);
        if (typeof backend_url === "string") this._setField("backend_url", backend_url);
        if (typeof model === "string") this._setField("model", model);
    }

    /** @returns {string} */
    getAuxilPrompt() {
        const url = this._getField("auxil_prompt");
        // If URL is empty or only whitespace, treat it as not set and replace with default
        if (typeof url === "string" && url.trim() === "") {
            return DEFAULT_AUXIL_PROMPT
            .replaceAll("{{json_format}}", JSON_FORMAT)
            .replaceAll("{{json_example_no_change}}", JSON_EXAMPLE_NO_CHANGE)
            .replaceAll("{{json_example}}", JSON_EXAMPLE);
        }
        if (!url.includes("{{json_format}}")) {
            console.warn("The auxil prompt is missing {{json_format}}. This will likely cause invalid JSON output.");
        }

        if (!url.includes("{{json_example}}") && !url.includes("{{json_example_no_change}}")) {
            console.warn("No JSON examples found. Output quality may be reduced.");
        }
        return url
        .replaceAll("{{json_format}}", JSON_FORMAT)
        .replaceAll("{{json_example_no_change}}", JSON_EXAMPLE_NO_CHANGE)
        .replaceAll("{{json_example}}", JSON_EXAMPLE);
    }

    getAuxilPromptWithPromptAllowance(statCreationAllowed = true, strictStatCreation = true)
    {
        let prompt = this.getAuxilPrompt();
        if (!prompt.includes("{{statCreationPrompt}}")) {
            console.warn("The auxil prompt is missing {{statCreationPrompt}}. This means you cannot toggle stat creation allowance without editing the prompt.");
            return prompt;
        }
        return prompt.replaceAll("{{statCreationPrompt}}", statCreationAllowed ? STAT_ALLOWED_PROMPT : (strictStatCreation ? STAT_DISALLOWED_STRICT_PROMPT : STAT_DISALLOWED_LOOSE_PROMPT));
    }

    /** @returns {string} */
    getRAWAuxilPrompt() {
        const url = this._getField("auxil_prompt");
        // If URL is empty or only whitespace, treat it as not set and replace with default
        if (typeof url === "string" && url.trim() === "") {
            return DEFAULT_AUXIL_PROMPT;
        }
        return url;
    }

    /** @returns {string} */
    getMessagePrompt() {
        const url = this._getField("message_prompt");
        // If URL is empty or only whitespace, treat it as not set and replace with default
        if (typeof url === "string" && url.trim() === "") {
            return DEFAULT_MESSAGE_PROMPT;
        }
        return url;
    }

    getRAWMessagePrompt() {
        const url = this._getField("message_prompt");
        // If URL is empty or only whitespace, treat it as not set and replace with default
        if (typeof url === "string" && url.trim() === "") {
            return DEFAULT_MESSAGE_PROMPT;
        }
        return url;
    }

    /** @returns {string} */
    getBackendUrl() {
        const url = this._getField("backend_url");
        // If URL is empty or only whitespace, treat it as not set and replace with default
        if (typeof url === "string" && url.trim() === "") {
            return DEFAULT_BACKEND_URL;
        }
        return url;
    }
    getModel()
    {
        const model = this._getField("model");
        if (typeof model === "string" && model.trim() === "") {
            return DEFAULT_MODEL;
        }
        return model;
    }
    /**
     * @param {string} model
     */
    setModel(model)
    {
        if (typeof model !== "string") {
            throw new Error("Model must be a string.");
        }
        this._setField("model", model);
    }
    /**
     * @param {string} url
     */
    setBackendUrl(url)
    {
        if (typeof url !== "string") {
            throw new Error("Backend URL must be a string.");
        }
        this._setField("backend_url", url);
    }
    /**
     * @param {string} prompt
     */
    setAuxilPrompt(prompt)
    {
        if (typeof prompt !== "string") {
            throw new Error("Auxil Prompt must be a string.");
        }
        this._setField("auxil_prompt", prompt);
    }
    /**
     * @param {string} prompt
     */
    setMessagePrompt(prompt)
    {
        if (typeof prompt !== "string") {
            throw new Error("Message Prompt must be a string.");
        }
        this._setField("message_prompt", prompt);
    }
    save()
    {
        const globalSettings = getGlobalExtensionStorage();
        const config = globalSettings.getConfig();
        config._setField("connectivity", this);
        config.save();
    }
}