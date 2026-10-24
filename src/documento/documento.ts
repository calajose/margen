import type { EstadoGuardado, EventoGuardado } from './estado-guardado';
import { transicion } from './estado-guardado';
import { Historial, type Seleccion } from './historial';

export interface OpcionesDocumento {
  maximoHistorial?: number;
}

/**
 * Documento: única fuente de verdad viva del contenido (data-model.md).
 *
 * Los editores no guardan estado propio relevante: leen y escriben a través
 * de este objeto. Rust solo transporta bytes.
 */
export class Documento {
  readonly historial: Historial;
  private _fuente: string;
  private _ruta: string | null;
  private _estado: EstadoGuardado = 'limpia';
  private _marcaDisco: number | null = null;
  private _soloLectura = false;
  private _seleccion: Seleccion = { anchor: 0, head: 0 };
  private oyentes = new Set<(doc: Documento) => void>();

  constructor(opciones: OpcionesDocumento = {}) {
    this.historial = new Historial(opciones.maximoHistorial);
    this._fuente = '';
    this._ruta = null;
    this.historial.reiniciar('');
  }

  get fuente(): string {
    return this._fuente;
  }

  get ruta(): string | null {
    return this._ruta;
  }

  get estadoGuardado(): EstadoGuardado {
    return this._estado;
  }

  get marcaDisco(): number | null {
    return this._marcaDisco;
  }

  get soloLectura(): boolean {
    return this._soloLectura;
  }

  get seleccion(): Seleccion {
    return { ...this._seleccion };
  }

  get modificado(): boolean {
    return this._estado === 'sucia' || this._estado === 'error';
  }

  suscribir(oyente: (doc: Documento) => void): () => void {
    this.oyentes.add(oyente);
    return () => this.oyentes.delete(oyente);
  }

  /** Aplica una edición del usuario. Registra historial y marca sucio. */
  editar(fuente: string, seleccion?: Seleccion): void {
    if (fuente === this._fuente) {
      if (seleccion) this._seleccion = { ...seleccion };
      return;
    }
    this._fuente = fuente;
    if (seleccion) this._seleccion = { ...seleccion };
    this.aplicarEvento('editar');
    this.historial.registrar(fuente, this._seleccion);
    this.notificar();
  }

  /** Carga un documento desde disco (no cuenta como edición). */
  cargar(
    fuente: string,
    ruta: string | null,
    marcaDisco: number | null = null,
    soloLectura = false,
  ): void {
    this._fuente = fuente;
    this._ruta = ruta;
    this._marcaDisco = marcaDisco;
    this._soloLectura = soloLectura;
    this._estado = 'limpia';
    this._seleccion = { anchor: 0, head: 0 };
    this.historial.reiniciar(fuente);
    this.notificar();
  }

  /** Restaura un borrador: queda sucio y vinculado al archivo original. */
  restaurarBorrador(fuente: string, ruta: string | null): void {
    this._fuente = fuente;
    this._ruta = ruta;
    this._estado = 'sucia';
    this._seleccion = { anchor: 0, head: 0 };
    this.historial.reiniciar(fuente);
    this.notificar();
  }

  moverSeleccion(seleccion: Seleccion): void {
    this._seleccion = { ...seleccion };
  }

  marcarGuardando(): void {
    this.aplicarEvento('guardar_iniciado');
    this.notificar();
  }

  guardadoOk(ruta: string, marcaDisco: number): void {
    this._ruta = ruta;
    this._marcaDisco = marcaDisco;
    this._estado = 'limpia';
    this.notificar();
  }

  guardadoError(): void {
    this.aplicarEvento('guardado_error');
    this.notificar();
  }

  cambioExterno(): void {
    this.aplicarEvento('cambio_externo');
    this.notificar();
  }

  conflictoResuelto(): void {
    this.aplicarEvento('conflicto_resuelto');
    this.notificar();
  }

  aceptarContenidoExterno(fuente: string, marcaDisco: number): void {
    this._fuente = fuente;
    this._marcaDisco = marcaDisco;
    this._estado = 'limpia';
    this.historial.reiniciar(fuente);
    this.notificar();
  }

  deshacer(): void {
    const instantanea = this.historial.deshacer();
    if (!instantanea) return;
    this._fuente = instantanea.fuente;
    this._seleccion = instantanea.seleccion;
    this._estado = 'sucia';
    this.notificar();
  }

  rehacer(): void {
    const instantanea = this.historial.rehacer();
    if (!instantanea) return;
    this._fuente = instantanea.fuente;
    this._seleccion = instantanea.seleccion;
    this._estado = 'sucia';
    this.notificar();
  }

  private aplicarEvento(evento: EventoGuardado): void {
    this._estado = transicion(this._estado, evento);
  }

  private notificar(): void {
    for (const oyente of this.oyentes) oyente(this);
  }
}
