import type { Seleccion } from './historial';

/**
 * Mapea un offset del texto anterior al texto nuevo.
 *
 * Estrategia (plan.md §2): prefijo común + sufijo común determinan las zonas
 * estables; los offsets dentro del prefijo se conservan, los del sufijo se
 * desplazan, y los del tramo editado se recortan al borde más cercano. El
 * resultado nunca apunta fuera de rango y evita el "salto al inicio".
 */
export function mapearOffset(anterior: string, siguiente: string, offset: number): number {
  if (anterior === siguiente) return recortar(offset, siguiente.length);

  const maxPrefijo = Math.min(anterior.length, siguiente.length);
  let prefijo = 0;
  while (prefijo < maxPrefijo && anterior[prefijo] === siguiente[prefijo]) {
    prefijo += 1;
  }

  let sufijo = 0;
  while (
    sufijo < maxPrefijo - prefijo &&
    anterior[anterior.length - 1 - sufijo] === siguiente[siguiente.length - 1 - sufijo]
  ) {
    sufijo += 1;
  }

  const offsetSeguro = recortar(offset, anterior.length);

  if (offsetSeguro < prefijo) return offsetSeguro;

  // En el borde exacto del cambio: si hubo inserción, el cursor la acompaña
  // (comportamiento natural al escribir); si no, se queda en el borde.
  if (offsetSeguro === prefijo) {
    const insertado = Math.max(0, siguiente.length - sufijo - prefijo);
    const eliminado = Math.max(0, anterior.length - sufijo - prefijo);
    // Al final del texto no se expande la selección con lo añadido; en medio,
    // el cursor acompaña al texto insertado en el punto de edición.
    if (eliminado > 0 || offsetSeguro === anterior.length) return prefijo;
    return prefijo + insertado;
  }

  if (offsetSeguro >= anterior.length - sufijo) {
    const desdeElFinal = anterior.length - offsetSeguro;
    return recortar(siguiente.length - desdeElFinal, siguiente.length);
  }

  // Dentro del tramo editado: recorta al borde más cercano del cambio.
  const distanciaAlPrefijo = offsetSeguro - prefijo;
  const distanciaAlSufijo = anterior.length - sufijo - offsetSeguro;
  return distanciaAlPrefijo <= distanciaAlSufijo ? prefijo : Math.max(prefijo, siguiente.length - sufijo);
}

export function mapearSeleccion(
  anterior: string,
  siguiente: string,
  seleccion: Seleccion,
): Seleccion {
  return {
    anchor: mapearOffset(anterior, siguiente, seleccion.anchor),
    head: mapearOffset(anterior, siguiente, seleccion.head),
  };
}

/** Desplazamiento de un offset de Markdown a texto plano equivalente. */
export function offsetDeTextoPlano(fuente: string, offset: number): number {
  const recortado = fuente.slice(0, recortar(offset, fuente.length));
  return recortado
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[>\s]*/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+[.)]\s+/gm, '')
    .replace(/[*_~`]/g, '').length;
}

function recortar(valor: number, maximo: number): number {
  if (!Number.isFinite(valor)) return 0;
  return Math.max(0, Math.min(Math.trunc(valor), maximo));
}
