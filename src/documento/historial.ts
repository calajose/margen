export interface Seleccion {
  anchor: number;
  head: number;
}

export interface Instantanea {
  fuente: string;
  seleccion: Seleccion;
}

/**
 * Historial unificado del documento (data-model.md, FR-032).
 *
 * Almacena instantáneas de la fuente canónica + selección. Al vivir fuera de
 * los editores, la conmutación de modo no destruye el historial.
 */
export class Historial {
  private instantaneas: Instantanea[] = [];
  private indice = -1;
  private maximo: number;

  constructor(maximo = 200) {
    this.maximo = maximo;
  }

  /** Registra un estado. Ignora duplicados consecutivos. */
  registrar(fuente: string, seleccion: Seleccion): void {
    const actual = this.instantaneas[this.indice];
    if (actual && actual.fuente === fuente) {
      actual.seleccion = seleccion;
      return;
    }
    // Descarta la rama de rehacer.
    this.instantaneas = this.instantaneas.slice(0, this.indice + 1);
    this.instantaneas.push({ fuente, seleccion: { ...seleccion } });
    if (this.instantaneas.length > this.maximo) {
      this.instantaneas.shift();
    }
    this.indice = this.instantaneas.length - 1;
  }

  puedeDeshacer(): boolean {
    return this.indice > 0;
  }

  puedeRehacer(): boolean {
    return this.indice >= 0 && this.indice < this.instantaneas.length - 1;
  }

  deshacer(): Instantanea | null {
    if (!this.puedeDeshacer()) return null;
    this.indice -= 1;
    return this.actual();
  }

  rehacer(): Instantanea | null {
    if (!this.puedeRehacer()) return null;
    this.indice += 1;
    return this.actual();
  }

  actual(): Instantanea | null {
    const i = this.instantaneas[this.indice];
    return i ? { fuente: i.fuente, seleccion: { ...i.seleccion } } : null;
  }

  /** Descarta todo el historial (nuevo documento). */
  reiniciar(fuente = '', seleccion: Seleccion = { anchor: 0, head: 0 }): void {
    this.instantaneas = [{ fuente, seleccion: { ...seleccion } }];
    this.indice = 0;
  }

  get longitud(): number {
    return this.instantaneas.length;
  }

  get posicion(): number {
    return this.indice;
  }
}
