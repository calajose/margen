import type { Seleccion } from '../documento/historial';

/**
 * Protección de contenido que el editor visual no sabe representar.
 *
 * Estrategia (FR-026, US5 escenario 3): antes de cargar en Milkdown, los
 * bloques de HTML crudo, directivas desconocidas y tablas GFM irregulares se
 * sustituyen por bloques de código con un identificador. Al serializar se
 * restauran literalmente. Así el contenido nunca se reescribe ni se pierde.
 */

export interface Proteccion {
  markdown: string;
  bloques: Map<string, string>;
}

const LENGUAJE = 'margen-verbatim-';

export function protegerEspeciales(fuente: string): Proteccion {
  const bloques = new Map<string, string>();
  let contador = 0;
  let salida = fuente;

  // 1) Tablas GFM irregulares (filas con distinto número de celdas).
  salida = reemplazarBloques(salida, detectarTablasIrregulares, () => {
    const id = `t${(contador += 1)}`;
    return id;
  }, bloques);

  // 2) HTML en bloque (incluye comentarios) y directivas `:::`.
  salida = reemplazarHtml(salida, bloques, () => `h${(contador += 1)}`);

  return { markdown: salida, bloques };
}

export function restaurarEspeciales(markdown: string, proteccion: Proteccion): string {
  if (proteccion.bloques.size === 0) return markdown;
  return markdown.replace(
    /^(`{3,})margen-verbatim-([a-z0-9]+)\n([\s\S]*?)\n\1$/gm,
    (_coincidencia, _cercas: string, id: string, contenido: string) => {
      const original = proteccion.bloques.get(id);
      return original ?? contenido;
    },
  );
}

/** Detecta tablas GFM cuyo número de celdas no coincide con la cabecera. */
export function detectarTablasIrregulares(fuente: string): Array<{ inicio: number; fin: number }> {
  const lineas = fuente.split('\n');
  const rangos: Array<{ inicio: number; fin: number }> = [];
  let desplazamiento = 0;
  let i = 0;

  while (i < lineas.length - 1) {
    if (esFilaTabla(lineas[i]) && esSeparador(lineas[i + 1])) {
      const celdasCabecera = contarCeldas(lineas[i]);
      let j = i + 2;
      let irregular = false;
      while (j < lineas.length && esFilaTabla(lineas[j])) {
        if (contarCeldas(lineas[j]) !== celdasCabecera) irregular = true;
        j += 1;
      }
      if (irregular) {
        const inicio = desplazamiento;
        const longitud = lineas.slice(i, j).join('\n').length;
        rangos.push({ inicio, fin: inicio + longitud });
      }
      desplazamiento += lineas.slice(i, j).join('\n').length + 1;
      i = j;
      continue;
    }
    desplazamiento += lineas[i].length + 1;
    i += 1;
  }
  return rangos;
}

export function esTablaIrregular(fuente: string): boolean {
  return detectarTablasIrregulares(fuente).length > 0;
}

function reemplazarBloques(
  fuente: string,
  detector: (texto: string) => Array<{ inicio: number; fin: number }>,
  generarId: () => string,
  bloques: Map<string, string>,
): string {
  const rangos = detector(fuente);
  if (rangos.length === 0) return fuente;
  let salida = '';
  let cursor = 0;
  for (const rango of rangos) {
    salida += fuente.slice(cursor, rango.inicio);
    const contenido = fuente.slice(rango.inicio, rango.fin);
    const id = generarId();
    bloques.set(id, contenido);
    salida += envolver(id, contenido);
    cursor = rango.fin;
  }
  salida += fuente.slice(cursor);
  return salida;
}

function reemplazarHtml(
  fuente: string,
  bloques: Map<string, string>,
  generarId: () => string,
): string {
  const patrones: RegExp[] = [
    /<!--[\s\S]*?-->/g,
    /^<([a-zA-Z][\w-]*)\b[^>]*>[\s\S]*?<\/\1>\s*$/gm,
    /^<([a-zA-Z][\w-]*)\b[^>]*\/>\s*$/gm,
    /^:::[ \t]*[\w-]+[\s\S]*?^:::[ \t]*$/gm,
  ];

  const rangos: Array<{ inicio: number; fin: number }> = [];
  for (const patron of patrones) {
    for (const coincidencia of fuente.matchAll(patron)) {
      if (coincidencia.index === undefined) continue;
      const inicio = coincidencia.index;
      const fin = inicio + coincidencia[0].length;
      if (!rangos.some((r) => inicio < r.fin && fin > r.inicio)) {
        rangos.push({ inicio, fin });
      }
    }
  }
  rangos.sort((a, b) => a.inicio - b.inicio);

  let salida = '';
  let cursor = 0;
  for (const rango of rangos) {
    salida += fuente.slice(cursor, rango.inicio);
    const contenido = fuente.slice(rango.inicio, rango.fin);
    const id = generarId();
    bloques.set(id, contenido);
    salida += envolver(id, contenido);
    cursor = rango.fin;
  }
  salida += fuente.slice(cursor);
  return salida;
}

function envolver(id: string, contenido: string): string {
  const cercas = contenido.includes('```') ? '````' : '```';
  return `${cercas}${LENGUAJE}${id}\n${contenido}\n${cercas}`;
}

function esFilaTabla(linea: string): boolean {
  return linea.trim().startsWith('|') && linea.trim().endsWith('|');
}

function esSeparador(linea: string): boolean {
  return /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(linea);
}

function contarCeldas(linea: string): number {
  return linea.trim().replace(/^\||\|$/g, '').split('|').length;
}

/** Desplazamiento de un offset de texto plano a la fuente Markdown cercana. */
export function offsetPlanoAMarkdown(fuente: string, offsetPlano: number): number {
  if (offsetPlano <= 0) return 0;
  let plano = 0;
  let i = 0;
  const esMarca = new Set(['#', '*', '_', '~', '`', '>', '[', ']', '(', ')', '!', '|']);
  while (i < fuente.length) {
    // Salta destinos de enlace completos.
    if (fuente[i] === ']' && fuente[i + 1] === '(') {
      const cierre = fuente.indexOf(')', i + 2);
      if (cierre !== -1) {
        i = cierre + 1;
        continue;
      }
    }
    const caracter = fuente[i];
    if (!esMarca.has(caracter) && caracter !== '\n') {
      plano += 1;
      if (plano >= offsetPlano) return i + 1;
    }
    i += 1;
  }
  return fuente.length;
}

export type { Seleccion };
