import { event_types, eventSource } from "../../../../../events.js";
import ExtensionStorage from "../../storage/ExtensionStorage.js";
import StatProfile from "../stat_profile.js";
import { awaitJQueryElement } from "../../utilities/ExtensionUtilities.js";
import { extensionEventSource, extensionEventTypes } from "../../events/extension_events.js";
import CharacterStorage from "../../storage/CharacterStorage.js";
import GlobalCharacter from "../global_character.js";

export async function renderCharacterPlacementUI()
{
    const soloContainer = await awaitJQueryElement("#right-nav-panel .scrollableInner #rm_ch_create_block #form_create");
    const personaContainer = await awaitJQueryElement("#persona-management-block .persona_management_current_persona")
    extensionEventSource.on(extensionEventTypes.ON_RELOAD_CHARACTER_MENUS, async()=>{
        await loadCharacterEditorSelectMenu(soloContainer);
        await loadCharacterEditorSelectMenu(personaContainer, true);
    })
    eventSource.on(event_types.CHAT_CHANGED, async ()=>{
        await loadCharacterEditorSelectMenu(soloContainer);
        await loadCharacterEditorSelectMenu(personaContainer, true);
    })
    loadCharacterEditorSelectMenu(soloContainer).then(()=>{}) // Don't want this blocking.
    loadCharacterEditorSelectMenu(personaContainer, true).then(()=>{}) // Don't want this blocking.
}

async function loadCharacterEditorSelectMenu(container, isPersona = false)
{
    let characterName;
    if (isPersona){
        const jqueryelementvalue = await awaitJQueryElement(".persona_management_right_column h5.persona_name")
        if (!jqueryelementvalue){
            console.warn("Could not find character name element for persona management menu.");
            return;
        }
        characterName = jqueryelementvalue.text()
    } else {
        const jqueryelementvalue = await awaitJQueryElement("#rm_button_selected_ch h2.interactable")
        if (!jqueryelementvalue){
            console.warn("Could not find character name element for character creation menu.");
            return;
        }
        characterName = jqueryelementvalue.text()
    }
    if (!characterName){
        console.warn("Could not determine character name for character editor select menu.");
        return;
    }
    let selectDropDown = container.find("select#statai_character_profile_select");
    if (selectDropDown.length === 0)
    {
        selectDropDown = $("<select id='statai_character_profile_select'></select>");
        container.append(selectDropDown);
    }
    selectDropDown.empty();
    selectDropDown.append(`<option value="" selected>Select a Profile</option>`);
    /** @type {StatProfile[]} */
    const profiles = ExtensionStorage.get("profiles", ExtensionStorage.Defaults.profiles)
        .map(profile => StatProfile.decompile(profile));
    if (profiles.length !== 0)
    {
        for (const profile of profiles)
        { selectDropDown.append(`<option value="${profile.getName()}">${profile.getName()}</option>`); }
    }
    const char = GlobalCharacter.getByName(characterName);
    if (!char){
        console.warn(`Could not find character with name "${characterName}"`);
        return;
    }
    selectDropDown.off("change").on("change", (event) => {
        const selectedProfileName = $(event.target).val();
        const selectedProfile = profiles.find(p => p.getName() === selectedProfileName);
        if (selectedProfile){
            extensionEventSource.emit(extensionEventTypes.CHARACTER_PROFILE_SELECTED, { profile: selectedProfile, isPersona });
            char.setActiveProfile(selectedProfile.getName()).save();
            console.log(`Set active profile for character "${characterName}" to "${selectedProfile.getName()}"`); // Debug log
            extensionEventSource.emit(extensionEventTypes.ON_RELOAD_CHAT); // Reload menus to update the selected profile in the dropdown.
        }
    });
    selectDropDown.val(char.getActiveProfile() || "").trigger("change"); // Set the dropdown to the character's active profile, or default to the placeholder if none is set.
}