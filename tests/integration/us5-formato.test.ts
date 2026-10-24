// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderizarLectura } from '../../src/app/lectura';
import { htmlAMarkdown } from '../../src/app/pegar';
import { crearBloqueCodigo, dentroDeBloqueCodigo, lenguajeEnOffset } from '../../src/editor-visual/codigo';
import { protegerEspeciales, restaurarEspeciales } from '../../src/editor-visual/verbatim';

describe('US5: formato robusto', () => {
  it('escenario 1: listas anidadas y tareas se preservan al renderizar', () => {
    const html = renderizarLectura('- uno\n  - dos\n- [x] hecha\n');
    expect(html).toContain('<ul>');
    expect(html).toContain('hecha');
  });

  it('escenario 2: bloques de código conservan lenguaje y contenido literal', () => {
    const bloque = crearBloqueCodigo('const a = 1;\n', 'ts');
    expect(bloque).toBe('```ts\nconst a = 1;\n```\n');
    expect(dentroDeBloqueCodigo(bloque, bloque.length - 2)).toBe(true);
    expect(lenguajeEnOffset(bloque, bloque.length - 2)).toBe('ts');
  });

  it('escenario 3: la tabla irregular se protege y se restaura literal', () => {
    const fuente = '| a | b |\n| - | - |\n| 1 | 2 | 3 |\n';
    const proteccion = protegerEspeciales(fuente);
    expect(restaurarEspeciales(proteccion.markdown, proteccion)).toBe(fuente);
  });

  it('escenario 4: Unicode español íntegro en el render', () => {
    const html = renderizarLectura('Canción del niño: ¿qué tal? ¡Muy bien! 😀\n');
    expect(html).toContain('Canción');
    expect(html).toContain('¿qué tal?');
    expect(html).toContain('😀');
  });

  it('no descarga imágenes remotas en modo lectura (FR-023, SC-007)', () => {
    const html = renderizarLectura('![remota](https://example.com/a.png)\n\n![local](./a.png)\n');
    expect(html).not.toContain('src="https://example.com/a.png"');
    expect(html).toContain('src="./a.png"');
  });

  it('sanea HTML peligroso en modo lectura', () => {
    const html = renderizarLectura('<script>alert(1)</script>\n\nTexto\n');
    expect(html).not.toContain('<script>');
    expect(html).toContain('Texto');
  });

  it('normaliza HTML pegado a Markdown limpio', () => {
    const markdown = htmlAMarkdown(
      '<h2>Título</h2><p>Texto con <strong>negrita</strong> y <a href="https://example.com">enlace</a>.</p><ul><li>uno</li><li>dos</li></ul>',
    );
    expect(markdown).toContain('## Título');
    expect(markdown).toContain('**negrita**');
    expect(markdown).toContain('[enlace](https://example.com)');
    expect(markdown).toContain('- uno');
  });
});
