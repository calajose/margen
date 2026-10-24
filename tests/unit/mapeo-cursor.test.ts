import { describe, expect, it } from 'vitest';
import { mapearOffset, mapearSeleccion } from '../../src/documento/mapeo-cursor';

describe('mapeo de cursor entre textos', () => {
  it('conserva offsets cuando el texto no cambia', () => {
    expect(mapearOffset('hola', 'hola', 3)).toBe(3);
  });

  it('mantiene la posición tras una inserción anterior', () => {
    expect(mapearOffset('hola mundo', 'hola gran mundo', 5)).toBe(10);
  });

  it('mantiene la posición relativa tras una eliminación anterior', () => {
    expect(mapearOffset('hola gran mundo', 'hola mundo', 10)).toBe(5);
  });

  it('recorta al borde del tramo editado', () => {
    expect(mapearOffset('abcdef', 'abXYef', 3)).toBe(2);
  });

  it('nunca devuelve offsets fuera de rango', () => {
    expect(mapearOffset('abc', 'ab', 99)).toBe(2);
    expect(mapearOffset('abc', 'abcd', -5)).toBe(0);
  });

  it('mapea selecciones completas', () => {
    expect(mapearSeleccion('hola', 'hola!', { anchor: 0, head: 4 })).toEqual({
      anchor: 0,
      head: 4,
    });
  });
});
