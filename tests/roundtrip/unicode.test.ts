import { describe, expect, it } from 'vitest';
import { normalizar } from '../../src/documento/serializador';

const ESPANOL = [
  'Canción de niño: ¿qué tal? ¡Muy bien! Ñandú, pingüino, árbol, acción.',
  'Año 2026 — “comillas tipográficas” y «guillemets».',
  'Emojis: 😀 🎉 👍🏽 👨‍👩‍👧‍👦 y símbolos: © ® ™ € £ ¥.',
  'Mezcla: **negrita con tildes**: árbol; *cursiva*; `código`; [enlace](https://ejemplo.es/ñ).',
  'Línea con espacios finales\n\n' + 'Párrafo siguiente.',
];

describe('Unicode español y emojis', () => {
  it('no corrompe caracteres al normalizar', () => {
    for (const texto of ESPANOL) {
      const canonico = normalizar(texto);
      expect(canonico).not.toContain('\\u');
    }
  });

  it('preserva exactamente tildes, diéresis y signos de apertura', () => {
    const canonico = normalizar(ESPANOL[0]);
    expect(canonico).toContain('Canción');
    expect(canonico).toContain('¿qué tal?');
    expect(canonico).toContain('¡Muy bien!');
    expect(canonico).toContain('Ñandú');
    expect(canonico).toContain('pingüino');
  });

  it('preserva emojis y secuencias ZWJ', () => {
    const canonico = normalizar(ESPANOL[2]);
    expect(canonico).toContain('😀');
    expect(canonico).toContain('👨‍👩‍👧‍👦');
  });

  it('mantiene la ruta acentuada de un enlace', () => {
    expect(normalizar(ESPANOL[3])).toContain('https://ejemplo.es/ñ');
  });

  it('no introduce escapes Unicode ni BOM', () => {
    const canonico = normalizar(ESPANOL.join('\n\n'));
    expect(canonico).not.toContain('\\u');
    expect(canonico.charCodeAt(0)).not.toBe(0xfeff);
  });
});
