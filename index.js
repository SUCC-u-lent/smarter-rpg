import { logInfo, toastError } from "./extensionLogging.js";
import { extensionFolderPath, isActive, setActive, getPosition, setPosition } from "./constants.js";
import { setupExtensionMenu } from "./extension_settings_related/extensionmenu.js";
import { setupCharacterProfileMenu } from "./profile_setting_related/setup_profile_menu.js";
import { reloadDisplays, setupMessageObserver } from "./chat_mini_display/message_display.js";
import { setupChatEventHandler } from "./chat_embed/chat_event_handler.js";
import { setupToolVisual } from "./extension_wand/tool_visual.js";
import { setupExtensionConnectivity } from "./connectivity/extensionConnectivity.js";
import { checkAuxilStatus, checkOllamaStatus, setupEventListeners } from "./ai_handler/aiBackend.js";
import { getPlaceholderValue, setPlaceholderValue } from "./placeholderConstants.js";

jQuery(async () => {
  if (!await checkAuxilStatus())
  {
    toastError("Auxil is not online. Please start Auxil and refresh the page to use the Smarter RPG extension.", {}, 10);
    return;
  }
  if (!await checkOllamaStatus())
  {
    toastError("Ollama is not online. Please start Ollama and refresh the page to use the Smarter RPG extension.", {}, 10);
    return;
  }

  const settingsHtml = await $.get(`${extensionFolderPath}/html/example.html`);
  const $settings = $(settingsHtml);
  $("#extensions_settings2").append($settings); // Append to the right settings column
  const $settingsContainer = $settings.find(".inline-drawer-content").first();
  setupExtensionMenu($settingsContainer);
  setupExtensionConnectivity($settingsContainer)
  setupCharacterProfileMenu();
  setupMessageObserver();
  setupChatEventHandler();
  setupToolVisual();
  setupEventListeners()

  $("#statai-enabled-toggle").prop("checked", isActive()).trigger("change"); // Set the toggle based on the current active state.
  $("#statai-visual-position-selection").val(getPosition()).trigger("change"); // Set the dropdown based on the current position setting.
  const tempValue = $("#statai-ai-temperature");
  tempValue.val(getPlaceholderValue("ai_temperature")?.content || 0.7).on("change", function() {
    const value = parseFloat($(this).val());
    if (isNaN(value) || value < 0 || value > 2) {
      toastError("Please enter a valid number between 0 and 2 for AI Temperature.");
      $(this).val(getPlaceholderValue("ai_temperature")?.content || 0.7);
      return;
    }
    setPlaceholderValue("ai_temperature", {
      content: value,
      isDefault: false
    });
    logInfo("Smarter RPG AI Temperature set to " + value + ".");
    $(this).css("width", `calc(${Math.max(1, String($(this).val()).length)}ch + 5px)`);     
  });
  tempValue.css("width", `calc(${Math.max(1, String(tempValue.val()).length)}ch + 5px)`); // Set initial width based on value length

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