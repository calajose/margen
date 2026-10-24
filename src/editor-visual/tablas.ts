import type { Seleccion } from '../documento/historial';

/**
 * Edición de tablas GFM celda a celda (FR-024).
 *
 * Las tablas regulares las renderiza el preset GFM de Milkdown. Las
 * irregulares se protegen como bloque literal antes de entrar al editor
 * visual, de modo que ninguna celda se pierde (ver verbatim.ts).
 */

export interface Tabla {
  cabecera: string[];
  alineaciones: Array<'izquierda' | 'centro' | 'derecha' | 'ninguna'>;
  filas: string[][];
}

export function parsearTablaGfm(bloque: string): Tabla | null {
  const lineas = bloque.trim().split('\n');
  if (lineas.length < 2) return null;
  if (!esSeparador(lineas[1])) return null;

  const cabecera = celdas(lineas[0]);
  const alineaciones = celdas(lineas[1]).map((celda) => {
    const izquierda = celda.startsWith(':');
    const derecha = celda.endsWith(':');
    if (izquierda && derecha) return 'centro' as const;
    if (izquierda) return 'izquierda' as const;
    if (derecha) return 'derecha' as const;
    return 'ninguna' as const;
  });
  const filas = lineas.slice(2).map(celdas);
  return { cabecera, alineaciones, filas };
}

export function serializarTablaGfm(tabla: Tabla): string {
  const cabecera = `| ${tabla.cabecera.join(' | ')} |`;
  const separador = `| ${tabla.alineaciones
    .map((a) => {
      if (a === 'centro') return ':---:';
      if (a === 'izquierda') return ':---';
      if (a === 'derecha') return '---:';
      return '---';
    })
    .join(' | ')} |`;
  const filas = tabla.filas.map((fila) => `| ${fila.join(' | ')} |`);
  return [cabecera, separador, ...filas].join('\n');
}

/** Edita una celda y devuelve la tabla serializada. */
export function editarCelda(
  tabla: Tabla,
  fila: number,
  columna: number,
  valor: string,
): Tabla {
  const copia: Tabla = {
    cabecera: [...tabla.cabecera],
    alineaciones: [...tabla.alineaciones],
    filas: tabla.filas.map((f) => [...f]),
  };
  if (fila < 0) {
    copia.cabecera[columna] = valor;
  } else if (copia.filas[fila]) {
    copia.filas[fila][columna] = valor;
  }
  return copia;
}

/** Inserta una fila vacía al final. */
export function agregarFila(tabla: Tabla): Tabla {
  return {
    ...tabla,
    filas: [...tabla.filas, tabla.cabecera.map(() => ' ')],
  };
}

/** Navegación con Tab: devuelve [fila, columna] siguiente. */
export function siguienteCelda(
  tabla: Tabla,
  fila: number,
  columna: number,
): [number, number] {
  const columnas = tabla.cabecera.length;
  const totalFilas = tabla.filas.length + 1;
  const indice = fila * columnas + columna + 1;
  return [Math.floor(indice / columnas) % totalFilas, indice % columnas];
}

function celdas(linea: string): string[] {
  return linea
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

function esSeparador(linea: string): boolean {
  return /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(linea);
}

export type { Seleccion };
