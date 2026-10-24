import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Documento } from '../../src/documento/documento';
import { Autoguardado } from '../../src/persistencia/autoguardado';
import { GestorConflicto } from '../../src/ui/conflicto';
import { Recuperacion } from '../../src/app/recuperacion';
import { Cierre } from '../../src/app/cierre';
import { PuertoFalso } from './mock-puerto';
import { ErrorIpc } from '../../src/persistencia/ipc';

describe('US3: integridad, autoguardado y recuperación', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('el autoguardado solo escribe el borrador, nunca el original', async () => {
    const puerto = new PuertoFalso();
    puerto.archivos.set('/tmp/nota.md', { contenido: 'original', marca: 1 });
    const documento = new Documento();
    documento.cargar('original', '/tmp/nota.md', 1);

    const autoguardado = new Autoguardado(documento, puerto, 'sesion-a', {
      intervaloMs: 45_000,
      retardoInactividadMs: 2_000,
    });

    documento.editar('cambio sin guardar');
    autoguardado.notificarEdicion();
    await vi.advanceTimersByTimeAsync(45_000);

    expect(puerto.archivos.get('/tmp/nota.md')?.contenido).toBe('original');
    expect(puerto.borradores.get('sesion-a')?.volcado).toBe('cambio sin guardar');
    expect(documento.estadoGuardado).toBe('sucia');
  });

  it('el conflicto suspende el autoguardado', async () => {
    const puerto = new PuertoFalso();
    const documento = new Documento();
    documento.cargar('base', '/tmp/c.md', 1);
    const autoguardado = new Autoguardado(documento, puerto, 'sesion-b', {
      intervaloMs: 45_000,
      retardoInactividadMs: 2_000,
    });
    documento.cambioExterno();
    autoguardado.notificarEdicion();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(puerto.borradores.size).toBe(0);
  });

  it('conflicto externo: conservar locales no sobrescribe el disco', async () => {
    const puerto = new PuertoFalso();
    puerto.archivos.set('/tmp/c.md', { contenido: 'externo', marca: 9 });
    const documento = new Documento();
    documento.cargar('base', '/tmp/c.md', 1);
    documento.editar('local');

    const gestor = new GestorConflicto(documento, puerto, {
      preguntar: async () => 'conservar',
    });
    await gestor.manejarCambioExterno();

    expect(documento.estadoGuardado).toBe('sucia');
    expect(puerto.archivos.get('/tmp/c.md')?.contenido).toBe('externo');
  });

  it('conflicto externo: recargar trae la versión del disco', async () => {
    const puerto = new PuertoFalso();
    puerto.archivos.set('/tmp/d.md', { contenido: 'externo', marca: 9 });
    const documento = new Documento();
    documento.cargar('base', '/tmp/d.md', 1);
    documento.editar('local');

    const gestor = new GestorConflicto(documento, puerto, {
      preguntar: async () => 'recargar',
    });
    await gestor.manejarCambioExterno();

    expect(documento.fuente).toBe('externo');
    expect(documento.estadoGuardado).toBe('limpia');
  });

  it('recuperación: 20 ciclos de caída restauran el borrador íntegro', async () => {
    for (let i = 0; i < 20; i += 1) {
      const puerto = new PuertoFalso();
      puerto.archivos.set('/tmp/r.md', { contenido: 'base', marca: 1 });
      puerto.borradores.set('sesion-x', {
        idSesion: 'sesion-x',
        rutaOriginal: '/tmp/r.md',
        volcado: `cambio ${i} con ñ y 😀`,
        marcaTiempo: String(i),
      });

      const documento = new Documento();
      const recuperacion = new Recuperacion(puerto, documento, {
        preguntar: async () => true,
      });
      await recuperacion.buscar('otra-sesion');
      const restaurado = await recuperacion.ofrecer();

      expect(restaurado).toBe(true);
      expect(documento.fuente).toBe(`cambio ${i} con ñ y 😀`);
      expect(documento.estadoGuardado).toBe('sucia');
      expect(documento.ruta).toBe('/tmp/r.md');
      expect(puerto.borradores.has('sesion-x')).toBe(true);
    }
  });

  it('recuperación: el borrador se elimina solo al guardar o descartar', async () => {
    const puerto = new PuertoFalso();
    puerto.borradores.set('sesion-y', {
      idSesion: 'sesion-y',
      rutaOriginal: null,
      volcado: 'texto',
      marcaTiempo: '1',
    });
    const documento = new Documento();
    const recuperacion = new Recuperacion(puerto, documento, { preguntar: async () => true });
    await recuperacion.buscar('actual');
    expect(puerto.borradores.size).toBe(1);
    await recuperacion.liquidar('sesion-y');
    expect(puerto.borradores.size).toBe(0);
  });

  it('cierre: cancelar no cierra; descartar cierra sin guardar', async () => {
    const documento = new Documento();
    documento.editar('cambios');
    let cerrado = false;
    let guardadoLlamado = false;

    const cierreCancelar = new Cierre(
      documento,
      { preguntar: async () => 'cancelar' },
      async () => {
        guardadoLlamado = true;
      },
      () => {
        cerrado = true;
      },
    );
    expect(await cierreCancelar.solicitarCierre()).toBe(false);
    expect(cerrado).toBe(false);
    expect(guardadoLlamado).toBe(false);

    const cierreDescartar = new Cierre(
      documento,
      { preguntar: async () => 'descartar' },
      async () => {
        guardadoLlamado = true;
      },
      () => {
        cerrado = true;
      },
    );
    expect(await cierreDescartar.solicitarCierre()).toBe(true);
    expect(cerrado).toBe(true);
    expect(guardadoLlamado).toBe(false);
  });

  it('cierre con guardado fallido mantiene la ventana abierta', async () => {
    const documento = new Documento();
    documento.editar('cambios');
    let cerrado = false;

    const cierre = new Cierre(
      documento,
      { preguntar: async () => 'guardar' },
      async () => {
        documento.guardadoError();
        throw new ErrorIpc('sin_permiso');
      },
      () => {
        cerrado = true;
      },
    );
    await expect(cierre.solicitarCierre()).rejects.toThrow();
    expect(cerrado).toBe(false);
    expect(documento.estadoGuardado).toBe('error');
  });
});
