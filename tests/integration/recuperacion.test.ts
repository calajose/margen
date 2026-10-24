import { describe, expect, it } from 'vitest';
import { Documento } from '../../src/documento/documento';
import { Recuperacion } from '../../src/app/recuperacion';
import { PuertoFalso } from './mock-puerto';

describe('recuperación ante fallos', () => {
  it('restaura el borrador más reciente y lo mantiene hasta guardar o descartar', async () => {
    const puerto = new PuertoFalso();
    puerto.borradores.set('s1', {
      idSesion: 's1',
      rutaOriginal: '/tmp/nota.md',
      volcado: 'contenido recuperado con ñ',
      marcaTiempo: '100',
    });
    puerto.borradores.set('s2', {
      idSesion: 's2',
      rutaOriginal: '/tmp/otra.md',
      volcado: 'más reciente',
      marcaTiempo: '200',
    });

    const documento = new Documento();
    const recuperacion = new Recuperacion(puerto, documento, { preguntar: async () => true });
    const pendientes = await recuperacion.buscar('actual');
    expect(pendientes).toHaveLength(2);

    const restaurado = await recuperacion.ofrecer();
    expect(restaurado).toBe(true);
    expect(documento.fuente).toBe('contenido recuperado con ñ');
    expect(documento.estadoGuardado).toBe('sucia');
    expect(puerto.borradores.size).toBe(2);
  });

  it('si el usuario rechaza, no restaura nada', async () => {
    const puerto = new PuertoFalso();
    puerto.borradores.set('s1', {
      idSesion: 's1',
      rutaOriginal: null,
      volcado: 'x',
      marcaTiempo: '1',
    });
    const documento = new Documento();
    const recuperacion = new Recuperacion(puerto, documento, { preguntar: async () => false });
    await recuperacion.buscar('actual');
    expect(await recuperacion.ofrecer()).toBe(false);
    expect(documento.fuente).toBe('');
  });

  it('un fallo de recolección no impide arrancar', async () => {
    const puerto = new PuertoFalso();
    puerto.fallarBorradores = true;
    const recuperacion = new Recuperacion(puerto, new Documento(), {
      preguntar: async () => true,
    });
    expect(await recuperacion.buscar('actual')).toEqual([]);
    expect(await recuperacion.ofrecer()).toBe(false);
  });
});
