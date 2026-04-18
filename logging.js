
/**
 * @param {string} format
 */
function stringFormat(format) {
    const args = Array.prototype.slice.call(arguments, 1);
    return format.replace(/{(\d+)}/g, function (/** @type {any} */ match, /** @type {string | number} */ number) {
        return typeof args[number] != 'undefined'
            ? args[number]
            : match;
    });
}
/**
 * @param {string} message
 */
function logInfo(message, data = {}) {
    console.log("[Smarter RPG] " + message, data);
}
/**
 * @param {string} message
 */
function logWarn(message, data = {}) {
    console.warn("[Smarter RPG] " + message, data);
}
/**
 * @param {string} message
 */
function logError(message, data = {}) {
    console.error("[Smarter RPG] " + message, data);
}
/**
 * @param {any} message
 */
function toastInfo(message, data = {}, timeout = 3) {
    toastr.info(message, "Smarter RPG", {
        timeOut: timeout * 1000,
        extendedTimeOut: (timeout / 2) * 1000, // After hovering it will disappear twice as fast.
        closeButton: true,
        progressBar: true,
        ...data
    });
}
/**
 * @param {any} message
 */
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