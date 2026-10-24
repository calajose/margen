import type { Documento } from '../documento/documento';
import { ConmutadorModos, type Modo, type Vista } from '../documento/conmutar';
import type { Seleccion } from '../documento/historial';
import { EditorFuente } from '../editor-fuente';
import { EditorVisual } from '../editor-visual';
import { VistaLectura } from './lectura-vista';

export interface OpcionesModos {
  documento: Documento;
  contenedor: HTMLElement;
  alCambiarModo: (modo: Modo) => void;
  alEditar: (fuente: string, seleccion: Seleccion) => void;
}

/**
 * Controlador de modos (FR-011/FR-012/FR-013).
 *
 * Mantiene una única vista activa y delega la conmutación al motor puro.
 * El historial es global: deshacer/rehacer funciona entre modos.
 */
export class ControlModos {
  readonly conmutador: ConmutadorModos;
  readonly visual: EditorVisual;
  readonly fuente: EditorFuente;
  readonly lectura: VistaLectura;
  private readonly contenedor: HTMLElement;
  private readonly alCambiarModo: (modo: Modo) => void;
  private readonly documentoActual: Documento;
  private modoActual: Modo = 'visual';
  private iniciado = false;

  constructor(opciones: OpcionesModos) {
    this.contenedor = opciones.contenedor;
    this.alCambiarModo = opciones.alCambiarModo;
    this.documentoActual = opciones.documento;
    this.conmutador = new ConmutadorModos(opciones.documento);
    this.visual = new EditorVisual(opciones.alEditar);
    this.fuente = new EditorFuente(opciones.alEditar);
    this.lectura = new VistaLectura();
  }

  get modo(): Modo {
    return this.modoActual;
  }

  get vistaActiva(): Vista {
    return this.vistas()[this.modoActual];
  }

  async iniciar(): Promise<void> {
    await this.visual.preparado;
    this.montarVista(this.visual);
    this.conmutador.conmutar('visual', this.visual);
    this.modoActual = 'visual';
    this.iniciado = true;
    this.alCambiarModo('visual');
  }

  async cambiar(modo: Modo): Promise<void> {
    if (modo === this.modoActual && this.iniciado) return;
    const destino = this.vistas()[modo];
    this.montarVista(destino);
    this.conmutador.conmutar(modo, destino);
    this.modoActual = modo;
    this.alCambiarModo(modo);
  }

  /** Alterna visual ↔ fuente (atajo Ctrl+/). */
  async alternarFuente(): Promise<void> {
    await this.cambiar(this.modoActual === 'fuente' ? 'visual' : 'fuente');
  }

  /** Recarga la vista activa tras una edición externa al editor. */
  refrescar(): void {
    this.vistaActiva.cargar(this.documentoActual.fuente, this.documentoActual.seleccion);
  }

  deshacer(): void {
    this.conmutador.deshacer();
  }

  rehacer(): void {
    this.conmutador.rehacer();
  }

  private vistas(): Record<Modo, Vista> {
    return {
      visual: this.visual,
      fuente: this.fuente,
      lectura: this.lectura,
    };
  }

  private montarVista(vista: Vista): void {
    const elemento = (vista as unknown as { elemento?: HTMLElement }).elemento;
    if (elemento && elemento.parentElement !== this.contenedor) {
      this.contenedor.replaceChildren(elemento);
      elemento.hidden = false;
    }
  }
}
