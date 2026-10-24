import type { Documento } from './documento';
import type { Seleccion } from './historial';

export type Modo = 'visual' | 'fuente' | 'lectura';

/**
 * Contrato mínimo de una vista de edición. Las implementaciones reales
 * (Milkdown/ProseMirror, CodeMirror, render de lectura) viven en
 * src/editor-visual, src/editor-fuente y src/app; los tests usan dobles.
 */
export interface Vista {
  leerFuente(): string;
  leerSeleccion(): Seleccion;
  cargar(fuente: string, seleccion: Seleccion): void;
  enfocar(): void;
  desmontar?(): void;
}

export interface MetricasConmutacion {
  conmutaciones: number;
  parses: number;
  ultimaDuracionMs: number;
  vivaSincronizacionActiva: boolean;
}

/**
 * Motor de conmutación de modos (ADR-006).
 *
 * Invariante de diseño: en todo momento hay UNA sola vista activa. No existe
 * sincronización viva entre editores, por lo que los bucles son imposibles
 * por construcción.
 */
export class ConmutadorModos {
  private vistaActiva: Vista | null = null;
  private modoActivo: Modo = 'visual';
  readonly metricas: MetricasConmutacion = {
    conmutaciones: 0,
    parses: 0,
    ultimaDuracionMs: 0,
    vivaSincronizacionActiva: false,
  };
  private readonly documento: Documento;

  constructor(documento: Documento) {
    this.documento = documento;
  }

  get modo(): Modo {
    return this.modoActivo;
  }

  get vista(): Vista | null {
    return this.vistaActiva;
  }

  /** Conmuta a `modo` usando la vista destino ya creada. */
  conmutar(modo: Modo, destino: Vista): void {
    const inicio = ahora();
    if (this.vistaActiva) {
      // Captura el estado final de la vista saliente y fija la verdad viva.
      const fuenteSaliente = this.vistaActiva.leerFuente();
      const seleccionSaliente = this.vistaActiva.leerSeleccion();
      this.documento.editar(fuenteSaliente, seleccionSaliente);
      this.vistaActiva.desmontar?.();
    }

    const fuente = this.documento.fuente;
    const seleccion = this.documento.seleccion;
    destino.cargar(fuente, seleccion);
    destino.enfocar();
    this.vistaActiva = destino;
    this.modoActivo = modo;
    this.metricas.conmutaciones += 1;
    this.metricas.parses += 1;
    this.metricas.ultimaDuracionMs = ahora() - inicio;
  }

  /** Aplica deshacer/rehacer del historial a la vista activa. */
  deshacer(): void {
    this.documento.deshacer();
    this.refrescarVista();
  }

  rehacer(): void {
    this.documento.rehacer();
    this.refrescarVista();
  }

  private refrescarVista(): void {
    this.vistaActiva?.cargar(this.documento.fuente, this.documento.seleccion);
  }
}

function ahora(): number {
  const rendimiento = globalThis.performance;
  return rendimiento ? rendimiento.now() : Date.now();
}
