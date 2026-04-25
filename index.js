import { loadListeners } from "./events/extension_events.js";
import loadUI from "./ui/uiLoader.js";
import wireUI from "./ui/uiSetup.js";
import { loadChat } from "./chat/chat_loader.js";
import { renderCharacterPlacementUI } from "./characterdata/rendering/wireCharacterPlacementUI.js";
import {initHeartbeat} from "./ai/ai_heartbeat.js";

jQuery(async () => {
    loadListeners();
    
    await wireUI();
    loadUI();
    await renderCharacterPlacementUI();
    initHeartbeat();

    loadChat();
});
