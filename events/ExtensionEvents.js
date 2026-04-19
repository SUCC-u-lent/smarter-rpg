import { EventEmitter } from "../../../../../lib/eventemitter.js";

export const extensionEventTypes = {
    RELOAD_ACTIVE_CHARACTER_SELECTED: 'reload_active_character_selected',
    RELOAD_PERSONA_SELECTED: 'reload_persona_selected',
    ACTIVE_CHARACTER_PROFILE_CHANGED: 'active_character_profile_changed',
    ACTIVE_PERSONA_PROFILE_CHANGED: 'active_persona_profile_changed',
    CREATE_PROFILE: 'create_profile',
    CLEAR_PROFILES: 'clear_profiles',
    PROFILE_LOADED: 'profile_loaded',
    RELOAD_CHAT_VISUALS: 'reload_chat_visuals',
    EXTENSION_ENABLED_CHANGED: 'extension_enabled_changed',
    FONT_SIZE_CHANGED: 'font_size_changed',
    CONFIG_SAVED: 'config_saved',
    SETTINGS_SAVED: 'settings_saved',
    CONNECTION_URL_CHANGED: 'connection_url_changed',
    CONNECTION_STATUS_CHANGED: 'connection_status_changed',
    CONNECTION_LOST: 'connection_lost',
    MODEL_CHANGED: 'model_changed',
    CACHE_CLEARED: 'cache_cleared',
};

export const extensionEventSource = new EventEmitter([]);

export function setupLogEventListeners()
{
    console.log("setupLogEventListeners() called");
    console.log("extensionEventSource:", extensionEventSource);
    console.log("extensionEventTypes:", extensionEventTypes);
    
    for (const eventType in extensionEventTypes) {
        // @ts-ignore
        const eventValue = extensionEventTypes[eventType];
        console.log(`Registering listener for: ${eventValue}`);
        extensionEventSource.on(eventValue, () => {
            console.log(`Event: ${eventValue} Emitted.`);
        });
    }
    console.log("setupLogEventListeners() finished registering all listeners");
}