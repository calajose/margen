import { Editor, defaultValueCtx, editorViewCtx, rootCtx } from '@milkdown/core';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { commonmark } from '@milkdown/preset-commonmark';
import { gfm } from '@milkdown/preset-gfm';
import { replaceAll } from '@milkdown/utils';
import { TextSelection } from '@milkdown/prose/state';
import type { Vista } from '../documento/conmutar';
import type { Seleccion } from '../documento/historial';
import {
  offsetPlanoAMarkdown,
  protegerEspeciales,
  restaurarEspeciales,
  type Proteccion,
} from './verbatim';
import { offsetDeTextoPlano } from '../documento/mapeo-cursor';

/**
 * Modo visual sobre Milkdown/ProseMirror (FR-010).
 *
 * El documento canónico sigue siendo el Markdown. El editor visual solo lo
 * presenta; al conmutar se serializa y se restauran los bloques protegidos.
 */
export class EditorVisual implements Vista {
  readonly elemento: HTMLElement;
  private editor: Editor | null = null;
  private readonly listo: Promise<void>;
  private activo = false;
  private fuenteActual = '';
  private proteccion: Proteccion = { markdown: '', bloques: new Map() };
  private pendiente: { fuente: string; seleccion: Seleccion } | null = null;
  private alEditar: (fuente: string, seleccion: Seleccion) => void;

  constructor(alEditar: (fuente: string, seleccion: Seleccion) => void) {
    this.alEditar = alEditar;
    this.elemento = document.createElement('div');
    this.elemento.className = 'editor-visual';
    this.listo = this.crear();
  }

  get preparado(): Promise<void> {
    return this.listo;
  }

  leerFuente(): string {
    if (!this.editor) return this.fuenteActual;
    try {
      this.fuenteActual = this.serializar();
    } catch {
      // Si el editor aún no está listo se conserva la última fuente conocida.
    }
    return this.fuenteActual;
  }

  leerSeleccion(): Seleccion {
    if (!this.editor) return { anchor: 0, head: 0 };
    try {
      let seleccion: Seleccion = { anchor: 0, head: 0 };
      this.editor.action((ctx) => {
        const vista = ctx.get(editorViewCtx);
        const { from, to } = vista.state.selection;
        const planoDesde = vista.state.doc.textBetween(0, from, '\n', '\n').length;
        const planoHasta = vista.state.doc.textBetween(0, to, '\n', '\n').length;
        seleccion = {
          anchor: offsetPlanoAMarkdown(this.fuenteActual, planoDesde),
          head: offsetPlanoAMarkdown(this.fuenteActual, planoHasta),
        };
      });
      return seleccion;
    } catch {
      return { anchor: 0, head: 0 };
    }
  }

  cargar(fuente: string, seleccion: Seleccion): void {
    if (!this.editor) {
      this.pendiente = { fuente, seleccion };
      return;
    }
    this.aplicar(fuente, seleccion);
  }

  enfocar(): void {
    this.activo = true;
    this.elemento.hidden = false;
    try {
      this.editor?.action((ctx) => ctx.get(editorViewCtx).focus());
    } catch {
      // Editor en creación: el foco se aplica al terminar.
    }
  }

  desmontar(): void {
    this.activo = false;
    this.elemento.remove();
  }

  private async crear(): Promise<void> {
    this.editor = await Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, this.elemento);
        ctx.set(defaultValueCtx, '');
        ctx.get(listenerCtx).markdownUpdated((_ctx, markdown) => {
          if (!this.activo) return;
          this.fuenteActual = restaurarEspeciales(markdown, this.proteccion);
          this.alEditar(this.fuenteActual, this.leerSeleccion());
        });
      })
      .use(commonmark)
      .use(gfm)
      .use(listener)
      .create();

    if (this.pendiente) {
      const { fuente, seleccion } = this.pendiente;
      this.pendiente = null;
      this.aplicar(fuente, seleccion);
    }
  }

  private aplicar(fuente: string, seleccion: Seleccion): void {
    this.proteccion = protegerEspeciales(fuente);
    this.fuenteActual = fuente;
    try {
      this.editor?.action(replaceAll(this.proteccion.markdown));
      this.establecerSeleccion(fuente, seleccion);
    } catch {
      // En caso de fallo de carga se conserva la fuente para no perder datos.
      this.fuenteActual = fuente;
    }
  }

  private serializar(): string {
    const salida = this.fuenteActual;
    this.editor?.action((ctx) => {
      const vista = ctx.get(editorViewCtx);
      // `serializerCtx` no está disponible en todas las versiones; se usa el
      // Markdown actualizado por el plugin listener como fuente fiable.
      void vista;
    });
    return restaurarEspeciales(salida, this.proteccion);
  }

  private establecerSeleccion(fuente: string, seleccion: Seleccion): void {
    this.editor?.action((ctx) => {
      const vista = ctx.get(editorViewCtx);
      const plano = offsetDeTextoPlano(fuente, seleccion.head);
      let posicion = 0;
      let restante = plano;
      vista.state.doc.descendants((nodo, pos) => {
        if (restante <= 0) return false;
        if (nodo.isText) {
          const texto = nodo.text ?? '';
          if (restante <= texto.length) {
            posicion = pos + restante;
            restante = 0;
            return false;
          }
          restante -= texto.length;
          posicion = pos + texto.length;
        } else if (nodo.isBlock && pos > 0) {
          restante -= 1;
        }
        return true;
      });
      const limite = vista.state.doc.content.size;
      const destino = Math.max(0, Math.min(posicion, limite));
      vista.dispatch(vista.state.tr.setSelection(TextSelection.create(vista.state.doc, destino)));
    });
  }
}

export type { Seleccion };
