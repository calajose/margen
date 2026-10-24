import { ErrorIpc, type CodigoError } from '../persistencia/ipc';

export interface AccionAviso {
  etiqueta: string;
  ejecutar: () => void;
  primaria?: boolean;
}

const MENSAJES: Record<CodigoError, { texto: string; accion: string }> = {
  no_existe: { texto: 'El archivo ya no existe en esa ruta.', accion: 'Guardar como' },
  sin_permiso: {
    texto: 'No hay permisos para escribir en ese archivo.',
    accion: 'Guardar como',
  },
  ruta_invalida: { texto: 'La ruta del archivo no es válida.', accion: 'Guardar como' },
  disco_no_disponible: {
    texto: 'El disco no está disponible en este momento.',
    accion: 'Reintentar',
  },
  conflicto_externo: {
    texto: 'El archivo cambió fuera de Margen.',
    accion: 'Revisar conflicto',
  },
  cancelado: { texto: 'Operación cancelada.', accion: 'Cerrar' },
  error_recoleccion: {
    texto: 'No se pudieron leer los borradores de recuperación.',
    accion: 'Continuar',
  },
  desconocido: { texto: 'Ocurrió un error inesperado.', accion: 'Reintentar' },
};

/** Avisos discretos con mensaje en español y acción sugerida (plan.md §4). */
export class Avisos {
  private readonly contenedor: HTMLElement;
  private actual: HTMLElement | null = null;

  constructor(contenedor: HTMLElement = document.body) {
    this.contenedor = contenedor;
  }

  mostrarError(error: unknown, acciones: AccionAviso[] = []): void {
    const codigo = error instanceof ErrorIpc ? error.codigo : 'desconocido';
    const { texto } = MENSAJES[codigo];
    this.mostrar(texto, acciones);
  }

  mostrar(texto: string, acciones: AccionAviso[] = []): void {
    this.cerrar();
    const aviso = document.createElement('div');
    aviso.className = 'aviso';
    aviso.setAttribute('role', 'alert');

    const mensaje = document.createElement('p');
    mensaje.textContent = texto;
    mensaje.style.margin = '0 0 0.6rem';
    aviso.append(mensaje);

    for (const accion of acciones) {
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.textContent = accion.etiqueta;
      if (accion.primaria) boton.autofocus = true;
      boton.addEventListener('click', () => {
        this.cerrar();
        accion.ejecutar();
      });
      aviso.append(boton);
    }

    if (acciones.length === 0) {
      const cerrar = document.createElement('button');
      cerrar.type = 'button';
      cerrar.textContent = 'Cerrar';
      cerrar.addEventListener('click', () => this.cerrar());
      aviso.append(cerrar);
    }

    this.contenedor.append(aviso);
    this.actual = aviso;
    const primero = aviso.querySelector('button');
    primero?.focus();
  }

  cerrar(): void {
    this.actual?.remove();
    this.actual = null;
  }
}

/** Texto de acción sugerida para un código de error. */
export function accionSugerida(codigo: CodigoError): string {
  return MENSAJES[codigo].accion;
}
