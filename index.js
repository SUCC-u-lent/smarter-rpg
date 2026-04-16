import { logInfo } from "./extensionLogging.js";
import { extensionFolderPath, isActive, setActive, getPosition, setPosition } from "./constants.js";
import { setupExtensionMenu } from "./extension_settings_related/extensionmenu.js";
import { setupCharacterProfileMenu } from "./profile_setting_related/setup_profile_menu.js";
import { reloadDisplays, setupMessageObserver } from "./chat_mini_display/message_display.js";
import { setupChatEventHandler } from "./chat_embed/chat_event_handler.js";
import { setupToolVisual } from "./extension_wand/tool_visual.js";

jQuery(async () => {
  const settingsHtml = await $.get(`${extensionFolderPath}/html/example.html`);
  const $settings = $(settingsHtml);
  $("#extensions_settings2").append($settings); // Append to the right settings column
  const $settingsContainer = $settings.find(".inline-drawer-content").first();
  setupExtensionMenu($settingsContainer);
  setupCharacterProfileMenu();
  setupMessageObserver();
  setupChatEventHandler();
  setupToolVisual();

  $("#statai-enabled-toggle").prop("checked", isActive()).trigger("change"); // Set the toggle based on the current active state.
  $("#statai-visual-position-selection").val(getPosition()).trigger("change"); // Set the dropdown based on the current position setting.

  $("#statai-enabled-toggle").on("change", function() {
    const enabled = $(this).is(":checked");
    setActive(enabled);
    logInfo("Smarter RPG extension " + (enabled ? "enabled" : "disabled") + ".");
    reloadDisplays(); // Reload displays to reflect the change immediately.
  });

  $("#statai-visual-position-selection").on("change", function() {
    const position = $(this).val();
    setPosition(position);
    logInfo("Smarter RPG visual position set to " + position + ".");
    reloadDisplays(); // Reload displays to reflect the change immediately.
  });
});