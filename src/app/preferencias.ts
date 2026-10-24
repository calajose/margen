export type Tema = 'auto' | 'claro' | 'oscuro';

export interface Preferencias {
  tema: Tema;
  intervaloAutoguardadoSeg: number;
  anchoColumna: number;
  maquinaDeEscribirPorDefecto: boolean;
}

export const PREFERENCIAS_POR_DEFECTO: Preferencias = {
  tema: 'auto',
  intervaloAutoguardadoSeg: 45,
  anchoColumna: 72,
  maquinaDeEscribirPorDefecto: false,
};

const CLAVE = 'margen.preferencias';

export function cargarPreferencias(almacen: Storage | null = globalThis.localStorage ?? null): Preferencias {
  if (!almacen) return { ...PREFERENCIAS_POR_DEFECTO };
  try {
    const crudo = almacen.getItem(CLAVE);
    if (!crudo) return { ...PREFERENCIAS_POR_DEFECTO };
    return { ...PREFERENCIAS_POR_DEFECTO, ...JSON.parse(crudo) };
  } catch {
    return { ...PREFERENCIAS_POR_DEFECTO };
  }
}

export function guardarPreferencias(
  preferencias: Preferencias,
  almacen: Storage | null = globalThis.localStorage ?? null,
): void {
  if (!almacen) return;
  try {
    almacen.setItem(CLAVE, JSON.stringify(preferencias));
  } catch {
    // Sin persistencia de preferencias: no es crítico.
  }
}

/** Ajusta el tema del documento según preferencia y SO. */
export function aplicarTema(tema: Tema, raiz: HTMLElement = document.documentElement): void {
  raiz.dataset.tema = tema;
}

/** Ancho de columna dentro de los límites de FR-014 (60–90). */
export function limitarAnchoColumna(ancho: number): number {
  return Math.max(60, Math.min(90, Math.round(ancho)));
}
