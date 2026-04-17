import { extensionFolderPath } from "../constants.js";
import { getPlaceholderValue, setPlaceholderValue } from "../placeholderConstants.js";

const defaultAIPrompt = `Evaluate the following stats and messages based on the provided stat descriptions and provide a valid ECMA-404 JSON object with the changes in stats if applicable.
[Stat Descriptions]
{{stat_descriptions}}
[Character Stats]
{{character_stats}}
[Json Layout]
{{jsonLayout}}
{{exampleJsonLayout}}
[Rules]
- Assume you do not have full context on the character's situation, so such actions that may be seen as non-consensual or negative may be justified as insufficient context and assume innocence.
- Stats changed are {{character}}'s.
- Strings in the stats object should reflect the name of the stat to modify.
- Only change stats if there is a valid reason, do not change stats for no reason or 'for fun'.
- Always provide reasoning for stat changes in the reasoning field of the JSON response, even if there are no stat changes.
- If a stat change would occur but is blocked by a condition, do not include the stat change in the stats field and instead set blocked.isBlocked to true and provide the reason in blocked.reason.
- If there are no stat changes, the stats field should be an empty object {} or all stats should be 0, but the reasoning field should still provide an explanation of why there are no stat changes.
- Never break the JSON format, if you are unsure about the format provide an object and include your uncertainty in the reasoning field.
[History]
{{history}}
[Prompt]
{{prompt}}
`
const defaultMessagePrompt = `[Stat Descriptions]
 {{stat_descriptions}}
 {{character_stats}}
 [System Behavior]
 - Stats must always influence character actions, dialogue, and outcomes.
 - Higher stats subtly dominate interactions without explicitly referencing numbers.
 - Differences in stats should be reflected through tone, success, hesitation, or failure.
 - Never mention stats or calculations in dialogue or narration.`
const defaultBackendIp = `http://localhost:3000`
const defaultModel = `qwen2.5:1.5b-instruct`;

const jsonLayout = `JSON Schema Reference (do not output this):
{
    "stats": object<string, number>
    "reasoning": string
    "blocked": {
        "isBlocked": boolean,
        "replacementMessage": string | null
    }
}`
const exampleJsonLayout = `Do not include any comments using // or /* */ as it is invalid in JSON.
Example JSON Output (do not output this):
{
    "stats": {
        "hp": 5,
        "mana": 3,
        "stamina": 0
    },
    "reasoning": "The character successfully cast a healing spell, increasing HP by 5. However, the spell was taxing, resulting in a decrease of 3 mana. Stamina remains unchanged as the spell did not require physical exertion.",
    "blocked": {
        "isBlocked": false,
        "replacementMessage": null
    }
}`

function getJsonLayout()
{
    return jsonLayout;
}
function getExampleJsonLayout()
{
    return exampleJsonLayout;
}

async function setupExtensionConnectivity(extensionDrawer) {
    const connectivityElement = $(await $.get(`${extensionFolderPath}/html/connectivity.html`));
    // insert connectivity element into the extension drawer at the top (beginning)
    extensionDrawer.prepend(connectivityElement);
    const aiPrompt = connectivityElement.find("#statai-ai-prompt");
    const messagePrompt = connectivityElement.find("#statai-message-prompt");
    const backendIp = connectivityElement.find("#statai-backend-ip");
    const model = connectivityElement.find("#statai-model");

    const storedAIPrompt = getPlaceholderValue("ai_prompt");
    const storedMessagePrompt = getPlaceholderValue("message_prompt");
    const storedBackendIp = getPlaceholderValue("backend_ip");
    const storedModel = getPlaceholderValue("model");

    aiPrompt.val(storedAIPrompt && !storedAIPrompt.isDefault ? storedAIPrompt.content : defaultAIPrompt);
    messagePrompt.val(storedMessagePrompt && !storedMessagePrompt.isDefault ? storedMessagePrompt.content : defaultMessagePrompt);
    backendIp.val(storedBackendIp && !storedBackendIp.isDefault ? storedBackendIp.content : defaultBackendIp);
    model.val(storedModel && !storedModel.isDefault ? storedModel.content : defaultModel);

    aiPrompt.on("change",function()
    {
        const value = $(this).val();
        setPlaceholderValue("ai_prompt", {
            content:value,
            isDefault:false
        });    
    })
    messagePrompt.on("change",function()
    {
        const value = $(this).val();
        setPlaceholderValue("message_prompt", {
            content:value,
            isDefault:false
        });    
    })
    backendIp.on("change",function()
    {
        const value = $(this).val();
        setPlaceholderValue("backend_ip", {
            content:value,
            isDefault:false
        });    
    })
    model.on("change",function()
    {
        const value = $(this).val();
        setPlaceholderValue("model", {
            content:value,
            isDefault:false
        });
    })

    const resetAIPrompt = connectivityElement.find("#statai-reset-ai-prompt");
    const resetMessagePrompt = connectivityElement.find("#statai-reset-message-prompt");
    const resetBackendIp = connectivityElement.find("#statai-reset-backend-ip");
    const resetModel = connectivityElement.find("#statai-reset-model");
    resetAIPrompt.on("click", function(){ setPlaceholderValue("ai_prompt", {
        content:defaultAIPrompt,
        isDefault:true
    }); aiPrompt.val(defaultAIPrompt); });
    resetMessagePrompt.on("click", function(){ setPlaceholderValue("message_prompt", {
        content:defaultMessagePrompt,
        isDefault:true
    }); messagePrompt.val(defaultMessagePrompt); });
    resetBackendIp.on("click", function(){ setPlaceholderValue("backend_ip", {
        content:defaultBackendIp,
        isDefault:true
    }); backendIp.val(defaultBackendIp); });
    resetModel.on("click", function(){ setPlaceholderValue("model", {
        content:defaultModel,
        isDefault:true
    }); model.val(defaultModel); });
}

function getDefaultAIPrompt()
{
    return defaultAIPrompt;
}
function getDefaultMessagePrompt()
{
    return defaultMessagePrompt;
}
function getDefaultBackendIp()
{
    return defaultBackendIp;
}
function getDefaultModel()
{
    return defaultModel;
}

function getBackendIp()
{
    return getPlaceholderValue("backend_ip")?.content || defaultBackendIp;
}
function getAIPrompt()
{
    return getPlaceholderValue("ai_prompt")?.content || defaultAIPrompt;
}
function getMessagePrompt()
{
    return getPlaceholderValue("message_prompt")?.content || defaultMessagePrompt;
}
function getModel()
{
    return getPlaceholderValue("model")?.content || defaultModel;
}

export {
    getDefaultAIPrompt,
    getDefaultMessagePrompt,
    getDefaultBackendIp,
    getBackendIp,
    getAIPrompt,
    getMessagePrompt,
    getModel,
    getDefaultModel,
    setupExtensionConnectivity,
    getJsonLayout,
    getExampleJsonLayout
};