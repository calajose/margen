import type { Documento } from '../documento/documento';
import type { PuertoArchivos } from '../persistencia/ipc';

export type ResolucionConflicto = 'recargar' | 'sobrescribir' | 'conservar';

export interface DialogoConflicto {
  preguntar(ruta: string | null): Promise<ResolucionConflicto>;
}

/**
 * Flujo de conflicto externo (US3 escenario 2).
 *
 * El autoguardado queda suspendido porque el documento entra en estado
 * `conflicto`; el archivo original no se sobrescribe sin confirmación.
 */
export class GestorConflicto {
  private readonly documento: Documento;
  private readonly puerto: PuertoArchivos;
  private readonly dialogo: DialogoConflicto;
  private abierto = false;

  constructor(
    documento: Documento,
    puerto: PuertoArchivos,
    dialogo: DialogoConflicto,
  ) {
    this.documento = documento;
    this.puerto = puerto;
    this.dialogo = dialogo;
  }

  get hayConflicto(): boolean {
    return this.documento.estadoGuardado === 'conflicto';
  }

  /** Se invoca al recibir `archivo_modificado_externamente`. */
  async manejarCambioExterno(): Promise<void> {
    if (this.abierto) return;
    this.abierto = true;
    this.documento.cambioExterno();
    try {
      const ruta = this.documento.ruta;
      const decision = await this.dialogo.preguntar(ruta);

      if (decision === 'recargar') {
        if (!ruta) return;
        const externo = await this.puerto.abrir(ruta);
        this.documento.aceptarContenidoExterno(externo.contenido, externo.marcaDisco);
        return;
      }

      if (decision === 'sobrescribir') {
        if (!ruta) return;
        // El usuario confirmó explícitamente: se escribe sin comprobar la
        // marca de disco, que es precisamente la que cambió.
        const resultado = await this.puerto.guardar(ruta, this.documento.fuente, null);
        this.documento.guardadoOk(resultado.ruta ?? ruta, resultado.marcaDisco);
        return;
      }

      // Conservar los cambios locales: el documento sigue sucio y sin
      // sobrescribir; el próximo guardado explícito volverá a comprobar.
      this.documento.conflictoResuelto();
    } finally {
      this.abierto = false;
    }
  }
}

/** Diálogo basado en `confirm`/prompt nativo del contenedor para el MVP. */
export function dialogoConflictoNativo(): DialogoConflicto {
  return {
    async preguntar(ruta) {
      const nombre = ruta ?? 'el documento';
      const recargar = globalThis.confirm(
        `${nombre} cambió fuera de Margen.\n\nAceptar: recargar la versión del disco (se pierden los cambios locales).\nCancelar: conservar los cambios locales.`,
      );
      if (recargar) return 'recargar';
      const sobrescribir = globalThis.confirm(
        '¿Sobrescribir el archivo del disco con tus cambios locales?\n\nAceptar: sobrescribir.\nCancelar: conservar sin guardar.',
      );
      return sobrescribir ? 'sobrescribir' : 'conservar';
    },
  };
}
