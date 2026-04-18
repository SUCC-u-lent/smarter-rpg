import { awaitHtmlElement, getJQueryHtml } from "../../utilities/ExtensionUtilities.js";
import { runProfileTabUI } from "./profileHandler.js";

export async function setupSettingUI()
{
    const topSettingsMenu = await awaitHtmlElement(null,"#top-settings-holder")
    if (topSettingsMenu.length === 0) {throw new Error("Could not find top settings menu element")}
    const container = await getJQueryHtml("menu/rpg_topButton.html");
    topSettingsMenu.append(container);
    const toggleButton = await awaitHtmlElement(container,".drawer-toggle")
    const buttonVisual = await awaitHtmlElement(toggleButton, ".drawer-icon.fa-solid.fa-cubes.fa-fw.interactable")
    const drawerContent = await awaitHtmlElement(container,"#statai_extension_block")
    toggleButton.off("click").on("click",()=>{
        const isClosed = buttonVisual.hasClass("closedIcon")
        // For visual swap class closedIcon to openIcon
        if (isClosed){
            buttonVisual.removeClass("closedIcon").addClass("openIcon")
            drawerContent.removeClass("closedDrawer").addClass("openDrawer")
        } else {
            buttonVisual.removeClass("openIcon").addClass("closedIcon")
            drawerContent.removeClass("openDrawer").addClass("closedDrawer")
        }
    })
    const leftMenu = await awaitHtmlElement(container,"#statai_extensions_settings")
    const rightMenu = await awaitHtmlElement(container,"#statai_extensions_settings2")
    const bottomMenu = await awaitHtmlElement(container,"#statai_extensions_settings3")

    const connectivityTab = await getJQueryHtml("menu/connectivity_tab.html")
    leftMenu.append(connectivityTab)
    const profileTab = await getJQueryHtml("menu/profile_tab.html")
    bottomMenu.append(profileTab)
    runProfileTabUI(profileTab);
}


