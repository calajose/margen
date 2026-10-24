//! Margen: backend mínimo.
//!
//! Rust solo transporta bytes y gestiona ventana, diálogos, observación de
//! archivos y borradores de recuperación. El Markdown nunca se interpreta aquí.

mod archivo;
mod errores;
mod menu;
mod recuperacion;
mod ventana;

use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(archivo::EstadoArchivos::default())
        .setup(|app| {
            let base = app.path().app_data_dir()?;
            let almacen = recuperacion::AlmacenBorradores::nuevo(base)
                .map_err(|error| Box::<dyn std::error::Error>::from(error.to_string()))?;
            app.manage(almacen);
            menu::construir(&app.handle().clone())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            archivo::abrir_documento,
            archivo::guardar_documento,
            archivo::guardar_como,
            archivo::seleccionar_archivo,
            archivo::observar_archivo,
            recuperacion::guardar_borrador,
            recuperacion::cargar_borradores,
            recuperacion::descartar_borrador,
            ventana::ventana_pantalla_completa,
        ])
        .run(tauri::generate_context!())
        .expect("error al iniciar Margen");
}
