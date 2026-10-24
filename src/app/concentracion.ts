import type { Preferencias } from './preferencias';

export interface PuertoVentana {
  pantallaCompleta(activo: boolean): Promise<void>;
}

/**
 * Modo concentración (FR-014/FR-016, US4).
 *
 * `F11` entra (pantalla completa + UI oculta); `Escape` sale de inmediato.
 * La posición del cursor no se toca: la vista activa sigue siendo la misma.
 */
export class Concentracion {
  private readonly app: HTMLElement;
  private readonly puerto: PuertoVentana;
  private readonly preferencias: Preferencias;
  private readonly alCambiar: (activa: boolean) => void;
  private activaEstado = false;

  constructor(
    app: HTMLElement,
    puerto: PuertoVentana,
    preferencias: Preferencias,
    alCambiar: (activa: boolean) => void = () => {},
  ) {
    this.app = app;
    this.puerto = puerto;
    this.preferencias = preferencias;
    this.alCambiar = alCambiar;
  }

  get activa(): boolean {
    return this.activaEstado;
  }

  async alternar(): Promise<void> {
    await this.establecer(!this.activaEstado);
  }

  async entrar(): Promise<void> {
    await this.establecer(true);
  }

  async salir(): Promise<void> {
    await this.establecer(false);
  }

  /** Escape sale de concentración (nunca sale de la aplicación). */
  manejarTecla(evento: KeyboardEvent): boolean {
    if (evento.key === 'Escape' && this.activaEstado) {
      evento.preventDefault();
      void this.salir();
      return true;
    }
    return false;
  }

  aplicarAnchoColumna(ancho: number): void {
    const limitado = Math.max(60, Math.min(90, Math.round(ancho)));
    this.preferencias.anchoColumna = limitado;
    this.app.style.setProperty('--ancho-columna', `${limitado}ch`);
  }

  private async establecer(activa: boolean): Promise<void> {
    this.activaEstado = activa;
    this.app.classList.toggle('concentracion', activa);
    try {
      await this.puerto.pantallaCompleta(activa);
    } catch {
      // Si el contenedor no permite pantalla completa, se mantiene el modo
      // visual de concentración (barras ocultas).
    }
    this.alCambiar(activa);
  }
}
