import { logInfo } from "./extensionLogging.js";
import { extensionFolderPath, setActive } from "./constants.js";
import { setupExtensionMenu } from "./extension_settings_related/extensionmenu.js";
import { setupCharacterProfileMenu } from "./profile_setting_related/setup_profile_menu.js";
import { setupMessageObserver } from "./chat_mini_display/message_display.js";

jQuery(async () => {
  const settingsHtml = await $.get(`${extensionFolderPath}/html/example.html`);
  const $settings = $(settingsHtml);
  $("#extensions_settings2").append($settings); // Append to the right settings column
  const $settingsContainer = $settings.find(".inline-drawer-content").first();
  setupExtensionMenu($settingsContainer);
  setupCharacterProfileMenu();
  setupMessageObserver();

  $("#statai-enabled-toggle").on("change", function() {
    const enabled = $(this).is(":checked");
    setActive(enabled);
    logInfo("Smarter RPG extension " + (enabled ? "enabled" : "disabled") + ".");
  });
});