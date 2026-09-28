use tauri::{
    AppHandle, Emitter, Runtime,
    menu::{Menu, MenuBuilder, MenuEvent, MenuItemBuilder, SubmenuBuilder},
};

use crate::commands::shell;

/// Event the UI listens to (MENU_ACTION_EVENT in src/api/native.api.ts).
pub const MENU_ACTION_EVENT: &str = "menu-action";

const OPEN_SETTINGS: &str = "open-settings";
const CHECK_UPDATES: &str = "check-updates";
const HOMEPAGE: &str = "homepage";

/// App-specific items only *announce* an action; the UI decides what it means.
fn menu_action(id: &str) -> Option<&'static str> {
    match id {
        OPEN_SETTINGS => Some(OPEN_SETTINGS),
        CHECK_UPDATES => Some(CHECK_UPDATES),
        _ => None,
    }
}

pub fn build<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<Menu<R>> {
    let settings = MenuItemBuilder::with_id(OPEN_SETTINGS, "Settings…")
        .accelerator("CmdOrCtrl+,")
        .build(app)?;
    let updates = MenuItemBuilder::with_id(CHECK_UPDATES, "Check for Updates…").build(app)?;
    let homepage = MenuItemBuilder::with_id(HOMEPAGE, "Project Homepage").build(app)?;

    let edit = SubmenuBuilder::new(app, "Edit")
        .undo()
        .redo()
        .separator()
        .cut()
        .copy()
        .paste()
        .select_all()
        .build()?;
    let view = SubmenuBuilder::new(app, "View").fullscreen().build()?;
    let window = SubmenuBuilder::new(app, "Window")
        .minimize()
        .maximize()
        .separator()
        .close_window()
        .build()?;
    let help = SubmenuBuilder::new(app, "Help").item(&homepage).build()?;

    let menu = MenuBuilder::new(app);
    let menu = if cfg!(target_os = "macos") {
        let app_menu = SubmenuBuilder::new(app, app.package_info().name.clone())
            .about(None)
            .separator()
            .item(&settings)
            .item(&updates)
            .separator()
            .services()
            .separator()
            .hide()
            .hide_others()
            .show_all()
            .separator()
            .quit()
            .build()?;
        menu.item(&app_menu)
    } else {
        let file = SubmenuBuilder::new(app, "File")
            .item(&settings)
            .item(&updates)
            .separator()
            .quit()
            .build()?;
        menu.item(&file)
    };
    menu.item(&edit)
        .item(&view)
        .item(&window)
        .item(&help)
        .build()
}

pub fn handle_event<R: Runtime>(app: &AppHandle<R>, event: MenuEvent) {
    let id = event.id().as_ref();
    if let Some(action) = menu_action(id) {
        if let Err(error) = app.emit(MENU_ACTION_EVENT, action) {
            log::warn!("could not emit menu action {action}: {error}");
        }
    } else if id == HOMEPAGE
        && let Err(error) = shell::open_in_browser(app, env!("CARGO_PKG_HOMEPAGE"))
    {
        log::warn!("could not open homepage: {error}");
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_app_items_become_ui_actions() {
        assert_eq!(menu_action("open-settings"), Some("open-settings"));
        assert_eq!(menu_action("check-updates"), Some("check-updates"));
        assert_eq!(menu_action("homepage"), None);
        assert_eq!(menu_action("quit"), None);
    }
}
