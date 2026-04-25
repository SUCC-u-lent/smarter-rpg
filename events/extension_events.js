import { EventEmitter } from "../../../../../lib/eventemitter.js";


export const extensionEventTypes = {
    MUTATION_OBSERVED: "mutation_observed",
    ON_RELOAD_CHAT: "on_reload_chat",
    ON_RELOAD_CHARACTER_MENUS: "on_reload_character_menus",
    CHARACTER_PROFILE_SELECTED: "character_profile_selected",
    ON_AUXIL_STATUS_CHANGE: "on_auxil_status_change",
    ON_AUXIL_CONNECTION_LOST: "on_auxil_connection_lost",
};

export const extensionEventSource = new EventEmitter();

export function loadListeners()
{
    Object.values(extensionEventTypes).forEach(type => {
        extensionEventSource.on(type, () => {
            console.log(`Event ${type} triggered`);
        });
    });
}