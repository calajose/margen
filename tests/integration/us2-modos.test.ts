import { describe, expect, it } from 'vitest';
import { ConmutadorModos, type Vista } from '../../src/documento/conmutar';
import { Documento } from '../../src/documento/documento';
import type { Seleccion } from '../../src/documento/historial';
import { arbolSemantico } from '../../src/documento/serializador';
import { mapearSeleccion } from '../../src/documento/mapeo-cursor';

class VistaFalsa implements Vista {
  fuente = '';
  seleccion: Seleccion = { anchor: 0, head: 0 };
  constructor(public nombre: string) {}
  leerFuente(): string {
    return this.fuente;
  }
  leerSeleccion(): Seleccion {
    return { ...this.seleccion };
  }
  cargar(fuente: string, seleccion: Seleccion): void {
    this.fuente = fuente;
    this.seleccion = { ...seleccion };
  }
  enfocar(): void {}
}

describe('US2: inspección y edición precisa en modo fuente', () => {
  it('escenario 1: alternar a fuente y volver refleja los cambios', () => {
    const documento = new Documento();
    const motor = new ConmutadorModos(documento);
    const visual = new VistaFalsa('visual');
    const fuente = new VistaFalsa('fuente');

    motor.conmutar('visual', visual);
    visual.fuente = '# Título\n\nTexto\n';

    motor.conmutar('fuente', fuente);
    fuente.fuente = '# Título\n\nTexto con [enlace](https://example.com)\n';
    motor.conmutar('visual', visual);

    expect(visual.fuente).toContain('[enlace](https://example.com)');
  });

  it('escenario 2: 20 idas y vueltas preservan la semántica del documento', () => {
    const original = '# Hola\n\n- uno\n- dos\n\n```ts\nconst a = 1;\n```\n';
    const documento = new Documento();
    const motor = new ConmutadorModos(documento);
    const visual = new VistaFalsa('visual');
    const fuente = new VistaFalsa('fuente');

    motor.conmutar('visual', visual);
    visual.fuente = original;
    for (let i = 0; i < 20; i += 1) {
      motor.conmutar('fuente', fuente);
      motor.conmutar('visual', visual);
    }

    expect(JSON.stringify(arbolSemantico(visual.fuente))).toBe(
      JSON.stringify(arbolSemantico(original)),
    );
    expect(motor.metricas.parses).toBe(41);
  });

  it('deshacer 15 pasos atraviesa los modos sin perder contenido', () => {
    const documento = new Documento();
    const motor = new ConmutadorModos(documento);
    const visual = new VistaFalsa('visual');
    const fuente = new VistaFalsa('fuente');

    motor.conmutar('visual', visual);
    visual.fuente = 'paso 0';
    for (let i = 1; i <= 15; i += 1) {
      const vista = i % 2 === 0 ? visual : fuente;
      motor.conmutar(i % 2 === 0 ? 'visual' : 'fuente', vista);
      vista.fuente = `paso ${i}`;
    }
    // Fija el último cambio en el documento antes de deshacer.
    motor.conmutar('visual', visual);

    for (let i = 0; i < 15; i += 1) motor.deshacer();
    expect(motor.vista?.leerFuente()).toBe('paso 0');

    for (let i = 0; i < 15; i += 1) motor.rehacer();
    expect(motor.vista?.leerFuente()).toBe('paso 15');
  });

  it('escenario 3: deshacer atraviesa los modos', () => {
    const documento = new Documento();
    const motor = new ConmutadorModos(documento);
    const visual = new VistaFalsa('visual');
    const fuente = new VistaFalsa('fuente');

    motor.conmutar('visual', visual);
    visual.fuente = 'uno';
    motor.conmutar('fuente', fuente);
    fuente.fuente = 'dos';
    motor.conmutar('visual', visual);

    motor.deshacer();
    expect(visual.fuente).toBe('uno');
    motor.rehacer();
    expect(visual.fuente).toBe('dos');
  });

  it('la selección se conserva dentro de ±2 caracteres al conmutar', () => {
    const fuente = 'Hola mundo';
    const siguiente = 'Hola gran mundo';
    const mapeada = mapearSeleccion(fuente, siguiente, { anchor: 5, head: 5 });
    expect(Math.abs(mapeada.anchor - 10)).toBeLessThanOrEqual(2);
  });
});
