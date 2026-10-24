import type { Documento } from '../documento/documento';
import type { Borrador, PuertoArchivos } from '../persistencia/ipc';

export interface DialogoRecuperacion {
  preguntar(borrador: Borrador): Promise<boolean>;
}

/**
 * Recuperación al arrancar (US3 escenario 3, aclaración 2026-10-24).
 *
 * Restaurar deja el documento en estado `sucia` y vinculado a su ruta
 * original. El borrador solo se elimina al guardar o descartar.
 */
export class Recuperacion {
  private readonly puerto: PuertoArchivos;
  private readonly documento: Documento;
  private readonly dialogo: DialogoRecuperacion;
  private borradores: Borrador[] = [];

  constructor(
    puerto: PuertoArchivos,
    documento: Documento,
    dialogo: DialogoRecuperacion,
  ) {
    this.puerto = puerto;
    this.documento = documento;
    this.dialogo = dialogo;
  }

  get pendientes(): readonly Borrador[] {
    return this.borradores;
  }

  async buscar(idSesionActual: string): Promise<Borrador[]> {
    try {
      const todos = await this.puerto.cargarBorradores();
      this.borradores = todos.filter((b) => b.idSesion !== idSesionActual);
      return this.borradores;
    } catch {
      this.borradores = [];
      return [];
    }
  }

  /** Ofrece restaurar el borrador más reciente. Devuelve si se restauró. */
  async ofrecer(): Promise<boolean> {
    if (this.borradores.length === 0) return false;
    const borrador = this.borradores[0];
    const acepta = await this.dialogo.preguntar(borrador);
    if (!acepta) return false;
    this.documento.restaurarBorrador(borrador.volcado, borrador.rutaOriginal);
    return true;
  }

  /** Elimina el borrador de la sesión restaurada (solo tras guardar/descartar). */
  async liquidar(idSesion: string): Promise<void> {
    await this.puerto.descartarBorrador(idSesion);
    this.borradores = this.borradores.filter((b) => b.idSesion !== idSesion);
  }
}

export function dialogoRecuperacionNativo(): DialogoRecuperacion {
  return {
    async preguntar(borrador) {
      const nombre = borrador.rutaOriginal ?? 'documento sin título';
      return globalThis.confirm(
        `Margen encontró cambios sin guardar de «${nombre}» (${borrador.marcaTiempo}).\n\nAceptar: restaurarlos.\nCancelar: descartarlos.`,
      );
    },
  };
}
