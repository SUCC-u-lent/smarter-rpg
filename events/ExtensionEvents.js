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
};

export const extensionEventSource = new EventEmitter([]);

export function setupLogEventListeners()
{
    console.log("setupLogEventListeners() called");
    console.log("extensionEventSource:", extensionEventSource);
    console.log("extensionEventTypes:", extensionEventTypes);
    
    for (const eventType in extensionEventTypes) {
        const eventValue = extensionEventTypes[eventType];
        console.log(`Registering listener for: ${eventValue}`);
        extensionEventSource.on(eventValue, () => {
            console.log(`Event: ${eventValue} Emitted.`);
        });
    }
    console.log("setupLogEventListeners() finished registering all listeners");
}