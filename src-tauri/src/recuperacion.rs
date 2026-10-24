//! Almacén de borradores de recuperación.
//!
//! Vive en el directorio de datos de la aplicación, escribe de forma atómica
//! y nunca guarda contenido en registros ni en rutas públicas.

use crate::errores::{mapear_io, ErrorApp};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Borrador {
    pub id_sesion: String,
    pub ruta_original: Option<String>,
    pub volcado: String,
    pub marca_tiempo: String,
}

pub struct AlmacenBorradores {
    directorio: PathBuf,
}

impl AlmacenBorradores {
    pub fn nuevo(base: PathBuf) -> Result<Self, ErrorApp> {
        let directorio = base.join("borradores");
        fs::create_dir_all(&directorio).map_err(mapear_io)?;
        Ok(Self { directorio })
    }

    pub fn escribir(&self, borrador: &Borrador) -> Result<(), ErrorApp> {
        let destino = self.ruta_de(&borrador.id_sesion)?;
        let json = serde_json::to_vec_pretty(borrador).map_err(|_| ErrorApp::ErrorRecoleccion)?;
        crate::archivo::escribir_atomico(&destino, &json)
    }

    pub fn listar(&self) -> Result<Vec<Borrador>, ErrorApp> {
        let mut borradores = Vec::new();
        let entradas = match fs::read_dir(&self.directorio) {
            Ok(entradas) => entradas,
            Err(_) => return Err(ErrorApp::ErrorRecoleccion),
        };
        for entrada in entradas.filter_map(|e| e.ok()) {
            if entrada.path().extension().and_then(|e| e.to_str()) != Some("json") {
                continue;
            }
            let Ok(bytes) = fs::read(entrada.path()) else {
                continue;
            };
            if let Ok(borrador) = serde_json::from_slice::<Borrador>(&bytes) {
                borradores.push(borrador);
            }
        }
        borradores.sort_by(|a, b| {
            let ia = a.marca_tiempo.parse::<u128>().unwrap_or(0);
            let ib = b.marca_tiempo.parse::<u128>().unwrap_or(0);
            ib.cmp(&ia)
        });
        Ok(borradores)
    }

    pub fn eliminar(&self, id_sesion: &str) -> Result<(), ErrorApp> {
        let ruta = self.ruta_de(id_sesion)?;
        if ruta.exists() {
            fs::remove_file(ruta).map_err(mapear_io)?;
        }
        Ok(())
    }

    fn ruta_de(&self, id_sesion: &str) -> Result<PathBuf, ErrorApp> {
        if !es_id_valido(id_sesion) {
            return Err(ErrorApp::RutaInvalida);
        }
        Ok(self.directorio.join(format!("{id_sesion}.json")))
    }
}

fn es_id_valido(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= 128
        && id
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

pub fn marca_tiempo_actual() -> String {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis().to_string())
        .unwrap_or_else(|_| "0".to_string())
}

#[tauri::command]
pub fn guardar_borrador(
    almacen: tauri::State<'_, AlmacenBorradores>,
    id_sesion: String,
    ruta_original: Option<String>,
    volcado: String,
) -> Result<(), ErrorApp> {
    let borrador = Borrador {
        id_sesion,
        ruta_original,
        volcado,
        marca_tiempo: marca_tiempo_actual(),
    };
    almacen.escribir(&borrador)
}

#[tauri::command]
pub fn cargar_borradores(
    almacen: tauri::State<'_, AlmacenBorradores>,
) -> Result<Vec<Borrador>, ErrorApp> {
    almacen.listar()
}

#[tauri::command]
pub fn descartar_borrador(
    almacen: tauri::State<'_, AlmacenBorradores>,
    id_sesion: String,
) -> Result<(), ErrorApp> {
    almacen.eliminar(&id_sesion)
}

#[cfg(test)]
mod pruebas {
    use super::*;

    fn almacen() -> (tempfile::TempDir, AlmacenBorradores) {
        let directorio = tempfile::tempdir().expect("temporal");
        let almacen = AlmacenBorradores::nuevo(directorio.path().to_path_buf()).expect("almacén");
        (directorio, almacen)
    }

    #[test]
    fn ciclo_completo_escribir_listar_eliminar() {
        let (_guardia, almacen) = almacen();
        let borrador = Borrador {
            id_sesion: "sesion-1".into(),
            ruta_original: Some("/tmp/nota.md".into()),
            volcado: "# Hola\n\nTexto".into(),
            marca_tiempo: marca_tiempo_actual(),
        };
        almacen.escribir(&borrador).expect("escribir");
        let lista = almacen.listar().expect("listar");
        assert_eq!(lista.len(), 1);
        assert_eq!(lista[0].volcado, "# Hola\n\nTexto");

        almacen.eliminar("sesion-1").expect("eliminar");
        assert!(almacen.listar().expect("listar vacío").is_empty());
    }

    #[test]
    fn rechaza_identificadores_con_rutas() {
        let (_guardia, almacen) = almacen();
        let borrador = Borrador {
            id_sesion: "../fuera".into(),
            ruta_original: None,
            volcado: "x".into(),
            marca_tiempo: "0".into(),
        };
        assert!(matches!(
            almacen.escribir(&borrador),
            Err(ErrorApp::RutaInvalida)
        ));
    }

    #[test]
    fn ignora_json_corrupto() {
        let (_guardia, almacen) = almacen();
        fs::write(almacen.directorio.join("roto.json"), b"{ no es json").expect("escribir");
        assert!(almacen.listar().expect("listar").is_empty());
    }
}
