import type { Seleccion } from '../documento/historial';

/**
 * Comportamiento de listas (FR-021) sobre la fuente canónica.
 *
 * Se implementa como transformaciones puras para que funcione igual en los
 * dos editores y sea verificable sin DOM.
 */

const PATRON_ELEMENTO = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;

export interface ResultadoLista {
  fuente: string;
  seleccion: Seleccion;
}

/** Al pulsar Enter, continúa la lista actual o la termina si está vacía. */
export function continuarLista(fuente: string, offset: number): ResultadoLista {
  const { inicio, texto } = lineaEn(fuente, offset);
  const coincidencia = PATRON_ELEMENTO.exec(texto);

  if (!coincidencia) {
    return insertarSalto(fuente, offset, offset);
  }

  const [, sangria, marcador, contenido] = coincidencia;

  if (contenido.trim() === '') {
    // Doble Enter: elimina el marcador vacío y sale de la lista.
    const sinElemento = `${sangria}\n`;
    const nueva = fuente.slice(0, inicio) + sinElemento + fuente.slice(inicio + texto.length);
    return { fuente: nueva, seleccion: { anchor: inicio + sangria.length, head: inicio + sangria.length } };
  }

  const siguiente = marcador.match(/^\d+/)
    ? `${Number.parseInt(marcador, 10) + 1}${marcador.endsWith(')') ? ')' : '.'}`
    : marcador;
  const insercion = `\n${sangria}${siguiente} `;
  const posicion = inicio + texto.length;
  const nueva = fuente.slice(0, posicion) + insercion + fuente.slice(posicion);
  const cursor = posicion + insercion.length;
  return { fuente: nueva, seleccion: { anchor: cursor, head: cursor } };
}

/** Tab: anida el elemento de lista actual. Shift+Tab lo desanida. */
export function anidarLista(
  fuente: string,
  seleccion: Seleccion,
  desanidar = false,
): ResultadoLista {
  const offset = Math.min(seleccion.anchor, seleccion.head);
  const { inicio, texto } = lineaEn(fuente, offset);
  if (!PATRON_ELEMENTO.test(texto)) {
    return { fuente, seleccion };
  }

  const nuevaLinea = desanidar
    ? texto.replace(/^ {1,4}/, '')
    : `    ${texto}`;
  const delta = nuevaLinea.length - texto.length;
  const nueva = fuente.slice(0, inicio) + nuevaLinea + fuente.slice(inicio + texto.length);
  return {
    fuente: nueva,
    seleccion: {
      anchor: Math.max(inicio, seleccion.anchor + delta),
      head: Math.max(inicio, seleccion.head + delta),
    },
  };
}

function insertarSalto(fuente: string, desde: number, hasta: number): ResultadoLista {
  return {
    fuente: fuente.slice(0, desde) + '\n' + fuente.slice(hasta),
    seleccion: { anchor: desde + 1, head: desde + 1 },
  };
}

function lineaEn(fuente: string, offset: number): { inicio: number; texto: string } {
  const inicio = fuente.lastIndexOf('\n', Math.max(0, offset - 1)) + 1;
  const fin = fuente.indexOf('\n', offset);
  return { inicio, texto: fuente.slice(inicio, fin === -1 ? fuente.length : fin) };
}
