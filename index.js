import { setupAIExecutor } from "./aiHandler/aiExecutor.js"
import { setupChatVisuals } from "./chathandler/chatVisuals.js"
import { setupLogEventListeners } from "./events/ExtensionEvents.js"
import { setupCustomStyleClasses } from "./ui_handler/customStyleClassFramework.js"
import { setupConnectivitySettingUI } from "./ui_handler/settings/setupConnectivitySettingsUI.js"
import { setupPromptSettingsUI } from "./ui_handler/settings/setupPromptSettingsUI.js"
import { setupCharacterUI } from "./ui_handler/setupCharacterUI.js" // All imports must have their file extension specified.

jQuery(async()=>{
    // Always run first.
    setupLogEventListeners()

    await setupCustomStyleClasses()
    await setupConnectivitySettingUI()
    await setupPromptSettingsUI()
    
    // These depend on listeners registered by setupSettingUI, so must run after.
    setupCharacterUI()
    setupChatVisuals()
    setupAIExecutor()
})