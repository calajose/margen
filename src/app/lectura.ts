import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';

/**
 * Render de solo lectura (FR-017).
 *
 * Sanea el HTML y bloquea cualquier recurso remoto (SC-007): las imágenes
 * absolutas no se descargan; se sustituyen por una marca textual con su URL.
 */
const esquema = {
  ...defaultSchema,
  protocols: {
    ...defaultSchema.protocols,
    href: ['http', 'https', 'mailto'],
  },
};

interface NodoHast {
  type?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: NodoHast[];
  value?: string;
}

function rehypeImagenesLocales() {
  return (arbol: NodoHast): void => {
    const visitar = (nodo: NodoHast): void => {
      if (nodo.type === 'element' && nodo.tagName === 'img') {
        const src = String(nodo.properties?.['src'] ?? '');
        if (/^(https?:)?\/\//i.test(src)) {
          nodo.tagName = 'span';
          nodo.properties = { className: ['imagen-remota'] };
          nodo.children = [{ type: 'text', value: `[imagen remota: ${src}]` }];
          return;
        }
      }
      nodo.children?.forEach(visitar);
    };
    visitar(arbol);
  };
}

const procesador = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeImagenesLocales)
  .use(rehypeSanitize, esquema)
  .use(rehypeStringify);

export function renderizarLectura(markdown: string): string {
  return String(procesador.processSync(markdown));
}
