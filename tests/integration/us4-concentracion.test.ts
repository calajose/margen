import { describe, expect, it } from 'vitest';
import { renderizarLectura } from '../../src/app/lectura';
import { Concentracion } from '../../src/app/concentracion';
import { limitarAnchoColumna, PREFERENCIAS_POR_DEFECTO } from '../../src/app/preferencias';
import { PuertoFalso } from './mock-puerto';

describe('US4: concentración y lectura limpia', () => {
  it('escenario 1: F11 oculta barras y centra la columna', async () => {
    const clases = new Set<string>();
    const app = {
      classList: {
        toggle: (clase: string, activo: boolean) => {
          if (activo) clases.add(clase);
          else clases.delete(clase);
        },
      },
      style: { setProperty: () => {} },
    } as unknown as HTMLElement;
    const puerto = new PuertoFalso();
    const concentracion = new Concentracion(app, puerto, { ...PREFERENCIAS_POR_DEFECTO });

    await concentracion.alternar();
    expect(clases.has('concentracion')).toBe(true);
    expect(puerto.pantallaCompletaLlamadas).toEqual([true]);
  });

  it('escenario 2: Escape restaura todo sin tocar el cursor', async () => {
    const app = {
      classList: { toggle: () => {} },
      style: { setProperty: () => {} },
    } as unknown as HTMLElement;
    const puerto = new PuertoFalso();
    const concentracion = new Concentracion(app, puerto, { ...PREFERENCIAS_POR_DEFECTO });
    await concentracion.entrar();
    const cursor = { anchor: 42, head: 42 };

    const evento = { key: 'Escape', preventDefault: () => {} } as KeyboardEvent;
    concentracion.manejarTecla(evento);
    await Promise.resolve();

    expect(concentracion.activa).toBe(false);
    expect(cursor).toEqual({ anchor: 42, head: 42 });
  });

  it('escenario 3: el modo lectura no es editable', () => {
    const html = renderizarLectura('# Título\n\nTexto\n');
    expect(html).toContain('<h1>Título</h1>');
    expect(html).not.toContain('contenteditable="true"');
  });

  it('el ancho de columna se limita al rango accesible', () => {
    expect(limitarAnchoColumna(10)).toBe(60);
    expect(limitarAnchoColumna(200)).toBe(90);
  });
});
