/**
 * Fachada IPC con el backend Rust (contracts/tauri-ipc.md).
 *
 * Se define un puerto inyectable para poder probar la lógica sin Tauri y para
 * aislar el resto de la aplicación de la API concreta del contenedor.
 */

export type CodigoError =
  | 'no_existe'
  | 'sin_permiso'
  | 'ruta_invalida'
  | 'disco_no_disponible'
  | 'conflicto_externo'
  | 'cancelado'
  | 'error_recoleccion'
  | 'desconocido';

export class ErrorIpc extends Error {
  readonly codigo: CodigoError;

  constructor(codigo: CodigoError, mensaje?: string) {
    super(mensaje ?? codigo);
    this.name = 'ErrorIpc';
    this.codigo = codigo;
  }
}

export interface ResultadoApertura {
  contenido: string;
  marcaDisco: number;
  soloLectura: boolean;
}

export interface ResultadoGuardado {
  ruta: string;
  marcaDisco: number;
}

export interface Borrador {
  idSesion: string;
  rutaOriginal: string | null;
  volcado: string;
  marcaTiempo: string;
}

export interface PuertoArchivos {
  abrir(ruta: string): Promise<ResultadoApertura>;
  guardar(ruta: string, contenido: string, marcaEsperada: number | null): Promise<ResultadoGuardado>;
  guardarComo(contenido: string): Promise<ResultadoGuardado | null>;
  seleccionarArchivo(): Promise<string | null>;
  guardarBorrador(idSesion: string, rutaOriginal: string | null, volcado: string): Promise<void>;
  cargarBorradores(): Promise<Borrador[]>;
  descartarBorrador(idSesion: string): Promise<void>;
  observarArchivo(ruta: string): Promise<void>;
  pantallaCompleta(activo: boolean): Promise<void>;
}

function invocar<T>(comando: string, argumentos?: Record<string, unknown>): Promise<T> {
  const carga = import('@tauri-apps/api/core');
  return carga.then(({ invoke }) => invoke<T>(comando, argumentos));
}

function normalizarError(error: unknown): ErrorIpc {
  if (error instanceof ErrorIpc) return error;
  const texto = typeof error === 'string' ? error : error instanceof Error ? error.message : '';
  const codigos: CodigoError[] = [
    'no_existe',
    'sin_permiso',
    'ruta_invalida',
    'disco_no_disponible',
    'conflicto_externo',
    'cancelado',
    'error_recoleccion',
  ];
  const hallado = codigos.find((codigo) => texto.includes(codigo));
  return new ErrorIpc(hallado ?? 'desconocido', texto);
}

/** Implementación real sobre Tauri 2. */
export const puertoTauri: PuertoArchivos = {
  async abrir(ruta) {
    try {
      return await invocar<ResultadoApertura>('abrir_documento', { ruta });
    } catch (error) {
      throw normalizarError(error);
    }
  },
  async guardar(ruta, contenido, marcaEsperada) {
    try {
      return await invocar<ResultadoGuardado>('guardar_documento', {
        ruta,
        contenido,
        marcaEsperada,
      });
    } catch (error) {
      throw normalizarError(error);
    }
  },
  async guardarComo(contenido) {
    try {
      return await invocar<ResultadoGuardado | null>('guardar_como', { contenido });
    } catch (error) {
      throw normalizarError(error);
    }
  },
  async seleccionarArchivo() {
    try {
      return await invocar<string | null>('seleccionar_archivo');
    } catch (error) {
      throw normalizarError(error);
    }
  },
  async guardarBorrador(idSesion, rutaOriginal, volcado) {
    await invocar('guardar_borrador', { idSesion, rutaOriginal, volcado });
  },
  async cargarBorradores() {
    return invocar<Borrador[]>('cargar_borradores');
  },
  async descartarBorrador(idSesion) {
    await invocar('descartar_borrador', { idSesion });
  },
  async observarArchivo(ruta) {
    await invocar('observar_archivo', { ruta });
  },
  async pantallaCompleta(activo) {
    await invocar('ventana_pantalla_completa', { activo });
  },
};

/** ¿Se está ejecutando dentro de Tauri? */
export function entornoTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}
