import { describe, expect, it } from 'vitest';
import { cargarCorpus } from '../fixtures/corpus';
import { arbolSemantico, normalizar } from '../../src/documento/serializador';
import { ConmutadorModos, type Vista } from '../../src/documento/conmutar';
import { Documento } from '../../src/documento/documento';
import type { Seleccion } from '../../src/documento/historial';
import { protegerEspeciales, restaurarEspeciales } from '../../src/editor-visual/verbatim';

class VistaFalsa implements Vista {
  fuente = '';
  cargas = 0;
  cargar(fuente: string): void {
    this.fuente = fuente;
    this.cargas += 1;
  }
  leerFuente(): string {
    return this.fuente;
  }
  leerSeleccion(): Seleccion {
    return { anchor: 0, head: 0 };
  }
  enfocar(): void {}
}

const corpus = cargarCorpus();

describe('corpus de 30 documentos', () => {
  it('contiene exactamente 30 documentos', () => {
    expect(corpus).toHaveLength(30);
  });

  for (const documento of corpus) {
    it(`preserva la semántica de ${documento.nombre} en la normalización`, () => {
      // Las tablas GFM irregulares se protegen como bloque literal antes de
      // tocar el serializador; el resto debe ser semánticamente idempotente.
      const proteccion = protegerEspeciales(documento.contenido);
      const canonico = restaurarEspeciales(normalizar(proteccion.markdown), proteccion);
      expect(JSON.stringify(arbolSemantico(canonico))).toBe(
        JSON.stringify(arbolSemantico(documento.contenido)),
      );
      expect(normalizar(canonico)).toBe(normalizar(canonico));
      const canonicoProtegido = normalizar(proteccion.markdown);
      expect(normalizar(canonicoProtegido)).toBe(canonicoProtegido);
    });

    it(`sobrevive 20 conmutaciones de modo: ${documento.nombre}`, () => {
      const doc = new Documento();
      const motor = new ConmutadorModos(doc);
      const visual = new VistaFalsa();
      const fuente = new VistaFalsa();
      const proteccion = protegerEspeciales(documento.contenido);

      motor.conmutar('visual', visual);
      visual.fuente = proteccion.markdown;

      for (let i = 0; i < 10; i += 1) {
        motor.conmutar('fuente', fuente);
        motor.conmutar('visual', visual);
      }

      const restaurado = restaurarEspeciales(visual.fuente, proteccion);
      expect(JSON.stringify(arbolSemantico(restaurado))).toBe(
        JSON.stringify(arbolSemantico(documento.contenido)),
      );
      expect(motor.metricas.parses).toBe(21);
      expect(motor.metricas.vivaSincronizacionActiva).toBe(false);
    });
  }
});

