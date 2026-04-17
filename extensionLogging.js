
function stringFormat(format) {
    const args = Array.prototype.slice.call(arguments, 1);
    return format.replace(/{(\d+)}/g, function (match, number) {
        return typeof args[number] != 'undefined'
            ? args[number]
            : match;
    });
}
function logInfo(message, data = {}) {
    console.log("[Smarter RPG] " + message, data);
}
function logWarn(message, data = {}) {
    console.warn("[Smarter RPG] " + message, data);
}
function logError(message, data = {}) {
    console.error("[Smarter RPG] " + message, data);
}
function toastInfo(message, data = {}, timeout = 3) {
    toastr.info(message, "Smarter RPG", {
        timeOut: timeout * 1000,
        extendedTimeOut: (timeout / 2) * 1000, // After hovering it will disappear twice as fast.
        closeButton: true,
        progressBar: true,
        ...data
    });
}
function toastError(message, data = {}, timeout = 3) {
    toastr.error(message, "Smarter RPG", {
        timeOut: timeout * 1000,
        extendedTimeOut: (timeout / 2) * 1000, // After hovering it will disappear twice as fast.
        closeButton: true,
        progressBar: true,
        ...data
    });
}

export { logInfo, logWarn, logError, toastInfo, toastError };