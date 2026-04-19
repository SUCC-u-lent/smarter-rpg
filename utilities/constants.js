const extensionName = "smarter-rpg";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

function getExtensionName() { return extensionName; }
function getExtensionFolderPath() { return extensionFolderPath; }

export {
    getExtensionName,
    getExtensionFolderPath
}