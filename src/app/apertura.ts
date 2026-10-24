import type { PuertoArchivos } from '../persistencia/ipc';

/**
 * Entradas de apertura (FR-002): diálogo nativo, arrastrar y soltar y
 * eventos de menú emitidos por Rust.
 */
export async function abrirConDialogo(
  puerto: PuertoArchivos,
  alAbrir: (ruta: string) => Promise<void>,
): Promise<boolean> {
  const ruta = await puerto.seleccionarArchivo();
  if (!ruta) return false;
  await alAbrir(ruta);
  return true;
}

export function instalarArrastre(
  elemento: HTMLElement,
  alSoltar: (ruta: string) => void,
): () => void {
  const evitar = (evento: DragEvent) => {
    evento.preventDefault();
    evento.stopPropagation();
  };

  const alEntrar = (evento: DragEvent) => {
    evitar(evento);
    elemento.classList.add('arrastrando');
  };
  const alSalir = (evento: DragEvent) => {
    evitar(evento);
    elemento.classList.remove('arrastrando');
  };
  const alDrop = (evento: DragEvent) => {
    evitar(evento);
    elemento.classList.remove('arrastrando');
    const archivo = evento.dataTransfer?.files?.[0];
    if (!archivo) return;
    const ruta = (archivo as File & { path?: string }).path;
    if (ruta) {
      alSoltar(ruta);
      return;
    }
    // Navegador: sin ruta real de disco; se usa el nombre como referencia.
    alSoltar(archivo.name);
  };

  elemento.addEventListener('dragenter', alEntrar);
  elemento.addEventListener('dragover', alEntrar);
  elemento.addEventListener('dragleave', alSalir);
  elemento.addEventListener('drop', alDrop);

  return () => {
    elemento.removeEventListener('dragenter', alEntrar);
    elemento.removeEventListener('dragover', alEntrar);
    elemento.removeEventListener('dragleave', alSalir);
    elemento.removeEventListener('drop', alDrop);
  };
}
