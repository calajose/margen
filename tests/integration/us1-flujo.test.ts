import { describe, expect, it } from 'vitest';
import { Documento } from '../../src/documento/documento';
import { Guardado } from '../../src/persistencia/guardado';
import { PuertoFalso } from './mock-puerto';

describe('US1: escritura inmediata y guardado local', () => {
  it('escenario 1: el documento arranca vacío y editable (sin onboarding)', () => {
    const documento = new Documento();
    expect(documento.fuente).toBe('');
    expect(documento.ruta).toBeNull();
    expect(documento.soloLectura).toBe(false);
    expect(documento.modificado).toBe(false);
  });

  it('escenario 2: escribir y guardar como crea el archivo en la ruta elegida', async () => {
    const puerto = new PuertoFalso();
    const documento = new Documento();
    const guardado = new Guardado(documento, puerto);

    documento.editar('# Título\n\nUn párrafo con **negrita**.\n');
    expect(documento.estadoGuardado).toBe('sucia');

    await guardado.guardar();
    expect(documento.estadoGuardado).toBe('limpia');
    expect(documento.ruta).toBe('/tmp/guardado-como.md');
    expect(puerto.archivos.get('/tmp/guardado-como.md')?.contenido).toContain('# Título');
  });

  it('escenario 3: cerrar y reabrir conserva contenido y representación', async () => {
    const puerto = new PuertoFalso();
    const documento = new Documento();
    const guardado = new Guardado(documento, puerto);
    const contenido = '# Año 2026\n\nNiño, canción, ¿qué tal? 😀\n';
    documento.editar(contenido);
    await guardado.guardar();

    const reabierto = new Documento();
    const guardado2 = new Guardado(reabierto, puerto);
    await guardado2.abrir('/tmp/guardado-como.md');
    expect(reabierto.fuente).toBe(contenido);
    expect(reabierto.estadoGuardado).toBe('limpia');
  });

  it('escenario 4: error de permiso deja el documento sucio y notifica', async () => {
    const puerto = new PuertoFalso();
    puerto.archivos.set('/tmp/ro.md', { contenido: 'base', marca: 1 });
    const documento = new Documento();
    const guardado = new Guardado(documento, puerto);
    await guardado.abrir('/tmp/ro.md');
    documento.editar('cambio');
    puerto.fallarGuardado = new Error('sin_permiso');
    await expect(guardado.guardar()).rejects.toThrow();
    expect(documento.estadoGuardado).toBe('error');
    expect(documento.modificado).toBe(true);
  });

  it('guardar como cancelado no marca el documento como guardado', async () => {
    const puerto = new PuertoFalso();
    puerto.rutaGuardarComo = null;
    const documento = new Documento();
    const guardado = new Guardado(documento, puerto);
    documento.editar('texto');
    await guardado.guardarComo();
    expect(puerto.archivos.size).toBe(0);
  });
});
