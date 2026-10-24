import { describe, expect, it } from 'vitest';
import { Documento } from '../../src/documento/documento';

describe('Documento', () => {
  it('empieza limpio y sin ruta', () => {
    const doc = new Documento();
    expect(doc.estadoGuardado).toBe('limpia');
    expect(doc.ruta).toBeNull();
    expect(doc.fuente).toBe('');
  });

  it('editar marca sucio y registra historial', () => {
    const doc = new Documento();
    doc.editar('Hola mundo', { anchor: 10, head: 10 });
    expect(doc.estadoGuardado).toBe('sucia');
    expect(doc.modificado).toBe(true);
    expect(doc.historial.actual()?.fuente).toBe('Hola mundo');
  });

  it('guardar fija ruta y limpia el estado', () => {
    const doc = new Documento();
    doc.editar('contenido');
    doc.marcarGuardando();
    doc.guardadoOk('/tmp/doc.md', 1234);
    expect(doc.estadoGuardado).toBe('limpia');
    expect(doc.ruta).toBe('/tmp/doc.md');
    expect(doc.marcaDisco).toBe(1234);
  });

  it('restaurar borrador queda sucio y vinculado a la ruta original', () => {
    const doc = new Documento();
    doc.restaurarBorrador('texto recuperado', '/tmp/doc.md');
    expect(doc.estadoGuardado).toBe('sucia');
    expect(doc.ruta).toBe('/tmp/doc.md');
  });

  it('deshacer/reactivar contenido externo actualiza estado coherentemente', () => {
    const doc = new Documento();
    doc.cargar('base', '/tmp/a.md', 1);
    doc.editar('base editada');
    doc.cambioExterno();
    expect(doc.estadoGuardado).toBe('conflicto');
    doc.aceptarContenidoExterno('versión del disco', 2);
    expect(doc.estadoGuardado).toBe('limpia');
    expect(doc.fuente).toBe('versión del disco');
  });

  it('notifica a los suscriptores en cada cambio', () => {
    const doc = new Documento();
    let avisos = 0;
    const desuscribir = doc.suscribir(() => {
      avisos += 1;
    });
    doc.editar('a');
    doc.guardadoOk('/tmp/a.md', 1);
    desuscribir();
    doc.editar('b');
    expect(avisos).toBe(2);
  });
});
