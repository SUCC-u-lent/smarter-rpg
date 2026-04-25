import ChatMessageData from "../../characterdata/message_data.js";
import { getMessageAuthorDefaultProfile } from "../../utilities/ExtensionUtilities.js";
import { toastInfo } from "../../utilities/logging.js";

export default function addMessageRenderers()
{
    const messages = $(".mes")
    messages.each((index, message) => {
        const messageElement = $(message)
        const messageParent = messageElement.find(".mes_text")
        
        let statsBreakline = messageElement.find(".stats-breakline")
        if (statsBreakline.length > 0) {statsBreakline.remove()}
        statsBreakline = $("<hr>").addClass("stats-breakline").addClass("sysHR")
        messageParent.append(statsBreakline)

        let statsContainer = messageElement.find(".stats-container")
        if (statsContainer.length > 0) {statsContainer.remove()}
        statsContainer = $("<div>").addClass("stats-container")
        messageParent.append(statsContainer)

        const authorDefaultProfile = getMessageAuthorDefaultProfile(messageElement);
        const messageData = ChatMessageData.canConvertMessage(messageElement) ? ChatMessageData.convertFromMessage(messageElement) : null;
        messageData?.verifyStats();
        const stats = messageData?.getStats() || {};
        if (authorDefaultProfile)
        {
            const profileStats = authorDefaultProfile.getStats() || [];
            for (const statData of profileStats)
            {
                const statName = statData.getName();
                if (stats[statName] === undefined) // Only add the stat from the profile if it's not already set in the message stats, to avoid overwriting any message-specific stat values.
                {
                    stats[statName] = statData.getDefaultValue();
                }
            }
        }
        if (messageData && stats && Object.keys(stats).length > 0)
        {
            const messageId = messageData.getMessageId();
            for (const statName in stats)
            {
                const originalValue = stats[statName];
                let statValue = stats[statName];
                const statElement = $("<div>").addClass("statai-stat").addClass("interactable").text(`${statName}: ${statValue}`);
                statElement.on("click", () => {
                    const newValue = prompt(`Enter a new value for ${statName}:`, statValue);
                    if (newValue !== null && newValue !== statValue) // Only update if the value has actually changed, to avoid unnecessary updates.
                    {
                        // get the original values type
                        const originalType = typeof originalValue;
                        // Try to convert the new value to the original type
                        let convertedValue;
                        try {
                            if (originalType === "number") {
                                convertedValue = parseFloat(newValue);
                                if (isNaN(convertedValue)) throw new Error("Invalid number");
                            }
                            else if (originalType === "boolean") {
                                convertedValue = newValue.toLowerCase() === "true";
                            }
                            else {
                                convertedValue = newValue; // Assume string if it's not a number or boolean
                            }
                        } catch (e) {
                            alert(`Invalid value type. Expected a ${originalType}.`);
                            return;
                        }
                        statElement.text(`${statName}: ${convertedValue}`);
                        toastInfo(`Updated stat "${statName}" to ${convertedValue} for message "${messageId}"`);
                        messageData.setStat(statName, convertedValue).save();
                        statValue = convertedValue; // Update the statValue variable so that if the user clicks the stat again, the prompt will show the updated value.
                    }
                });
                statsContainer.append(statElement);
            }
        } else {
            statsContainer.append($("<div>").addClass("statai-stat").text("No stats"));
        }
    });
}