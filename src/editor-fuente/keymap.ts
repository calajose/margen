import type { KeyBinding } from '@codemirror/view';
import { continuarLista, anidarLista } from '../editor-visual/listas';
import type { EditorFuente } from './index';

/**
 * Atajos del modo fuente que delegan en el modelo de documento (T038).
 * Enter y Tab sobre listas se resuelven como transformaciones puras.
 */
export function keymapListas(editor: EditorFuente): KeyBinding[] {
  return [
    {
      key: 'Enter',
      run: (vista) => {
        const fuente = vista.state.doc.toString();
        const offset = vista.state.selection.main.head;
        const resultado = continuarLista(fuente, offset);
        if (resultado.fuente === fuente) return false;
        vista.dispatch({
          changes: { from: 0, to: fuente.length, insert: resultado.fuente },
          selection: resultado.seleccion,
        });
        return true;
      },
    },
    {
      key: 'Tab',
      run: (vista) => {
        const fuente = vista.state.doc.toString();
        const seleccion = {
          anchor: vista.state.selection.main.from,
          head: vista.state.selection.main.to,
        };
        const resultado = anidarLista(fuente, seleccion, false);
        if (resultado.fuente === fuente) return false;
        vista.dispatch({
          changes: { from: 0, to: fuente.length, insert: resultado.fuente },
          selection: resultado.seleccion,
        });
        return true;
      },
    },
    {
      key: 'Shift-Tab',
      run: (vista) => {
        const fuente = vista.state.doc.toString();
        const seleccion = {
          anchor: vista.state.selection.main.from,
          head: vista.state.selection.main.to,
        };
        const resultado = anidarLista(fuente, seleccion, true);
        if (resultado.fuente === fuente) return false;
        vista.dispatch({
          changes: { from: 0, to: fuente.length, insert: resultado.fuente },
          selection: resultado.seleccion,
        });
        return true;
      },
    },
    {
      key: 'Mod-s',
      run: () => {
        // El guardado lo gestiona el controlador global; se evita el diálogo
        // del navegador devolviendo true sin acción local.
        editor.enfocar();
        return true;
      },
    },
  ];
}
