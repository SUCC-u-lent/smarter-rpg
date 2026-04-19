import { extensionEventSource, extensionEventTypes } from "../events/ExtensionEvents.js";
import { toastError } from "../logging.js";
import { getGlobalExtensionStorage } from "../storage_systems/GlobalExtensionStorage.js";

/**
 * @type {NodeJS.Timeout | undefined}
 */
let heartbeatInterval = undefined;
let failedHeartbeats = 0;
let successfulHeartbeats = 0;
export function setupAIHeartbeat()
{
    extensionEventSource.on(extensionEventTypes.CONNECTION_URL_CHANGED, function()
    {
        successfulHeartbeats = 0;
        failedHeartbeats = 0;
        sendHeartbeat();
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
        }
        heartbeatInterval = setInterval(sendHeartbeat, 30000);
    })
    extensionEventSource.on(extensionEventTypes.CONNECTION_LOST, function(){
        successfulHeartbeats = 0; // Just to make sure it doesn't spam.
        toastError("Connection to Auxil lost! Check your connection and settings or make sure Auxil is running.");
    })
}
export function resetAIHeartbeatAttempts()
{
    failedHeartbeats = 0;
    successfulHeartbeats = 0;
}

function sendHeartbeat()
{
    if (failedHeartbeats >= 3) {
        return;
    }
    console.log("Sending heartbeat to AI with URL:", getGlobalExtensionStorage().getConfig().getConnectivity().getBackendUrl());
    const url = getGlobalExtensionStorage().getConfig().getConnectivity().getBackendUrl();
    fetch(url + "/api/status", {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
    }).then(response => {
        if (!response.ok) {
            console.error("Heartbeat failed with status:", response.status);
            failedHeartbeats++;
            extensionEventSource.emit(extensionEventTypes.CONNECTION_STATUS_CHANGED, response.status, response.statusText);
        } else {
            successfulHeartbeats++;
            extensionEventSource.emit(extensionEventTypes.CONNECTION_STATUS_CHANGED, response.status, response.statusText);
        }
    }).catch(error => {
        console.error("Heartbeat request failed:", error);
        failedHeartbeats++;
        extensionEventSource.emit(extensionEventTypes.CONNECTION_STATUS_CHANGED, 500, error.message);
    });
    if (failedHeartbeats >= 3) {
        console.error("Failed to connect to AI after 3 attempts, will stop trying until connection URL changes.");
        if (successfulHeartbeats > 0)
        {extensionEventSource.emit(extensionEventTypes.CONNECTION_LOST)}
        extensionEventSource.emit(extensionEventTypes.CONNECTION_STATUS_CHANGED, 429, "Failed to connect to Auxil after 3 attempts");
    }
}