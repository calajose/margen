//! Menú nativo mínimo (FR-001/FR-002/FR-004).

use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder};
use tauri::{AppHandle, Emitter, Runtime};

pub fn construir<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let nuevo = MenuItemBuilder::with_id("nuevo", "Nuevo")
        .accelerator("CmdOrCtrl+N")
        .build(app)?;
    let abrir = MenuItemBuilder::with_id("abrir", "Abrir…")
        .accelerator("CmdOrCtrl+O")
        .build(app)?;
    let guardar = MenuItemBuilder::with_id("guardar", "Guardar")
        .accelerator("CmdOrCtrl+S")
        .build(app)?;
    let guardar_como = MenuItemBuilder::with_id("guardar_como", "Guardar como…")
        .accelerator("CmdOrCtrl+Shift+S")
        .build(app)?;

    let archivo = SubmenuBuilder::new(app, "Archivo")
        .items(&[&nuevo, &abrir, &guardar, &guardar_como])
        .separator()
        .quit()
        .build()?;

    let concentracion = MenuItemBuilder::with_id("concentracion", "Concentración")
        .accelerator("F11")
        .build(app)?;
    let ver = SubmenuBuilder::new(app, "Ver")
        .items(&[&concentracion])
        .build()?;

    let menu = MenuBuilder::new(app).items(&[&archivo, &ver]).build()?;
    app.set_menu(menu)?;

    app.on_menu_event(|app, evento| {
        let id = evento.id().0.clone();
        let _ = app.emit("menu:accion", id);
    });

    Ok(())
}
