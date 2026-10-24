import { describe, expect, it } from 'vitest';
import { normalizar, parsear, mismaSemantica } from '../../src/documento/serializador';

describe('contenido no representable en modo visual', () => {
  it('preserva bloques HTML crudo', () => {
    const fuente = '<div class="aviso">\n  <p>HTML crudo</p>\n</div>\n';
    const canonico = normalizar(fuente);
    expect(canonico).toContain('<div class="aviso">');
    expect(canonico).toContain('<p>HTML crudo</p>');
    expect(mismaSemantica(fuente, canonico)).toBe(true);
  });

  it('preserva HTML en línea', () => {
    const fuente = 'Texto con <kbd>Ctrl</kbd> y <br> dentro.\n';
    expect(normalizar(fuente)).toContain('<kbd>Ctrl</kbd>');
  });

  it('preserva extensiones desconocidas como texto', () => {
    const fuente = '::: nota\nContenido de directiva\n:::\n';
    const canonico = normalizar(fuente);
    expect(canonico).toContain('::: nota');
    expect(canonico).toContain('Contenido de directiva');
  });

  it('no descarta contenido al normalizar dos veces', () => {
    const fuente = '<section>\n\n# Título\n\nTexto\n\n</section>\n';
    const una = normalizar(fuente);
    const dos = normalizar(una);
    expect(mismaSemantica(una, dos)).toBe(true);
  });

  it('conserva referencias de enlace y notas al pie GFM', () => {
    const fuente = 'Texto[^1]\n\n[^1]: Nota al pie.\n';
    const canonico = normalizar(fuente);
    expect(canonico).toContain('[^1]');
    expect(parsear(canonico).children.length).toBeGreaterThan(0);
  });

  it('envuelve bloques protegidos sin alterar su contenido literal', () => {
    const fuente = '<table>\n<tr><td>a</td></tr>\n</table>\n';
    expect(normalizar(fuente)).toContain('<td>a</td>');
  });
});
