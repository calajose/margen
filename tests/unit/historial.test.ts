import { describe, expect, it } from 'vitest';
import { Historial } from '../../src/documento/historial';

describe('historial unificado', () => {
  it('deshace y rehace en orden', () => {
    const h = new Historial();
    h.reiniciar('uno');
    h.registrar('dos', { anchor: 3, head: 3 });
    h.registrar('tres', { anchor: 4, head: 4 });

    expect(h.deshacer()?.fuente).toBe('dos');
    expect(h.deshacer()?.fuente).toBe('uno');
    expect(h.puedeDeshacer()).toBe(false);
    expect(h.rehacer()?.fuente).toBe('dos');
    expect(h.rehacer()?.fuente).toBe('tres');
    expect(h.puedeRehacer()).toBe(false);
  });

  it('descarta la rama de rehacer tras una nueva edición', () => {
    const h = new Historial();
    h.reiniciar('a');
    h.registrar('b', { anchor: 1, head: 1 });
    h.deshacer();
    h.registrar('c', { anchor: 1, head: 1 });
    expect(h.puedeRehacer()).toBe(false);
    expect(h.actual()?.fuente).toBe('c');
  });

  it('no duplica instantáneas consecutivas idénticas', () => {
    const h = new Historial();
    h.reiniciar('texto');
    h.registrar('texto', { anchor: 5, head: 5 });
    expect(h.longitud).toBe(1);
    expect(h.actual()?.seleccion.anchor).toBe(5);
  });

  it('respeta el máximo configurado', () => {
    const h = new Historial(3);
    h.reiniciar('0');
    h.registrar('1', { anchor: 0, head: 0 });
    h.registrar('2', { anchor: 0, head: 0 });
    h.registrar('3', { anchor: 0, head: 0 });
    expect(h.longitud).toBe(3);
    expect(h.actual()?.fuente).toBe('3');
  });
});
