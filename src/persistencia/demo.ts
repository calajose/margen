import type { Borrador, PuertoArchivos, ResultadoApertura, ResultadoGuardado } from './ipc';

/**
 * Puerto de archivos para desarrollo en navegador y pruebas manuales.
 * En producción se usa `puertoTauri`; este no se empaqueta en la app nativa.
 */
export function puertoDemo(): PuertoArchivos {
  const archivos = new Map<string, string>();
  const borradores = new Map<string, Borrador>();

  return {
    async abrir(ruta): Promise<ResultadoApertura> {
      const contenido = archivos.get(ruta) ?? '';
      return { contenido, marcaDisco: Date.now(), soloLectura: false };
    },
    async guardar(ruta, contenido): Promise<ResultadoGuardado> {
      archivos.set(ruta, contenido);
      return { ruta, marcaDisco: Date.now() };
    },
    async guardarComo(contenido): Promise<ResultadoGuardado | null> {
      const nombre = globalThis.prompt('Guardar como (ruta):', 'documento.md');
      if (!nombre) return null;
      archivos.set(nombre, contenido);
      descargar(nombre, contenido);
      return { ruta: nombre, marcaDisco: Date.now() };
    },
    async seleccionarArchivo(): Promise<string | null> {
      const entrada = document.createElement('input');
      entrada.type = 'file';
      entrada.accept = '.md,.markdown,.txt,text/markdown,text/plain';
      const archivo = await new Promise<File | null>((resolver) => {
        entrada.addEventListener('change', () => resolver(entrada.files?.[0] ?? null));
        entrada.click();
      });
      if (!archivo) return null;
      const texto = await archivo.text();
      archivos.set(archivo.name, texto);
      return archivo.name;
    },
    async guardarBorrador(idSesion, rutaOriginal, volcado) {
      borradores.set(idSesion, {
        idSesion,
        rutaOriginal,
        volcado,
        marcaTiempo: new Date().toISOString(),
      });
      try {
        localStorage.setItem(`margen.borrador.${idSesion}`, JSON.stringify(borradores.get(idSesion)));
      } catch {
        // Sin almacenamiento: se mantiene en memoria.
      }
    },
    async cargarBorradores() {
      return [...borradores.values()];
    },
    async descartarBorrador(idSesion) {
      borradores.delete(idSesion);
      try {
        localStorage.removeItem(`margen.borrador.${idSesion}`);
      } catch {
        // Ignorar.
      }
    },
    async observarArchivo() {
      // El navegador no puede observar archivos locales.
    },
    async pantallaCompleta(activo) {
      if (activo) await document.documentElement.requestFullscreen?.();
      else if (document.fullscreenElement) await document.exitFullscreen?.();
    },
  };
}

function descargar(nombre: string, contenido: string): void {
  const blob = new Blob([contenido], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(url);
}
