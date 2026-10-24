import type { Documento } from '../documento/documento';
import type { PuertoArchivos } from './ipc';

export interface OpcionesAutoguardado {
  intervaloMs?: number;
  retardoInactividadMs?: number;
}

/**
 * Autoguardado hacia el borrador de recuperación.
 *
 * Nunca toca el archivo original (aclaración 2026-10-24: el original solo se
 * modifica con guardado explícito). No altera el estado de guardado.
 */
export class Autoguardado {
  private temporizador: ReturnType<typeof setTimeout> | null = null;
  private programado = false;
  private readonly documento: Documento;
  private readonly puerto: PuertoArchivos;
  private readonly idSesion: string;
  private readonly intervaloMs: number;
  private readonly retardoInactividadMs: number;

  constructor(
    documento: Documento,
    puerto: PuertoArchivos,
    idSesion: string,
    opciones: OpcionesAutoguardado = {},
  ) {
    this.documento = documento;
    this.puerto = puerto;
    this.idSesion = idSesion;
    this.intervaloMs = opciones.intervaloMs ?? 45_000;
    this.retardoInactividadMs = opciones.retardoInactividadMs ?? 2_000;
  }

  /** Debe llamarse tras cada edición. */
  notificarEdicion(): void {
    if (this.documento.estadoGuardado === 'conflicto') return;
    this.cancelar();
    this.programado = true;
    const espera = Math.max(this.retardoInactividadMs, this.intervaloMs);
    this.temporizador = setTimeout(() => {
      void this.escribirBorrador();
    }, espera);
  }

  /** Fuerza un volcado inmediato (p. ej. antes de cerrar). */
  async volcarAhora(): Promise<void> {
    this.cancelar();
    await this.escribirBorrador();
  }

  detener(): void {
    this.cancelar();
  }

  private cancelar(): void {
    if (this.temporizador) {
      clearTimeout(this.temporizador);
      this.temporizador = null;
    }
    this.programado = false;
  }

  private async escribirBorrador(): Promise<void> {
    if (!this.programado) return;
    this.programado = false;
    if (this.documento.estadoGuardado === 'limpia') return;
    try {
      await this.puerto.guardarBorrador(
        this.idSesion,
        this.documento.ruta,
        this.documento.fuente,
      );
    } catch {
      // La degradación de recuperación no debe interrumpir la escritura.
    }
  }
}
