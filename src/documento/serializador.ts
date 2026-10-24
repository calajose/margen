import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkStringify from 'remark-stringify';
import type { Root } from 'mdast';
import type { Options as StringifyOptions } from 'remark-stringify';

/**
 * Opciones canónicas de serialización (plan.md §2, ADR-006).
 * Deterministas: la conmutación de modo y el guardado producen siempre
 * la misma representación para el mismo árbol semántico.
 */
export const OPCIONES_CANONICAS: StringifyOptions = {
  bullet: '-',
  emphasis: '*',
  strong: '*',
  fence: '`',
  rule: '-',
  listItemIndent: 'one',
  fences: true,
  incrementListMarker: true,
};

const parser = unified().use(remarkParse).use(remarkGfm);

const stringifier = unified()
  .use(remarkStringify, OPCIONES_CANONICAS)
  .use(remarkGfm);

/** Analiza Markdown (CommonMark + GFM) a mdast. Función pura. */
export function parsear(markdown: string): Root {
  return parser.parse(markdown) as Root;
}

/** Serializa mdast a Markdown canónico. Función pura. */
export function serializar(arbol: Root): string {
  return stringifier.stringify(arbol);
}

/** Normaliza una cadena Markdown a su forma canónica. */
export function normalizar(markdown: string): string {
  return serializar(parsear(markdown));
}

/**
 * Copia del árbol sin posiciones ni datos efímeros, apta para comparar
 * semántica (no formato) entre dos documentos. Las claves `position` y
 * `data` se eliminan porque la fidelidad exigida es semántica (plan.md §2).
 */
export function arbolSemantico(markdown: string): unknown {
  return limpiar(parsear(markdown));
}

function limpiar<T>(valor: T): unknown {
  if (Array.isArray(valor)) return valor.map(limpiar);
  if (valor && typeof valor === 'object') {
    const salida: Record<string, unknown> = {};
    for (const [clave, v] of Object.entries(valor as Record<string, unknown>)) {
      if (clave === 'position' || clave === 'data') continue;
      salida[clave] = limpiar(v);
    }
    return salida;
  }
  return valor;
}

/** Compara dos documentos por semántica (ignora posiciones y formato). */
export function mismaSemantica(a: string, b: string): boolean {
  return JSON.stringify(arbolSemantico(a)) === JSON.stringify(arbolSemantico(b));
}
