import { event_types, eventSource } from "../../../../events.js";
import { callGenericPopup, POPUP_TYPE } from "../../../../popup.js";
import { extensionFolderPath } from "../constants.js";

async function doToolSetup()
{
    const container = $(`<div class="tool_visual_container">
        <h2>Smarter RPG Tool</h2>
    </div>`);
    
    container.append(`
        <span>Stat Name: </span><input class="statai-input" id="tool_stat_name" type="number"/><br/>
        <span>Stat Description: </span><input class="statai-input" id="tool_stat_description" type="text"/><br/>
        <span>Stat Value: </span><input class="statai-input" id="tool_stat_value" type="text"/><br/>
        <span>Example Message: </span><textarea id="tool_example_message" placeholder="The messages to be evaluated by the AI, in their raw format, so characters have to have their names included"></textarea><br/>
        <input class="statai-input" type="button" id="tool_submit_request" value="Submit Request"/><br/>
        <span>Stat Output: </span><textarea id="tool_stat_output" disabled placeholder="The output of the AI evaluation for the given stat" title="The output area the AI response will be displayed in. Cannot be edited."></textarea>
    `);

    const submitButton = container.find("#tool_submit_request");
    submitButton.on("click", function() {
        const statName = $("#tool_stat_name").val();
        const statDescription = $("#tool_stat_description").val();
        const statValue = $("#tool_stat_value").val();
        const exampleMessage = $("#tool_example_message").val();
        // No prompt system yet.
        submitButton.prop("disabled", true); // Disabled until the response is recieved.
        submitButton.prop("title","Waiting for response...");
    });

    callGenericPopup(container, POPUP_TYPE.TEXT, '', { wide: true, large: true, allowVerticalScrolling: true });
}

async function setupToolVisual()
{ // Adds a tool to the wand to test the backend model.
    const toolHtml = $(await $.get(`${extensionFolderPath}/html/extensionOptionsContent.html`));
    eventSource.on(event_types.EXTENSION_SETTINGS_LOADED, () => {
        $("#extensionsMenu").append(toolHtml);
        toolHtml.on("click",doToolSetup)
    });
}

export { setupToolVisual }