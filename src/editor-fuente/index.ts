import { EditorState } from '@codemirror/state';
import {
  EditorView,
  drawSelection,
  highlightActiveLine,
  keymap,
  lineNumbers,
} from '@codemirror/view';
import { defaultKeymap } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language';
import type { Vista } from '../documento/conmutar';
import type { Seleccion } from '../documento/historial';
import { keymapListas } from './keymap';

/**
 * Modo fuente con CodeMirror 6 (FR-011).
 *
 * La vista es un adaptador: no es dueña del documento, solo lo presenta y
 * notifica cambios. El historial global vive fuera del editor.
 */
export class EditorFuente implements Vista {
  readonly elemento: HTMLElement;
  private view: EditorView | null = null;
  private activo = false;
  private fuenteActual = '';
  private alEditar: (fuente: string, seleccion: Seleccion) => void;

  constructor(alEditar: (fuente: string, seleccion: Seleccion) => void) {
    this.alEditar = alEditar;
    this.elemento = document.createElement('div');
    this.elemento.className = 'editor-fuente';
  }

  leerFuente(): string {
    return this.view ? this.view.state.doc.toString() : this.fuenteActual;
  }

  leerSeleccion(): Seleccion {
    if (!this.view) return { anchor: 0, head: 0 };
    const { from, to } = this.view.state.selection.main;
    return { anchor: from, head: to };
  }

  cargar(fuente: string, seleccion: Seleccion): void {
    this.fuenteActual = fuente;
    if (!this.view) {
      this.crear(fuente, seleccion);
      return;
    }
    const longitud = this.view.state.doc.length;
    const desde = Math.max(0, Math.min(seleccion.anchor, fuente.length));
    const hasta = Math.max(0, Math.min(seleccion.head, fuente.length));
    this.view.dispatch({
      changes: { from: 0, to: longitud, insert: fuente },
      selection: { anchor: desde, head: hasta },
    });
  }

  enfocar(): void {
    this.activo = true;
    this.elemento.hidden = false;
    this.view?.focus();
  }

  desmontar(): void {
    this.activo = false;
    this.elemento.remove();
  }

  get enFoco(): boolean {
    return this.activo;
  }

  private crear(fuente: string, seleccion: Seleccion): void {
    const estado = EditorState.create({
      doc: fuente,
      extensions: [
        lineNumbers(),
        drawSelection(),
        highlightActiveLine(),
        markdown({ base: markdownLanguage, addKeymap: false }),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        keymap.of([...keymapListas(this), ...defaultKeymap]),
        EditorView.lineWrapping,
        EditorView.theme({
          '&': { fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace', fontSize: '15px' },
          '.cm-content': { padding: '0' },
          '.cm-gutters': { display: 'none' },
        }),
        EditorView.updateListener.of((actualizacion) => {
          if (!actualizacion.docChanged) return;
          this.fuenteActual = actualizacion.state.doc.toString();
          if (!this.activo) return;
          const { from, to } = actualizacion.state.selection.main;
          this.alEditar(this.fuenteActual, { anchor: from, head: to });
        }),
      ],
    });

    this.view = new EditorView({ state: estado, parent: this.elemento });
    const desde = Math.max(0, Math.min(seleccion.anchor, fuente.length));
    const hasta = Math.max(0, Math.min(seleccion.head, fuente.length));
    this.view.dispatch({ selection: { anchor: desde, head: hasta } });
  }

  /** Reemplaza la selección respetando el historial global. */
  reemplazar(fuente: string, seleccion: Seleccion): void {
    this.cargar(fuente, seleccion);
  }

  seleccionarTodo(): void {
    if (!this.view) return;
    const fin = this.view.state.doc.length;
    this.view.dispatch({ selection: { anchor: 0, head: fin } });
  }

  /** Coloca la selección indicada (usado al recuperar el cursor). */
  restaurarSeleccion(seleccion: Seleccion): void {
    if (!this.view) return;
    const longitud = this.view.state.doc.length;
    this.view.dispatch({
      selection: {
        anchor: Math.min(seleccion.anchor, longitud),
        head: Math.min(seleccion.head, longitud),
      },
    });
  }
}
