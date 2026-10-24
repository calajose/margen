//! Control de ventana para el modo concentración (FR-016).

use crate::errores::ErrorApp;
use tauri::{AppHandle, Manager};

#[tauri::command]
pub fn ventana_pantalla_completa(app: AppHandle, activo: bool) -> Result<(), ErrorApp> {
    let ventana = app
        .get_webview_window("main")
        .ok_or(ErrorApp::Desconocido)?;
    ventana
        .set_fullscreen(activo)
        .map_err(|_| ErrorApp::Desconocido)?;
    Ok(())
}
