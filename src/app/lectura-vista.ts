import type { Vista } from '../documento/conmutar';
import type { Seleccion } from '../documento/historial';
import { renderizarLectura } from './lectura';

/**
 * Modo lectura (FR-017, US4 escenario 3): tipografía limpia, sin edición,
 * permite seleccionar y copiar.
 */
export class VistaLectura implements Vista {
  readonly elemento: HTMLElement;
  private fuenteActual = '';
  private seleccion: Seleccion = { anchor: 0, head: 0 };

  constructor() {
    this.elemento = document.createElement('div');
    this.elemento.className = 'lienzo lectura';
    this.elemento.tabIndex = 0;
  }

  leerFuente(): string {
    return this.fuenteActual;
  }

  leerSeleccion(): Seleccion {
    return { ...this.seleccion };
  }

  cargar(fuente: string, seleccion: Seleccion): void {
    this.fuenteActual = fuente;
    this.seleccion = { ...seleccion };
    this.elemento.innerHTML = renderizarLectura(fuente);
  }

  enfocar(): void {
    this.elemento.focus();
  }

  desmontar(): void {
    this.elemento.remove();
  }
}
