const default_auxil_stat_gen_prompt = `You evaluate stat changes from text.

Use ONLY clear actions from [History] and [Prompt].
Do NOT invent or assume events.

You MAY use obvious implications if:
- they are a direct result of the action
- most people would agree on them

If uncertain or ambiguous → no change.

====================
[Stats]
{{character_stats}}

[Descriptions]
{{stat_descriptions}}

[History]
{{history}}

[Prompt]
{{prompt}}

[Target Character]
{{target_character}}

[Example Format]
{{exampleJsonLayout}}
====================

Rules:
- Modify stats for ONE character only
- Include ONLY changed stats
- If no valid change → stats = {}
- Every change must link to a specific action
- No “flavor” or narrative-based changes

Reasoning must:
- Identify the action
- Explain why it does or doesn’t affect stats

Examples:
"He pins her down and she cannot move"
→ strength up OR resistance down

"She avoids eye contact and speaks softly"
→ confidence down

"They chat casually"
→ no change

Return ONLY JSON.
`;

const default_message_prompt = `[Stat Descriptions]
 {{stat_descriptions}}
 {{character_stats}}
 [System Behavior]
 - Stats must always influence character actions, dialogue, and outcomes.
 - Higher stats subtly dominate interactions without explicitly referencing numbers.
 - Differences in stats should be reflected through tone, success, hesitation, or failure.
 - Never mention stats or calculations in dialogue or narration.`

const default_json_schema = {
    "stats": {
        "statName": "statValue"
    },
    "reason": "string",
    "blocked": {
        "is_blocked": "boolean",
        "block_reason": "string|null"
    }
}
const exampleJsonLayout = `Do not include any comments using // or /* */ as it is invalid in JSON.
Example JSON Output (do not output this):
{
    "stats": {{stats_as_example}},
    "reasoning": "...",
    "blocked": {
        "isBlocked": false,
        "replacementMessage": null
    }
}`

export const defaultSettings = {
    auxil_url: "http://localhost:3000",
    auxil_model: "qwen2.5:3b-instruct-q4_0",
    use_main_api_fallback: false,
    json_schema: default_json_schema,
    stat_gen_prompt: default_auxil_stat_gen_prompt,
    message_prompt: default_message_prompt,
    exampleJsonLayout: exampleJsonLayout,
    history_message_count: 10,
    stat_position: 1,
    stat_depth: 4,
    stat_worldinfo_included: false,
    profiles: [],
    default_font_size: 1, // Multiplier.
    stat_gen_temperature: 1.5,
    stat_gen_max_tokens: 200,
}