import type { Documento } from '../documento/documento';

export type DecisionCierre = 'guardar' | 'descartar' | 'cancelar';

export interface DialogoCierre {
  preguntar(nombre: string): Promise<DecisionCierre>;
}

/**
 * Confirmación al cerrar con cambios sin guardar (FR-009, US3 escenario 4).
 * Cancelar detiene el cierre; descartar cierra sin tocar el archivo original.
 */
export class Cierre {
  private cerrando = false;
  private readonly documento: Documento;
  private readonly dialogo: DialogoCierre;
  private readonly guardar: () => Promise<void>;
  private readonly alCerrar: () => void;

  constructor(
    documento: Documento,
    dialogo: DialogoCierre,
    guardar: () => Promise<void>,
    alCerrar: () => void,
  ) {
    this.documento = documento;
    this.dialogo = dialogo;
    this.guardar = guardar;
    this.alCerrar = alCerrar;
  }

  async solicitarCierre(): Promise<boolean> {
    if (this.cerrando) return false;
    if (!this.documento.modificado) {
      this.alCerrar();
      return true;
    }

    this.cerrando = true;
    try {
      const nombre = this.documento.ruta ?? 'documento sin título';
      const decision = await this.dialogo.preguntar(nombre);

      if (decision === 'cancelar') return false;
      if (decision === 'descartar') {
        this.alCerrar();
        return true;
      }

      await this.guardar();
      if (this.documento.estadoGuardado === 'limpia') {
        this.alCerrar();
        return true;
      }
      return false;
    } finally {
      this.cerrando = false;
    }
  }
}

/** Diálogo de cierre basado en `confirm` de tres pasos (MVP sin dependencias). */
export function dialogoCierreNativo(): DialogoCierre {
  return {
    async preguntar(nombre) {
      const guardar = globalThis.confirm(
        `«${nombre}» tiene cambios sin guardar.\n\nAceptar: guardar y cerrar.\nCancelar: elegir descartar o cancelar el cierre.`,
      );
      if (guardar) return 'guardar';
      const descartar = globalThis.confirm(
        '¿Descartar los cambios y cerrar de todos modos?\n\nLos cambios locales se perderán.',
      );
      return descartar ? 'descartar' : 'cancelar';
    },
  };
}
