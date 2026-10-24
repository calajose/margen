/** Utilidades de bloques de código (FR-022). */

export function crearBloqueCodigo(contenido = '', lenguaje = ''): string {
  const cercas = contenido.includes('```') ? '````' : '```';
  return `${cercas}${lenguaje}\n${contenido}${contenido.endsWith('\n') || contenido === '' ? '' : '\n'}${cercas}\n`;
}

/** ¿El offset está dentro de un bloque de código cercado? */
export function dentroDeBloqueCodigo(fuente: string, offset: number): boolean {
  const hasta = fuente.slice(0, offset);
  const cercas = hasta.match(/^(```+|~~~+)/gm) ?? [];
  return cercas.length % 2 === 1;
}

/** Lenguaje declarado en la cerca que contiene el offset, si existe. */
export function lenguajeEnOffset(fuente: string, offset: number): string | null {
  const antes = fuente.slice(0, offset);
  const coincidencias = [...antes.matchAll(/^(```+|~~~+)([\w+-]*)$/gm)];
  if (coincidencias.length % 2 === 0) return null;
  return coincidencias[coincidencias.length - 1][2] || '';
}
