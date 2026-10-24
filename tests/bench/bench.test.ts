import { describe, expect, it } from 'vitest';
import { normalizar } from '../../src/documento/serializador';
import { ConmutadorModos, type Vista } from '../../src/documento/conmutar';
import { Documento } from '../../src/documento/documento';
import type { Seleccion } from '../../src/documento/historial';

class VistaFalsa implements Vista {
  fuente = '';
  cargar(fuente: string): void {
    this.fuente = fuente;
  }
  leerFuente(): string {
    return this.fuente;
  }
  leerSeleccion(): Seleccion {
    return { anchor: 0, head: 0 };
  }
  enfocar(): void {}
}

function documentoDePalabras(palabras: number): string {
  const parrafo = 'Margen escribe sin distracciones con ñ, tildes y ¿preguntas? '.repeat(10);
  const repeticiones = Math.ceil(palabras / 10);
  return `# Documento de ${palabras} palabras\n\n${parrafo.repeat(repeticiones)}`;
}

describe('benchmark de referencia', () => {
  for (const palabras of [1_000, 10_000, 50_000, 100_000]) {
    it(`normaliza y conmuta con ${palabras} palabras dentro de un límite sano`, () => {
      const fuente = documentoDePalabras(palabras);
      const inicioNormalizacion = performance.now();
      const canonico = normalizar(fuente);
      const duracionNormalizacion = performance.now() - inicioNormalizacion;

      const documento = new Documento();
      const motor = new ConmutadorModos(documento);
      const visual = new VistaFalsa();
      const fuenteVista = new VistaFalsa();
      motor.conmutar('visual', visual);
      visual.fuente = canonico;

      const inicioConmutacion = performance.now();
      motor.conmutar('fuente', fuenteVista);
      const duracionConmutacion = performance.now() - inicioConmutacion;

      // Límite de cordura para detectar regresiones groseras; los objetivos
      // definitivos se fijan tras la campaña de rendimiento (T080).
      expect(duracionNormalizacion).toBeLessThan(20_000);
      expect(duracionConmutacion).toBeLessThan(5_000);

      console.log(
        JSON.stringify({
          palabras,
          normalizacionMs: Number(duracionNormalizacion.toFixed(2)),
          conmutacionMs: Number(duracionConmutacion.toFixed(2)),
          bytes: fuente.length,
        }),
      );
    }, 60_000);
  }
});
