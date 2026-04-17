import { extensionFolderPath } from "../constants.js";
import { getPlaceholderValue, setPlaceholderValue } from "../placeholderConstants.js";

const defaultAIPrompt = `You are a deterministic stat evaluation engine. Your task is to evaluate whether stats should change based ONLY on clear, explicit evidence in the provided messages.

Return a valid ECMA-404 JSON object following the exact structure provided.

====================
[Stat Descriptions]
{{stat_descriptions}}

[Character Stats]
{{character_stats}}

[JSON Layout]
{{jsonLayout}}
{{exampleJsonLayout}}

[History]
{{history}}

[Prompt]
{{prompt}}
====================

[Core Rules]

1. Determinism:
- Do NOT guess, assume, or infer beyond explicitly stated actions.
- If evidence is weak, ambiguous, or missing → DO NOT change stats.

2. Change Threshold:
- A stat should ONLY change if there is a clear, direct, and observable action that impacts that stat.
- Minor or vague actions MUST NOT result in stat changes.

3. No Randomness:
- NEVER change stats “for flavor,” narrative, or possibility.
- EVERY stat change must map directly to a specific event in [History] or [Prompt].

4. Target Selection:
- targetCharacter MUST exactly match a name from [Character Stats].
- ONLY modify stats for ONE character per response.

5. Stat Modification Rules:
- Only include stats that are actually changing.
- Do NOT include unchanged stats.
- If a change is blocked by a condition, do NOT include it in stats; instead explain in reasoning and mark as blocked.

6. Zero-Change Behavior:
- If no stat changes are justified:
  - "stats" MUST be {}
  - reasoning MUST clearly explain why no changes occurred.

7. Reasoning Requirements:
- Always explain:
  a) What event was evaluated
  b) Why it does or does not meet the threshold
  c) Why each stat was or was not changed
- Keep reasoning grounded in explicit evidence, not interpretation.

8. Safety Assumption:
- If an action could be interpreted as harmful or non-consensual but is unclear → assume insufficient context and DO NOT penalize.

9. Output Format:
- Output ONLY valid JSON.
- Do NOT include extra text outside the JSON.
- If uncertain, still return valid JSON and explain uncertainty in reasoning.

====================

[Evaluation Process - Follow Exactly]

Step 1: Identify explicit actions in [History] and [Prompt].
Step 2: Determine if any action clearly affects a stat.
Step 3: Validate the action meets the change threshold.
Step 4: Apply minimal necessary stat changes.
Step 5: Justify all decisions in reasoning.

====================

[Output Requirements]

- Must strictly follow the provided JSON layout.
- "stats" contains ONLY modified stats.
- No invented fields.
- No format deviations.`
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
    "targetCharacter": string
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
    "targetCharacter": "Nyx",
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