import { describe, expect, it } from 'vitest';
import { arbolSemantico, normalizar } from '../../src/documento/serializador';

const FORMATOS: Record<string, string> = {
  encabezados: '# H1\n\n## H2\n\n### H3\n\n#### H4\n\n##### H5\n\n###### H6\n',
  parrafos: 'Primer párrafo.\n\nSegundo párrafo con\nsalto de línea.\n',
  enfasis: '**negrita**, *cursiva*, ***ambas***, ~~tachado~~ y `código`.\n',
  listas: '- a\n- b\n  - b1\n    - b2\n      - b3\n- c\n\n1. uno\n2. dos\n',
  citas: '> cita nivel 1\n>\n> > cita anidada\n',
  enlaces: '[texto](https://example.com) y [relativo](./doc.md#seccion)\n',
  imagenes: '![local](./img/foto.png) y ![remota](https://example.com/foto.png)\n',
  codigo: '```rust\nfn main() {\n    println!("hola");\n}\n```\n\nCódigo `inline`.\n',
  tablas: '| Nombre | Valor |\n| :----- | ----: |\n| a      | 1     |\n| b      | 2     |\n',
  tareas: '- [ ] pendiente\n- [x] completada\n',
  reglas: 'antes\n\n---\n\ndespués\n',
};

describe('fidelidad de formatos CommonMark/GFM', () => {
  for (const [nombre, fuente] of Object.entries(FORMATOS)) {
    it(`preserva la semántica de ${nombre}`, () => {
      const canonico = normalizar(fuente);
      expect(JSON.stringify(arbolSemantico(canonico))).toBe(
        JSON.stringify(arbolSemantico(fuente)),
      );
    });
  }

  it('mantiene la indentación del bloque de código', () => {
    const canonico = normalizar(FORMATOS.codigo);
    expect(canonico).toContain('    println!("hola");');
  });

  it('mantiene la etiqueta de lenguaje del bloque de código', () => {
    expect(normalizar(FORMATOS.codigo)).toContain('```rust');
  });

  it('conserva las tablas y su alineación', () => {
    expect(normalizar(FORMATOS.tablas)).toContain('| :----- | ----: |');
  });

  it('conserva listas de tareas GFM', () => {
    const canonico = normalizar(FORMATOS.tareas);
    expect(canonico).toContain('- [ ] pendiente');
    expect(canonico).toContain('- [x] completada');
  });

  it('conserva listas anidadas hasta cuatro niveles', () => {
    const canonico = normalizar(FORMATOS.listas);
    expect(canonico).toMatch(/b3/);
  });
});
