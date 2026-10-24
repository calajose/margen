import { describe, expect, it } from 'vitest';
import {
  arbolSemantico,
  mismaSemantica,
  normalizar,
  parsear,
  serializar,
} from '../../src/documento/serializador';

const DOCUMENTOS = [
  '# Título\n\nUn párrafo con **negrita**, *cursiva* y `código`.\n',
  '## Sección\n\n- uno\n- dos\n  - dos.a\n  - dos.b\n- tres\n',
  '1. primero\n2. segundo\n3. tercero\n',
  '> Una cita\n> con dos líneas.\n\nPárrafo posterior.\n',
  '```ts\nconst x = 1;\n```\n',
  '[enlace](https://example.com) e ![imagen](./foto.png)\n',
  '| a | b |\n| - | - |\n| 1 | 2 |\n',
  'Texto con ~~tachado~~ y tarea:\n\n- [ ] pendiente\n- [x] hecha\n',
  '---\n\nSeparador.\n',
  'Texto en español: niño, canción, ¿qué?, ¡hola!, ñandú, emoji 😀\n',
];

describe('serializador canónico', () => {
  it('normaliza de forma determinista e idempotente', () => {
    for (const doc of DOCUMENTOS) {
      const una = normalizar(doc);
      const dos = normalizar(una);
      expect(dos).toBe(una);
    }
  });

  it('preserva la semántica en la ida y vuelta', () => {
    for (const doc of DOCUMENTOS) {
      const canonico = normalizar(doc);
      expect(mismaSemantica(doc, canonico)).toBe(true);
    }
  });

  it('parsea a mdast con raíz y hijos', () => {
    const arbol = parsear('# hola\n');
    expect(arbol.type).toBe('root');
    expect(arbol.children.length).toBeGreaterThan(0);
  });

  it('serializa un árbol recién parseado sin lanzar', () => {
    expect(typeof serializar(parsear('# hola'))).toBe('string');
  });

  it('el árbol semántico excluye posiciones', () => {
    const arbol = JSON.stringify(arbolSemantico('# hola'));
    expect(arbol).not.toContain('"position"');
  });

  it('detecta diferencias semánticas reales', () => {
    expect(mismaSemantica('# hola\n', '# adiós\n')).toBe(false);
  });
});
