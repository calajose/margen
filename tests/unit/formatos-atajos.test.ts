import { describe, expect, it } from 'vitest';
import {
  alternarEncabezado,
  alternarFormatoEnLinea,
  insertarEnlace,
  posicionesDeLinea,
} from '../../src/app/atajos-formato';
import { anidarLista, continuarLista } from '../../src/editor-visual/listas';

describe('atajos de formato', () => {
  it('envuelve y retira negrita', () => {
    const envuelto = alternarFormatoEnLinea('hola mundo', { anchor: 0, head: 4 }, 'negrita');
    expect(envuelto.fuente).toBe('**hola** mundo');
    const retirado = alternarFormatoEnLinea(envuelto.fuente, envuelto.seleccion, 'negrita');
    expect(retirado.fuente).toBe('hola mundo');
  });

  it('aplica cursiva, tachado y código', () => {
    expect(alternarFormatoEnLinea('abc', { anchor: 0, head: 3 }, 'cursiva').fuente).toBe('*abc*');
    expect(alternarFormatoEnLinea('abc', { anchor: 0, head: 3 }, 'tachado').fuente).toBe('~~abc~~');
    expect(alternarFormatoEnLinea('abc', { anchor: 0, head: 3 }, 'codigo').fuente).toBe('`abc`');
  });

  it('inserta un enlace sobre la selección', () => {
    const resultado = insertarEnlace('ver docs', { anchor: 4, head: 8 }, 'https://example.com');
    expect(resultado.fuente).toBe('ver [docs](https://example.com)');
    expect(resultado.seleccion.anchor).toBeGreaterThan(4);
  });

  it('aplica encabezados y los reemplaza sin duplicar marcas', () => {
    const h2 = alternarEncabezado('Título\n', { anchor: 0, head: 6 }, 2);
    expect(h2.fuente).toBe('## Título\n');
    const h3 = alternarEncabezado(h2.fuente, { anchor: 0, head: 6 }, 3);
    expect(h3.fuente).toBe('### Título\n');
  });

  it('calcula posiciones de línea', () => {
    expect(posicionesDeLinea('a\nbb\nccc')).toEqual([0, 2, 5]);
  });
});

describe('comportamiento de listas', () => {
  it('continúa listas con viñeta', () => {
    const resultado = continuarLista('- uno', 5);
    expect(resultado.fuente).toBe('- uno\n- ');
  });

  it('continúa listas ordenadas incrementando el número', () => {
    const resultado = continuarLista('1. uno', 6);
    expect(resultado.fuente).toBe('1. uno\n2. ');
  });

  it('termina la lista con Enter sobre un elemento vacío', () => {
    const resultado = continuarLista('- uno\n- ', 9);
    expect(resultado.fuente).toBe('- uno\n\n');
  });

  it('anida y desanida con Tab y Shift+Tab', () => {
    const anidada = anidarLista('- uno', { anchor: 0, head: 0 }, false);
    expect(anidada.fuente.startsWith('    ')).toBe(true);
    const desanidada = anidarLista(anidada.fuente, { anchor: 0, head: 0 }, true);
    expect(desanidada.fuente).toBe('- uno');
  });
});
