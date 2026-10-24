export type EstadoGuardado =
  | 'limpia'
  | 'sucia'
  | 'guardando'
  | 'error'
  | 'conflicto';

export type EventoGuardado =
  | 'editar'
  | 'guardar_iniciado'
  | 'guardado_ok'
  | 'guardado_error'
  | 'cambio_externo'
  | 'conflicto_resuelto'
  | 'borrador_restaurado';

/**
 * Máquina de estados de guardado (data-model.md).
 *
 * Invariante: el autoguardado NO altera el estado del archivo original; solo
 * los eventos de guardado explícito lo hacen. Por eso no existe evento
 * `autoguardado_ok` en esta tabla.
 */
export function transicion(
  estado: EstadoGuardado,
  evento: EventoGuardado,
): EstadoGuardado {
  switch (evento) {
    case 'editar':
      return estado === 'guardando' ? 'guardando' : 'sucia';
    case 'guardar_iniciado':
      return 'guardando';
    case 'guardado_ok':
      return 'limpia';
    case 'guardado_error':
      return 'error';
    case 'cambio_externo':
      return 'conflicto';
    case 'conflicto_resuelto':
      return 'sucia';
    case 'borrador_restaurado':
      return 'sucia';
    default: {
      const _exhaustivo: never = evento;
      return _exhaustivo;
    }
  }
}
