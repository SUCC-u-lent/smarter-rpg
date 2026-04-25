import { extensionEventSource, extensionEventTypes } from "../events/extension_events.js";
import ExtensionStorage from "../storage/ExtensionStorage.js";

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
let intervalHandler = null;
let hasAuxilBeenAvailable = false;

let isCheckingStatus = false; // Flag to prevent multiple simultaneous status checks

export function initHeartbeat()
{
    restartHeartbeat();
    if (intervalHandler) clearInterval(intervalHandler);
    intervalHandler = setInterval(async () => {
        await runHeartbeat();
    }, HEARTBEAT_INTERVAL);
    runHeartbeat().then(()=>{}).catch(()=>{})
}

export function restartHeartbeat()
{
    isCheckingStatus = true;
}

async function runHeartbeat()
{
    if (!isCheckingStatus) return; // If a status check is already in progress, skip this heartbeat
    const url = ExtensionStorage.get("auxil_url", ExtensionStorage.Defaults.auxil_url)+"/api/status";
    let statusCode = 500;
    try{
        const resultResponse = await fetch(url, { method: "GET" })
        statusCode = resultResponse.status;
        if (resultResponse.ok)
        {
            hasAuxilBeenAvailable = true;
            extensionEventSource.emit(extensionEventTypes.ON_AUXIL_STATUS_CHANGE, resultResponse.status);
            return;
        }
    }catch(e){ statusCode = 500; }
    if (hasAuxilBeenAvailable)
    {
        hasAuxilBeenAvailable = false;
        extensionEventSource.emit(extensionEventTypes.ON_AUXIL_CONNECTION_LOST);
        isCheckingStatus = false; // Reset the flag when connection is lost
        return;
    }
    extensionEventSource.emit(extensionEventTypes.ON_AUXIL_STATUS_CHANGE, statusCode);

}