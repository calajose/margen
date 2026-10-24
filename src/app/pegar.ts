/**
 * Pegado enriquecido (edge case 4): normaliza HTML al Markdown mínimo que
 * Margen entiende. `Ctrl+Shift+V` fuerza texto plano.
 */

export function htmlAMarkdown(html: string): string {
  if (typeof DOMParser === 'undefined') return html;
  const documento = new DOMParser().parseFromString(html, 'text/html');
  return bloques(documento.body).trim();
}

function bloques(nodo: Node): string {
  const salida: string[] = [];
  nodo.childNodes.forEach((hijo) => {
    if (hijo.nodeType === Node.TEXT_NODE) {
      salida.push(hijo.textContent ?? '');
      return;
    }
    if (!(hijo instanceof HTMLElement)) return;

    const etiqueta = hijo.tagName.toLowerCase();
    const contenido = bloques(hijo);

    switch (etiqueta) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        salida.push(`\n\n${'#'.repeat(Number(etiqueta[1]))} ${contenido.trim()}\n\n`);
        break;
      case 'p':
        salida.push(`\n\n${contenido.trim()}\n\n`);
        break;
      case 'br':
        salida.push('\n');
        break;
      case 'strong':
      case 'b':
        salida.push(`**${contenido}**`);
        break;
      case 'em':
      case 'i':
        salida.push(`*${contenido}*`);
        break;
      case 'del':
      case 's':
        salida.push(`~~${contenido}~~`);
        break;
      case 'code':
        salida.push(`\`${contenido}\``);
        break;
      case 'pre':
        salida.push(`\n\n\`\`\`\n${contenido.replace(/\n$/, '')}\n\`\`\`\n\n`);
        break;
      case 'a': {
        const href = hijo.getAttribute('href') ?? '';
        salida.push(`[${contenido}](${href})`);
        break;
      }
      case 'li':
        salida.push(`- ${contenido.trim()}\n`);
        break;
      case 'ul':
      case 'ol':
        salida.push(`\n${contenido}\n`);
        break;
      case 'blockquote':
        salida.push(
          `\n\n${contenido
            .trim()
            .split('\n')
            .map((linea) => `> ${linea}`)
            .join('\n')}\n\n`,
        );
        break;
      default:
        salida.push(contenido);
    }
  });
  return salida.join('');
}

/** Evento de pegado: devuelve el Markdown a insertar o null para texto plano. */
export function manejarPegado(evento: ClipboardEvent, textoPlano: boolean): string | null {
  if (textoPlano) return null;
  const html = evento.clipboardData?.getData('text/html');
  if (!html) return null;
  const markdown = htmlAMarkdown(html);
  return markdown || null;
}
