import type { Documento } from '../documento/documento';
import type { Modo } from '../documento/conmutar';

export interface AccionesBarra {
  cambiarModo(modo: Modo): void;
}

/** Barra de estado discreta: palabras, guardado y modo (FR-027). */
export class BarraEstado {
  private readonly raiz: HTMLElement;
  private readonly documento: Documento;
  private readonly acciones: AccionesBarra;
  private desuscribir: (() => void) | null = null;

  constructor(raiz: HTMLElement, documento: Documento, acciones: AccionesBarra) {
    this.raiz = raiz;
    this.documento = documento;
    this.acciones = acciones;
    this.raiz.setAttribute('role', 'status');
  }

  montar(modoActual: Modo): void {
    this.desuscribir = this.documento.suscribir(() => this.refrescar(modoActual));
    this.refrescar(modoActual);
  }

  desmontar(): void {
    this.desuscribir?.();
  }

  refrescar(modoActual: Modo): void {
    const palabras = contarPalabras(this.documento.fuente);
    const estado = etiquetaGuardado(this.documento);
    this.raiz.replaceChildren(
      elemento('span', `Palabras: ${palabras}`),
      elemento('span', estado),
      this.selectorModo(modoActual),
    );
  }

  private selectorModo(actual: Modo): HTMLElement {
    const grupo = elemento('span', '');
    grupo.setAttribute('role', 'group');
    grupo.setAttribute('aria-label', 'Modo de edición');
    const modos: Array<[Modo, string]> = [
      ['visual', 'Visual'],
      ['fuente', 'Fuente'],
      ['lectura', 'Lectura'],
    ];
    for (const [modo, etiqueta] of modos) {
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.textContent = etiqueta;
      boton.setAttribute('aria-pressed', String(modo === actual));
      boton.addEventListener('click', () => this.acciones.cambiarModo(modo));
      grupo.append(boton);
    }
    return grupo;
  }
}

export function contarPalabras(texto: string): number {
  const limpio = texto
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`~\-[\]()!|]/g, ' ')
    .trim();
  return limpio ? limpio.split(/\s+/).length : 0;
}

function etiquetaGuardado(documento: Documento): string {
  switch (documento.estadoGuardado) {
    case 'limpia':
      return documento.ruta ? 'Guardado' : 'Sin guardar';
    case 'sucia':
      return 'Cambios sin guardar';
    case 'guardando':
      return 'Guardando…';
    case 'error':
      return 'Error al guardar';
    case 'conflicto':
      return 'Conflicto externo';
    default:
      return '';
  }
}

function elemento(etiqueta: string, texto: string): HTMLElement {
  const nodo = document.createElement(etiqueta);
  nodo.textContent = texto;
  return nodo;
}
