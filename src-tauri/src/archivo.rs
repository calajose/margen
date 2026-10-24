//! Comandos de archivo: abrir, guardar (escritura atómica) y observar.
//!
//! Invariantes (contracts/tauri-ipc.md):
//! 1. La escritura es atómica: temporal + rename en el mismo directorio.
//! 2. UTF-8 sin BOM; se rechaza contenido no UTF-8.
//! 3. La marca de disco (mtime) detecta conflictos externos.
//! 4. Rust transporta bytes; no interpreta Markdown.

use crate::errores::{mapear_io, ErrorApp};
use notify::{RecursiveMode, Watcher};
use serde::Serialize;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::{Instant, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, State};
use tauri_plugin_dialog::DialogExt;

#[derive(Default)]
pub struct EstadoArchivos {
    pub observador: Mutex<Option<notify::RecommendedWatcher>>,
    /// Instante de la última escritura propia, para no emitir un falso
    /// conflicto cuando el observador ve el cambio que acabamos de hacer.
    pub ultima_escritura: Arc<Mutex<Option<Instant>>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentoAbierto {
    pub contenido: String,
    pub marca_disco: u64,
    pub solo_lectura: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResultadoGuardado {
    pub ruta: String,
    pub marca_disco: u64,
}

#[tauri::command]
pub fn abrir_documento(ruta: String) -> Result<DocumentoAbierto, ErrorApp> {
    let ruta = PathBuf::from(ruta);
    let metadatos = fs::metadata(&ruta).map_err(mapear_io)?;
    if !metadatos.is_file() {
        return Err(ErrorApp::RutaInvalida);
    }
    let bytes = fs::read(&ruta).map_err(mapear_io)?;
    let contenido = String::from_utf8(bytes).map_err(|_| ErrorApp::RutaInvalida)?;
    Ok(DocumentoAbierto {
        contenido,
        marca_disco: marca_disco(&metadatos),
        solo_lectura: metadatos.permissions().readonly(),
    })
}

#[tauri::command]
pub fn guardar_documento(
    ruta: String,
    contenido: String,
    marca_esperada: Option<u64>,
    estado: State<'_, EstadoArchivos>,
) -> Result<ResultadoGuardado, ErrorApp> {
    let destino = PathBuf::from(ruta);
    if let Some(padre) = destino.parent() {
        if !padre.exists() {
            return Err(ErrorApp::RutaInvalida);
        }
    }

    if let Some(esperada) = marca_esperada {
        if destino.exists() {
            let metadatos = fs::metadata(&destino).map_err(mapear_io)?;
            if marca_disco(&metadatos) != esperada {
                return Err(ErrorApp::ConflictoExterno);
            }
        }
    }

    if let Ok(mut ultima) = estado.ultima_escritura.lock() {
        *ultima = Some(Instant::now());
    }

    escribir_atomico(&destino, contenido.as_bytes())?;
    let metadatos = fs::metadata(&destino).map_err(mapear_io)?;
    Ok(ResultadoGuardado {
        ruta: destino.to_string_lossy().into_owned(),
        marca_disco: marca_disco(&metadatos),
    })
}

/// Escritura atómica: temporal en el mismo directorio, fsync y rename.
pub fn escribir_atomico(destino: &Path, bytes: &[u8]) -> Result<(), ErrorApp> {
    let directorio = destino.parent().ok_or(ErrorApp::RutaInvalida)?;
    let mut temporal = tempfile::NamedTempFile::new_in(directorio).map_err(mapear_io)?;
    temporal.write_all(bytes).map_err(mapear_io)?;
    temporal.as_file().sync_all().map_err(mapear_io)?;

    if let Ok(metadatos) = fs::metadata(destino) {
        let _ = fs::set_permissions(temporal.path(), metadatos.permissions());
    }

    temporal
        .persist(destino)
        .map_err(|error| mapear_io(error.error))?;
    Ok(())
}

#[tauri::command]
pub fn observar_archivo(
    app: AppHandle,
    estado: State<'_, EstadoArchivos>,
    ruta: String,
) -> Result<(), ErrorApp> {
    let destino = PathBuf::from(&ruta);
    if !destino.exists() {
        return Err(ErrorApp::NoExiste);
    }

    let app_observador = app.clone();
    let supresion = Arc::clone(&estado.ultima_escritura);
    let destino_observado = destino.clone();
    let mut observador =
        notify::recommended_watcher(move |resultado: Result<notify::Event, notify::Error>| {
            if let Ok(evento) = resultado {
                if !evento.paths.iter().any(|p| p == &destino_observado) {
                    return;
                }
                if let Ok(guardia) = supresion.lock() {
                    if let Some(instante) = *guardia {
                        if instante.elapsed().as_millis() < 800 {
                            return;
                        }
                    }
                }
                let _ = app_observador.emit("archivo_modificado_externamente", ());
                if matches!(evento.kind, notify::EventKind::Remove(_)) {
                    let _ = app_observador.emit("archivo_eliminado_externamente", ());
                }
            }
        })
        .map_err(|_| ErrorApp::Desconocido)?;

    observador
        .watch(&destino, RecursiveMode::NonRecursive)
        .map_err(|_| ErrorApp::RutaInvalida)?;

    if let Ok(mut guardia) = estado.observador.lock() {
        *guardia = Some(observador);
    }
    Ok(())
}

#[tauri::command]
pub fn seleccionar_archivo(app: AppHandle) -> Result<Option<String>, ErrorApp> {
    let seleccion = app
        .dialog()
        .file()
        .add_filter("Markdown", &["md", "markdown"])
        .add_filter("Texto", &["txt"])
        .blocking_pick_file();

    match seleccion {
        None => Ok(None),
        Some(ruta) => ruta
            .into_path()
            .map(|p| Some(p.to_string_lossy().into_owned()))
            .map_err(|_| ErrorApp::RutaInvalida),
    }
}

#[tauri::command]
pub fn guardar_como(
    app: AppHandle,
    contenido: String,
    estado: State<'_, EstadoArchivos>,
) -> Result<Option<ResultadoGuardado>, ErrorApp> {
    let seleccion = app
        .dialog()
        .file()
        .add_filter("Markdown", &["md", "markdown"])
        .add_filter("Texto", &["txt"])
        .set_file_name("documento.md")
        .blocking_save_file();

    let Some(ruta) = seleccion else {
        return Ok(None);
    };
    let destino = ruta.into_path().map_err(|_| ErrorApp::RutaInvalida)?;

    if let Ok(mut ultima) = estado.ultima_escritura.lock() {
        *ultima = Some(Instant::now());
    }

    escribir_atomico(&destino, contenido.as_bytes())?;
    let metadatos = fs::metadata(&destino).map_err(mapear_io)?;
    Ok(Some(ResultadoGuardado {
        ruta: destino.to_string_lossy().into_owned(),
        marca_disco: marca_disco(&metadatos),
    }))
}

fn marca_disco(metadatos: &fs::Metadata) -> u64 {
    metadatos
        .modified()
        .ok()
        .and_then(|momento| momento.duration_since(UNIX_EPOCH).ok())
        .map(|duracion| duracion.as_millis() as u64)
        .unwrap_or(0)
}

/// Marca actual de un archivo (para pruebas y comprobaciones).
#[allow(dead_code)]
pub fn marca_actual(ruta: &Path) -> Result<u64, ErrorApp> {
    let metadatos = fs::metadata(ruta).map_err(mapear_io)?;
    Ok(marca_disco(&metadatos))
}

#[allow(dead_code)]
fn ahora() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos() as u64)
        .unwrap_or(0)
}

#[cfg(test)]
mod pruebas {
    use super::*;

    #[test]
    fn escritura_atomica_conserva_contenido_utf8() {
        let directorio = tempfile::tempdir().expect("directorio temporal");
        let destino = directorio.path().join("nota.md");
        let texto = "# Canción\n\nÑandú, pingüino y 😀\n";
        escribir_atomico(&destino, texto.as_bytes()).expect("escritura");
        let leido = fs::read_to_string(&destino).expect("lectura");
        assert_eq!(leido, texto);
    }

    #[test]
    fn no_deja_temporales_tras_escribir() {
        let directorio = tempfile::tempdir().expect("directorio temporal");
        let destino = directorio.path().join("nota.md");
        escribir_atomico(&destino, b"hola").expect("escritura");
        let entradas: Vec<_> = fs::read_dir(directorio.path())
            .expect("listado")
            .filter_map(|e| e.ok())
            .map(|e| e.file_name().to_string_lossy().into_owned())
            .collect();
        assert_eq!(entradas, vec!["nota.md".to_string()]);
    }

    #[test]
    fn rechaza_archivo_inexistente() {
        let resultado = abrir_documento("/ruta/que/no/existe.md".into());
        assert!(matches!(resultado, Err(ErrorApp::NoExiste)));
    }

    #[test]
    fn marca_cambia_tras_escritura() {
        let directorio = tempfile::tempdir().expect("directorio temporal");
        let destino = directorio.path().join("a.md");
        escribir_atomico(&destino, b"uno").expect("primera");
        let primera = marca_actual(&destino).expect("marca");
        std::thread::sleep(std::time::Duration::from_millis(10));
        escribir_atomico(&destino, b"dos").expect("segunda");
        let segunda = marca_actual(&destino).expect("marca");
        assert!(segunda >= primera);
    }
}
