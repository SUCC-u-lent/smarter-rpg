/* eslint-disable func-style */
const defaultTimeout = 3,
    halfDivider = 2,
    msPerSecond = 1000;

function toastInfo(message, data = {}, timeout = defaultTimeout) {
    toastr.info(
        message,
        "Smarter RPG",
        {
            "closeButton": true,
            "extendedTimeOut": timeout / halfDivider * msPerSecond, // After hovering it will disappear twice as fast.
            "progressBar": true,
            "timeOut": timeout * msPerSecond,
            ...data,
        },
    );
}
function toastError(message, data = {}, timeout = defaultTimeout) {
    toastr.error(
        message,
        "Smarter RPG",
        {
            "closeButton": true,
            "extendedTimeOut": timeout / halfDivider * msPerSecond, // After hovering it will disappear twice as fast.
            "progressBar": true,
            "timeOut": timeout * msPerSecond,
            ...data,
        },
    );
}
export { toastError, toastInfo };