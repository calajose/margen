import { describe, expect, it } from 'vitest';
import { Documento } from '../../src/documento/documento';
import { Guardado } from '../../src/persistencia/guardado';
import { GestorConflicto } from '../../src/ui/conflicto';
import { ErrorIpc } from '../../src/persistencia/ipc';
import { PuertoFalso } from './mock-puerto';

describe('conflicto externo', () => {
  it('detecta mtime distinto al guardar y no sobrescribe', async () => {
    const puerto = new PuertoFalso();
    puerto.archivos.set('/tmp/conf.md', { contenido: 'base', marca: 10 });
    const documento = new Documento();
    const guardado = new Guardado(documento, puerto);
    await guardado.abrir('/tmp/conf.md');

    documento.editar('local');
    puerto.archivos.set('/tmp/conf.md', { contenido: 'externo', marca: 11 });

    await expect(guardado.guardar()).rejects.toBeInstanceOf(ErrorIpc);
    expect(puerto.archivos.get('/tmp/conf.md')?.contenido).toBe('externo');
  });

  it('sobrescribir con confirmación escribe la versión local', async () => {
    const puerto = new PuertoFalso();
    puerto.archivos.set('/tmp/conf2.md', { contenido: 'externo', marca: 11 });
    const documento = new Documento();
    documento.cargar('base', '/tmp/conf2.md', 10);
    documento.editar('local');

    const gestor = new GestorConflicto(documento, puerto, {
      preguntar: async () => 'sobrescribir',
    });
    await gestor.manejarCambioExterno();
    expect(puerto.archivos.get('/tmp/conf2.md')?.contenido).toBe('local');
    expect(documento.estadoGuardado).toBe('limpia');
  });

  it('un cambio externo suspende el autoguardado hasta resolver', () => {
    const documento = new Documento();
    documento.cargar('base', '/tmp/x.md', 1);
    documento.cambioExterno();
    expect(documento.estadoGuardado).toBe('conflicto');
    documento.conflictoResuelto();
    expect(documento.estadoGuardado).toBe('sucia');
  });
});
