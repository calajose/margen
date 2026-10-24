//! Errores tipados del puente IPC (contracts/tauri-ipc.md).
//!
//! Nunca incluyen contenido del usuario: solo un código estable que el
//! frontend traduce a un mensaje en español.

use serde::ser::{Serialize, Serializer};

#[derive(Debug, thiserror::Error)]
pub enum ErrorApp {
    #[error("no_existe")]
    NoExiste,
    #[error("sin_permiso")]
    SinPermiso,
    #[error("ruta_invalida")]
    RutaInvalida,
    #[error("disco_no_disponible")]
    DiscoNoDisponible,
    #[error("conflicto_externo")]
    ConflictoExterno,
    #[error("cancelado")]
    #[allow(dead_code)]
    Cancelado,
    #[error("error_recoleccion")]
    ErrorRecoleccion,
    #[error("desconocido")]
    Desconocido,
}

impl Serialize for ErrorApp {
    fn serialize<S>(&self, serializador: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializador.serialize_str(&self.to_string())
    }
}

/// Traduce errores de E/S a códigos tipados sin filtrar rutas ni contenido.
pub fn mapear_io(error: std::io::Error) -> ErrorApp {
    use std::io::ErrorKind;
    match error.kind() {
        ErrorKind::NotFound => ErrorApp::NoExiste,
        ErrorKind::PermissionDenied => ErrorApp::SinPermiso,
        ErrorKind::InvalidInput => ErrorApp::RutaInvalida,
        _ => ErrorApp::DiscoNoDisponible,
    }
}
