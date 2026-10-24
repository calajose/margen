import { describe, expect, it } from 'vitest';
import { cargarCorpus } from '../fixtures/corpus';
import { normalizar } from '../../src/documento/serializador';
import { Documento } from '../../src/documento/documento';
import { Guardado } from '../../src/persistencia/guardado';
import { PuertoFalso } from '../integration/mock-puerto';

describe('guardar y reabrir', () => {
  const corpus = cargarCorpus().slice(0, 10);

  for (const documento of corpus) {
    it(`conserva bytes tras guardar y reabrir: ${documento.nombre}`, async () => {
      const puerto = new PuertoFalso();
      puerto.archivos.set('/tmp/prueba.md', { contenido: documento.contenido, marca: 1 });

      const doc = new Documento();
      const guardado = new Guardado(doc, puerto);
      await guardado.abrir('/tmp/prueba.md');

      // Simula una edición visual que normaliza el Markdown.
      doc.editar(normalizar(doc.fuente));
      await guardado.guardar();

      const enDisco = puerto.archivos.get('/tmp/prueba.md')?.contenido ?? '';
      expect(enDisco).toBe(normalizar(documento.contenido));

      const doc2 = new Documento();
      const guardado2 = new Guardado(doc2, puerto);
      await guardado2.abrir('/tmp/prueba.md');
      expect(doc2.fuente).toBe(enDisco);
      expect(doc2.estadoGuardado).toBe('limpia');
    });
  }

  it('no escribe el archivo original al editar (solo el guardado explícito)', async () => {
    const puerto = new PuertoFalso();
    puerto.archivos.set('/tmp/a.md', { contenido: 'original', marca: 1 });
    const doc = new Documento();
    const guardado = new Guardado(doc, puerto);
    await guardado.abrir('/tmp/a.md');
    doc.editar('cambiado');
    expect(puerto.archivos.get('/tmp/a.md')?.contenido).toBe('original');
    await guardado.guardar();
    expect(puerto.archivos.get('/tmp/a.md')?.contenido).toBe('cambiado');
  });

  it('detecta conflicto externo y no sobrescribe', async () => {
    const puerto = new PuertoFalso();
    puerto.archivos.set('/tmp/b.md', { contenido: 'base', marca: 1 });
    const doc = new Documento();
    const guardado = new Guardado(doc, puerto);
    await guardado.abrir('/tmp/b.md');

    doc.editar('local');
    puerto.archivos.set('/tmp/b.md', { contenido: 'externo', marca: 99 });

    await expect(guardado.guardar()).rejects.toMatchObject({ codigo: 'conflicto_externo' });
    expect(puerto.archivos.get('/tmp/b.md')?.contenido).toBe('externo');
    expect(doc.estadoGuardado).toBe('error');
  });
});
