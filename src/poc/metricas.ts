/** Contadores de la PoC (plan.md §2, validación 8). */
export class MetricasPoc {
  parses = 0;
  sincronizacionesVivas = 0;
  conmutaciones = 0;
  reconstrucciones = 0;

  registrarParse(): void {
    this.parses += 1;
  }

  registrarConmutacion(): void {
    this.conmutaciones += 1;
  }

  registrarReconstruccion(): void {
    this.reconstrucciones += 1;
  }

  get sinBucles(): boolean {
    return this.sincronizacionesVivas === 0 && this.parses <= this.conmutaciones + 1;
  }

  reiniciar(): void {
    this.parses = 0;
    this.sincronizacionesVivas = 0;
    this.conmutaciones = 0;
    this.reconstrucciones = 0;
  }
}
