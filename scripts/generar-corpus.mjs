import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const destino = join(process.cwd(), 'tests', 'fixtures', 'corpus');
mkdirSync(destino, { recursive: true });

const documentos = {
  '01-encabezados.md': '# Título principal\n\n## Sección\n\n### Subsección\n\n#### Nivel cuatro\n\n##### Nivel cinco\n\n###### Nivel seis\n',
  '02-enfasis.md': '**negrita** y *cursiva* y ***ambas*** y ~~tachado~~ y `código`.\n',
  '03-listas-anidadas.md': '- uno\n- dos\n  - dos a\n    - dos a uno\n      - dos a uno i\n- tres\n',
  '04-listas-ordenadas.md': '1. primero\n2. segundo\n   1. segundo uno\n   2. segundo dos\n3. tercero\n',
  '05-tareas.md': '- [ ] pendiente\n- [x] completada\n- [ ] otra pendiente\n',
  '06-citas.md': '> Cita de primer nivel\n>\n> > Cita anidada\n>\n> Vuelta al primer nivel.\n',
  '07-enlaces.md': '[Ejemplo](https://example.com) y [relativo](./otro.md#seccion) y <https://autolink.example>.\n',
  '08-imagenes-locales.md': '![Foto local](./imagenes/foto.png "Título")\n\nTexto tras la imagen.\n',
  '09-imagenes-remotas.md': '![Foto remota](https://example.com/foto.png)\n\nLa imagen remota no se descarga (FR-023).\n',
  '10-codigo-inline.md': 'Usa `npm test` y `const x = 1` dentro del texto.\n',
  '11-codigo-bloque.md': '```\nlinea uno\n  linea con sangría\nlinea tres\n```\n',
  '12-codigo-lenguajes.md': '```rust\nfn main() {\n    println!("hola");\n}\n```\n\n```json\n{ "clave": "valor" }\n```\n',
  '13-tablas.md': '| Nombre | Valor |\n| ------ | ----- |\n| uno    | 1     |\n| dos    | 2     |\n',
  '14-tabla-alineacion.md': '| Izquierda | Centro | Derecha |\n| :-------- | :----: | ------: |\n| a         | b      | c       |\n',
  '15-tabla-irregular.md': '| a | b |\n| - | - |\n| 1 | 2 | 3 |\n| 4 |\n',
  '16-html-bloque.md': '<div class="aviso">\n  <p>HTML crudo en bloque</p>\n</div>\n',
  '17-html-inline.md': 'Pulsa <kbd>Ctrl</kbd> y <kbd>S</kbd> para guardar.\n',
  '18-directivas.md': '::: nota\nContenido de una directiva desconocida.\n:::\n',
  '19-reglas.md': 'Antes de la regla.\n\n---\n\nDespués de la regla.\n',
  '20-unicode-es.md': 'Canción del niño: ¿qué tal? ¡Muy bien! Ñandú, pingüino, árbol, acción.\n',
  '21-emojis.md': 'Emojis: 😀 🎉 👍🏽 👨‍👩‍👧‍👦 y símbolos: © ® ™ € £ ¥.\n',
  '22-mixto-es.md': '# Año 2026\n\nUn **párrafo** con *énfasis*, `código` y [enlace](https://ejemplo.es/ñ).\n\n- niño\n- pingüino\n',
  '23-parrafos-largos.md': `${'Palabra '.repeat(80).trim()}.\n\n${'Otra frase con tildes: canción, acción, corazón. '.repeat(30).trim()}\n`,
  '24-saltos-duros.md': 'Línea con dos espacios al final  \ny continuación.\n\nLínea con barra invertida\\\ny continuación.\n',
  '25-listas-mixtas.md': '- elemento\n\n  Párrafo dentro del elemento.\n\n  ```ts\n  const a = 1;\n  ```\n\n- siguiente\n',
  '26-blockquote-anidada.md': '> Nivel uno\n> > Nivel dos\n> > > Nivel tres\n',
  '27-footnotes.md': 'Texto con nota[^1] y otra[^larga].\n\n[^1]: Primera nota.\n[^larga]: Segunda nota con **formato**.\n',
  '28-strikethrough.md': 'Esto está ~~obsoleto~~ pero se conserva.\n',
  '29-autolinks.md': '<https://example.com> y <correo@example.com>.\n',
  '30-documento-completo.md': '# Documento completo\n\n## Introducción\n\nTexto con **negrita**, *cursiva*, `código`, [enlace](https://example.com) y 😀.\n\n> Una cita\n> con dos líneas.\n\n- lista\n  - anidada\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\n```js\nconsole.log("hola");\n```\n\n<aside>\nHTML crudo protegido.\n</aside>\n\nFinal con ñ, ¿pregunta? y ¡exclamación!\n',
};

for (const [nombre, contenido] of Object.entries(documentos)) {
  writeFileSync(join(destino, nombre), contenido, 'utf8');
}

console.log(`Corpus generado: ${Object.keys(documentos).length} documentos en ${destino}`);
