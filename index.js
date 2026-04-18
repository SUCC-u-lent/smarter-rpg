import { setupChatVisuals } from "./chathandler/chatVisuals.js"
import { setupLogEventListeners } from "./events/ExtensionEvents.js"
import { setupCustomStyleClasses } from "./ui_handler/customStyleClassFramework.js"
import { setupSettingUI } from "./ui_handler/settings/setupSettingUI.js"
import { setupCharacterUI } from "./ui_handler/setupCharacterUI.js" // All imports must have their file extension specified.

jQuery(async()=>{
    // Always run first.
    setupLogEventListeners()

    await setupCustomStyleClasses()
    await setupSettingUI()
    
    // These depend on listeners registered by setupSettingUI, so must run after.
    setupCharacterUI()
    setupChatVisuals()
})