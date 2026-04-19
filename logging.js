
/**
 * @param {any} message
 */
function toastInfo(message, data = {}, timeout = 3) {
    // @ts-ignore
    toastr.info(message, "Smarter RPG", {
        timeOut: timeout * 1000,
        extendedTimeOut: (timeout / 2) * 1000, // After hovering it will disappear twice as fast.
        closeButton: true,
        progressBar: true,
        ...data
    });
}
// @ts-ignore
function toastError(message, data = {}, timeout = 3) {
    // @ts-ignore
    toastr.error(message, "Smarter RPG", {
        timeOut: timeout * 1000,
        extendedTimeOut: (timeout / 2) * 1000, // After hovering it will disappear twice as fast.
        closeButton: true,
        progressBar: true,
        ...data
    });
}
export { toastError, toastInfo };