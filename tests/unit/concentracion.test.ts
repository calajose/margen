import { describe, expect, it } from 'vitest';
import { Concentracion } from '../../src/app/concentracion';
import { limitarAnchoColumna, PREFERENCIAS_POR_DEFECTO } from '../../src/app/preferencias';
import { PuertoFalso } from '../integration/mock-puerto';

function appFalsa() {
  const clases = new Set<string>();
  const propiedades = new Map<string, string>();
  return {
    element: {
      classList: {
        toggle: (clase: string, activo: boolean) => {
          if (activo) clases.add(clase);
          else clases.delete(clase);
        },
      },
      style: {
        setProperty: (clave: string, valor: string) => propiedades.set(clave, valor),
      },
    } as unknown as HTMLElement,
    clases,
    propiedades,
  };
}

describe('modo concentración', () => {
  it('limita el ancho de columna a 60–90 caracteres', () => {
    expect(limitarAnchoColumna(40)).toBe(60);
    expect(limitarAnchoColumna(120)).toBe(90);
    expect(limitarAnchoColumna(72.6)).toBe(73);
  });

  it('activa la clase, la pantalla completa y la preferencia', async () => {
    const { element, clases } = appFalsa();
    const puerto = new PuertoFalso();
    const preferencias = { ...PREFERENCIAS_POR_DEFECTO };
    const cambios: boolean[] = [];
    const concentracion = new Concentracion(element, puerto, preferencias, (activa) =>
      cambios.push(activa),
    );

    await concentracion.entrar();
    expect(concentracion.activa).toBe(true);
    expect(clases.has('concentracion')).toBe(true);
    expect(puerto.pantallaCompletaLlamadas).toEqual([true]);
    expect(cambios).toEqual([true]);

    await concentracion.salir();
    expect(concentracion.activa).toBe(false);
    expect(clases.has('concentracion')).toBe(false);
    expect(puerto.pantallaCompletaLlamadas).toEqual([true, false]);
  });

  it('Escape sale de concentración y conserva el cursor', async () => {
    const { element } = appFalsa();
    const puerto = new PuertoFalso();
    const concentracion = new Concentracion(element, puerto, { ...PREFERENCIAS_POR_DEFECTO });
    await concentracion.entrar();

    const evento = { key: 'Escape', preventDefault: () => {} } as KeyboardEvent;
    expect(concentracion.manejarTecla(evento)).toBe(true);
    await Promise.resolve();
    expect(concentracion.activa).toBe(false);
  });

  it('Escape fuera de concentración no se consume', () => {
    const { element } = appFalsa();
    const concentracion = new Concentracion(element, new PuertoFalso(), {
      ...PREFERENCIAS_POR_DEFECTO,
    });
    const evento = { key: 'Escape', preventDefault: () => {} } as KeyboardEvent;
    expect(concentracion.manejarTecla(evento)).toBe(false);
  });

  it('aplica el ancho limitado al documento', async () => {
    const { element, propiedades } = appFalsa();
    const concentracion = new Concentracion(element, new PuertoFalso(), {
      ...PREFERENCIAS_POR_DEFECTO,
    });
    concentracion.aplicarAnchoColumna(200);
    expect(propiedades.get('--ancho-columna')).toBe('90ch');
  });
});
