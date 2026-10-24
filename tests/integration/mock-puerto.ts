import type { Borrador, PuertoArchivos, ResultadoApertura, ResultadoGuardado } from '../../src/persistencia/ipc';
import { ErrorIpc } from '../../src/persistencia/ipc';

/** Puerto en memoria para pruebas de integración (sin Tauri ni disco real). */
export class PuertoFalso implements PuertoArchivos {
  archivos = new Map<string, { contenido: string; marca: number }>();
  borradores = new Map<string, Borrador>();
  escrituras: Array<{ ruta: string; contenido: string }> = [];
  observados: string[] = [];
  pantallaCompletaLlamadas: boolean[] = [];
  rutaGuardarComo: string | null = '/tmp/guardado-como.md';
  rutaSeleccion: string | null = '/tmp/seleccionado.md';
  fallarGuardado: Error | null = null;
  fallarApertura: Error | null = null;
  fallarBorradores = false;

  async abrir(ruta: string): Promise<ResultadoApertura> {
    if (this.fallarApertura) throw this.fallarApertura;
    const archivo = this.archivos.get(ruta);
    if (!archivo) throw new ErrorIpc('no_existe');
    return { contenido: archivo.contenido, marcaDisco: archivo.marca, soloLectura: false };
  }

  async guardar(
    ruta: string,
    contenido: string,
    marcaEsperada: number | null,
  ): Promise<ResultadoGuardado> {
    if (this.fallarGuardado) throw this.fallarGuardado;
    const actual = this.archivos.get(ruta);
    if (marcaEsperada !== null && actual && actual.marca !== marcaEsperada) {
      throw new ErrorIpc('conflicto_externo');
    }
    const marca = (actual?.marca ?? 0) + 1;
    this.archivos.set(ruta, { contenido, marca });
    this.escrituras.push({ ruta, contenido });
    return { ruta, marcaDisco: marca };
  }

  async guardarComo(contenido: string): Promise<ResultadoGuardado | null> {
    if (!this.rutaGuardarComo) return null;
    const marca = (this.archivos.get(this.rutaGuardarComo)?.marca ?? 0) + 1;
    this.archivos.set(this.rutaGuardarComo, { contenido, marca });
    this.escrituras.push({ ruta: this.rutaGuardarComo, contenido });
    return { ruta: this.rutaGuardarComo, marcaDisco: marca };
  }

  async seleccionarArchivo(): Promise<string | null> {
    return this.rutaSeleccion;
  }

  async guardarBorrador(
    idSesion: string,
    rutaOriginal: string | null,
    volcado: string,
  ): Promise<void> {
    this.borradores.set(idSesion, {
      idSesion,
      rutaOriginal,
      volcado,
      marcaTiempo: String(Date.now()),
    });
  }

  async cargarBorradores(): Promise<Borrador[]> {
    if (this.fallarBorradores) throw new ErrorIpc('error_recoleccion');
    return [...this.borradores.values()];
  }

  async descartarBorrador(idSesion: string): Promise<void> {
    this.borradores.delete(idSesion);
  }

  async observarArchivo(ruta: string): Promise<void> {
    this.observados.push(ruta);
  }

  async pantallaCompleta(activo: boolean): Promise<void> {
    this.pantallaCompletaLlamadas.push(activo);
  }
}
