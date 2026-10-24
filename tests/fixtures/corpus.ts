import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIRECTORIO = join(process.cwd(), 'tests', 'fixtures', 'corpus');

export interface DocumentoCorpus {
  nombre: string;
  contenido: string;
}

/** Corpus reproducible de 30 documentos (T009). */
export function cargarCorpus(): DocumentoCorpus[] {
  return readdirSync(DIRECTORIO)
    .filter((nombre) => nombre.endsWith('.md'))
    .sort()
    .map((nombre) => ({
      nombre,
      contenido: readFileSync(join(DIRECTORIO, nombre), 'utf8'),
    }));
}
