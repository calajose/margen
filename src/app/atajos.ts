export type Atajo = string;

export interface Manejadores {
  [atajo: string]: (evento: KeyboardEvent) => void;
}

/** ¿La plataforma usa Cmd como modificador principal? */
export function plataformaApple(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
}

/**
 * Normaliza una combinación a `Mod+Shift+S`.
 * `Mod` representa Cmd en macOS y Ctrl en el resto (FR-028).
 */
export function normalizarAtajo(evento: KeyboardEvent): Atajo {
  const partes: string[] = [];
  if (evento.ctrlKey || evento.metaKey) partes.push('Mod');
  if (evento.altKey) partes.push('Alt');
  if (evento.shiftKey) partes.push('Shift');
  const tecla = evento.key.length === 1 ? evento.key.toUpperCase() : evento.key;
  partes.push(tecla);
  return partes.join('+');
}

/** Instala atajos globales. Devuelve la función de limpieza. */
export function instalarAtajos(manejadores: Manejadores, destino: EventTarget = window): () => void {
  const oyente = (evento: Event) => {
    if (!(evento instanceof KeyboardEvent)) return;
    const atajo = normalizarAtajo(evento);
    const manejador = manejadores[atajo];
    if (!manejador) return;
    evento.preventDefault();
    manejador(evento);
  };
  destino.addEventListener('keydown', oyente);
  return () => destino.removeEventListener('keydown', oyente);
}

/** Etiqueta legible del atajo para menús o documentación. */
export function etiquetaAtajo(atajo: Atajo): string {
  const apple = plataformaApple();
  return atajo
    .split('+')
    .map((parte) => {
      if (parte === 'Mod') return apple ? '⌘' : 'Ctrl';
      if (parte === 'Alt') return apple ? '⌥' : 'Alt';
      if (parte === 'Shift') return apple ? '⇧' : 'Mayús';
      return parte;
    })
    .join('+');
}
