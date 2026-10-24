import { describe, expect, it } from 'vitest';
import { ConmutadorModos, type Vista } from '../../src/documento/conmutar';
import { Documento } from '../../src/documento/documento';
import { mismaSemantica, normalizar } from '../../src/documento/serializador';
import type { Seleccion } from '../../src/documento/historial';

class VistaFalsa implements Vista {
  fuente = '';
  seleccion: Seleccion = { anchor: 0, head: 0 };
  enfocada = false;
  cargas = 0;

  leerFuente(): string {
    return this.fuente;
  }
  leerSeleccion(): Seleccion {
    return { ...this.seleccion };
  }
  cargar(fuente: string, seleccion: Seleccion): void {
    this.fuente = fuente;
    this.seleccion = { ...seleccion };
    this.cargas += 1;
  }
  enfocar(): void {
    this.enfocada = true;
  }
}

describe('conmutador de modos (ADR-006)', () => {
  it('serializa la vista saliente y carga la entrante', () => {
    const doc = new Documento();
    const conmutador = new ConmutadorModos(doc);
    const visual = new VistaFalsa();
    const fuente = new VistaFalsa();

    conmutador.conmutar('visual', visual);
    visual.fuente = '# Título\n\nTexto';
    visual.seleccion = { anchor: 5, head: 5 };

    conmutador.conmutar('fuente', fuente);
    expect(fuente.fuente).toBe('# Título\n\nTexto');
    expect(fuente.seleccion.anchor).toBe(5);

    fuente.fuente = '# Título\n\nTexto editado';
    visual.cargas = 0;
    conmutador.conmutar('visual', visual);
    expect(visual.fuente).toContain('editado');
    expect(visual.cargas).toBe(1);
  });

  it('solo mantiene una vista activa (sin sincronización viva)', () => {
    const doc = new Documento();
    const conmutador = new ConmutadorModos(doc);
    const visual = new VistaFalsa();
    visual.fuente = 'uno';
    conmutador.conmutar('visual', visual);

    const fuente = new VistaFalsa();
    conmutador.conmutar('fuente', fuente);
    expect(conmutador.metricas.vivaSincronizacionActiva).toBe(false);
    expect(conmutador.vista).toBe(fuente);
  });

  it('cuenta un parse por conmutación y ninguno extra', () => {
    const doc = new Documento();
    const conmutador = new ConmutadorModos(doc);
    const visual = new VistaFalsa();
    const fuente = new VistaFalsa();

    conmutador.conmutar('visual', visual);
    visual.fuente = 'a';
    conmutador.conmutar('fuente', fuente);
    fuente.fuente = 'b';
    conmutador.conmutar('visual', visual);

    expect(conmutador.metricas.parses).toBe(3);
    expect(conmutador.metricas.parses).toBeLessThanOrEqual(conmutador.metricas.conmutaciones);
  });

  it('preserva la semántica al conmutar 20 veces', () => {
    const doc = new Documento();
    const conmutador = new ConmutadorModos(doc);
    const visual = new VistaFalsa();
    const fuente = new VistaFalsa();
    const original = '# Hola\n\n- uno\n- dos\n\n```ts\nconst a = 1;\n```\n';

    conmutador.conmutar('visual', visual);
    visual.fuente = original;

    for (let i = 0; i < 10; i += 1) {
      conmutador.conmutar('fuente', fuente);
      conmutador.conmutar('visual', visual);
    }

    expect(mismaSemantica(original, normalizar(visual.fuente))).toBe(true);
  });

  it('deshacer y rehacer atraviesan modos', () => {
    const doc = new Documento();
    const conmutador = new ConmutadorModos(doc);
    const visual = new VistaFalsa();
    const fuente = new VistaFalsa();

    conmutador.conmutar('visual', visual);
    visual.fuente = 'uno';
    conmutador.conmutar('fuente', fuente);
    fuente.fuente = 'dos';
    conmutador.conmutar('visual', visual);
    expect(visual.fuente).toBe('dos');

    conmutador.deshacer();
    expect(visual.fuente).toBe('uno');
    conmutador.rehacer();
    expect(visual.fuente).toBe('dos');
  });
});
