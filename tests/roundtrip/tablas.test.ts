import { describe, expect, it } from 'vitest';
import {
  agregarFila,
  editarCelda,
  parsearTablaGfm,
  serializarTablaGfm,
  siguienteCelda,
} from '../../src/editor-visual/tablas';
import {
  detectarTablasIrregulares,
  esTablaIrregular,
  protegerEspeciales,
  restaurarEspeciales,
} from '../../src/editor-visual/verbatim';

const REGULAR = '| Nombre | Valor |\n| :----- | ----: |\n| a      | 1     |\n';
const IRREGULAR = '| a | b |\n| - | - |\n| 1 | 2 | 3 |\n| 4 |\n';

describe('tablas GFM', () => {
  it('parsea cabecera, alineación y filas', () => {
    const tabla = parsearTablaGfm(REGULAR);
    expect(tabla).not.toBeNull();
    expect(tabla?.cabecera).toEqual(['Nombre', 'Valor']);
    expect(tabla?.alineaciones).toEqual(['izquierda', 'derecha']);
    expect(tabla?.filas[0]).toEqual(['a', '1']);
  });

  it('serializa de forma estable', () => {
    const tabla = parsearTablaGfm(REGULAR);
    const serializada = serializarTablaGfm(tabla!);
    expect(parsearTablaGfm(serializada)).toEqual(tabla);
  });

  it('edita una celda sin perder las demás', () => {
    const tabla = parsearTablaGfm(REGULAR)!;
    const editada = editarCelda(tabla, 0, 1, '42');
    expect(editada.filas[0]).toEqual(['a', '42']);
    expect(tabla.filas[0]).toEqual(['a', '1']);
  });

  it('agrega una fila vacía', () => {
    const tabla = agregarFila(parsearTablaGfm(REGULAR)!);
    expect(tabla.filas).toHaveLength(2);
    expect(tabla.filas[1]).toHaveLength(2);
  });

  it('navega celdas con Tab y vuelve al inicio', () => {
    const tabla = parsearTablaGfm(REGULAR)!;
    expect(siguienteCelda(tabla, 0, 0)).toEqual([0, 1]);
    expect(siguienteCelda(tabla, 0, 1)).toEqual([1, 0]);
    expect(siguienteCelda(tabla, 1, 1)).toEqual([0, 0]);
  });

  it('detecta y protege una tabla irregular sin perder celdas', () => {
    expect(esTablaIrregular(IRREGULAR)).toBe(true);
    expect(detectarTablasIrregulares(IRREGULAR)).toHaveLength(1);

    const proteccion = protegerEspeciales(IRREGULAR);
    expect(proteccion.bloques.size).toBe(1);
    expect(proteccion.markdown).toContain('margen-verbatim-');

    const restaurada = restaurarEspeciales(proteccion.markdown, proteccion);
    expect(restaurada).toBe(IRREGULAR);
    expect(restaurada).toContain('| 1 | 2 | 3 |');
  });

  it('no protege una tabla regular', () => {
    expect(esTablaIrregular(REGULAR)).toBe(false);
    expect(protegerEspeciales(REGULAR).bloques.size).toBe(0);
  });
});
