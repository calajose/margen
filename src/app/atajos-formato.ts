import type { Seleccion } from '../documento/historial';

/**
 * Transformaciones de formato sobre la fuente canónica y su selección.
 *
 * Toda operación devuelve fuente + selección nuevas; el controlador decide
 * cómo refrescar la vista activa. Nunca hay estado de formato en el editor.
 */

export interface ResultadoFormato {
  fuente: string;
  seleccion: Seleccion;
}

export type FormatoEnLinea = 'negrita' | 'cursiva' | 'tachado' | 'codigo';

const MARCAS: Record<FormatoEnLinea, readonly [string, string]> = {
  negrita: ['**', '**'],
  cursiva: ['*', '*'],
  tachado: ['~~', '~~'],
  codigo: ['`', '`'],
};

export function alternarFormatoEnLinea(
  fuente: string,
  seleccion: Seleccion,
  formato: FormatoEnLinea,
): ResultadoFormato {
  const [marca, cierre] = MARCAS[formato];
  const inicio = Math.min(seleccion.anchor, seleccion.head);
  const fin = Math.max(seleccion.anchor, seleccion.head);

  // Si ya está envuelto por la misma marca, la retira.
  if (
    inicio >= marca.length &&
    fuente.slice(inicio - marca.length, inicio) === marca &&
    fuente.slice(fin, fin + cierre.length) === cierre
  ) {
    return {
      fuente: fuente.slice(0, inicio - marca.length) + fuente.slice(inicio, fin) + fuente.slice(fin + cierre.length),
      seleccion: { anchor: inicio - marca.length, head: fin - marca.length },
    };
  }

  const seleccionado = fuente.slice(inicio, fin);
  const nueva =
    fuente.slice(0, inicio) + marca + seleccionado + cierre + fuente.slice(fin);
  return {
    fuente: nueva,
    seleccion: { anchor: inicio + marca.length, head: fin + marca.length },
  };
}

export function alternarEncabezado(
  fuente: string,
  seleccion: Seleccion,
  nivel: 1 | 2 | 3 | 4 | 5 | 6,
): ResultadoFormato {
  const lineas = fuente.split('\n');
  const posiciones = posicionesDeLinea(fuente);
  const inicio = Math.min(seleccion.anchor, seleccion.head);
  const fin = Math.max(seleccion.anchor, seleccion.head);

  let desplazamiento = 0;
  let nuevoInicio = inicio;
  let nuevoFin = fin;

  for (let i = 0; i < lineas.length; i += 1) {
    const inicioLinea = posiciones[i];
    const finLinea = inicioLinea + lineas[i].length;
    if (finLinea < inicio || inicioLinea > fin) continue;

    const anterior = lineas[i];
    const sinMarca = anterior.replace(/^#{1,6}\s+/, '');
    const conMarca = `${'#'.repeat(nivel)} ${sinMarca}`;
    const delta = conMarca.length - anterior.length;
    lineas[i] = conMarca;

    if (inicioLinea <= inicio) nuevoInicio += delta;
    if (inicioLinea <= fin) nuevoFin += delta;
    desplazamiento += delta;
  }

  void desplazamiento;
  return {
    fuente: lineas.join('\n'),
    seleccion: { anchor: Math.max(0, nuevoInicio), head: Math.max(0, nuevoFin) },
  };
}

export function insertarEnlace(
  fuente: string,
  seleccion: Seleccion,
  destino = 'https://',
): ResultadoFormato {
  const inicio = Math.min(seleccion.anchor, seleccion.head);
  const fin = Math.max(seleccion.anchor, seleccion.head);
  const texto = fuente.slice(inicio, fin) || 'texto';
  const enlace = `[${texto}](${destino})`;
  return {
    fuente: fuente.slice(0, inicio) + enlace + fuente.slice(fin),
    seleccion: {
      anchor: inicio + texto.length + 3,
      head: inicio + texto.length + 3 + destino.length,
    },
  };
}

/** Posición de inicio de cada línea. */
export function posicionesDeLinea(fuente: string): number[] {
  const posiciones = [0];
  for (let i = 0; i < fuente.length; i += 1) {
    if (fuente[i] === '\n') posiciones.push(i + 1);
  }
  return posiciones;
}
