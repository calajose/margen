import type { Documento } from '../documento/documento';
import { ErrorIpc, type PuertoArchivos } from './ipc';

/**
 * Fachada de guardado explícito. El autoguardado NO pasa por aquí: solo el
 * guardado del usuario escribe en el archivo original (FR-006/FR-007).
 */
export class Guardado {
  private readonly documento: Documento;
  private readonly puerto: PuertoArchivos;
  private enCurso = false;

  constructor(documento: Documento, puerto: PuertoArchivos) {
    this.documento = documento;
    this.puerto = puerto;
  }

  get ocupado(): boolean {
    return this.enCurso;
  }

  /** Guarda en la ruta actual; si no existe, delega en `guardarComo`. */
  async guardar(): Promise<void> {
    if (this.enCurso) return;
    if (!this.documento.ruta) {
      await this.guardarComo();
      return;
    }
    if (this.documento.soloLectura) {
      throw new ErrorIpc('sin_permiso', 'El documento es de solo lectura');
    }
    await this.escribir(this.documento.ruta);
  }

  async guardarComo(): Promise<void> {
    if (this.enCurso) return;
    this.enCurso = true;
    this.documento.marcarGuardando();
    try {
      const resultado = await this.puerto.guardarComo(this.documento.fuente);
      if (!resultado) {
        // Cancelado por el usuario: no se altera el estado de guardado.
        this.documento.conflictoResuelto();
        return;
      }
      this.documento.guardadoOk(resultado.ruta, resultado.marcaDisco);
      await this.puerto.observarArchivo(resultado.ruta);
    } catch (error) {
      this.documento.guardadoError();
      throw error;
    } finally {
      this.enCurso = false;
    }
  }

  private async escribir(ruta: string): Promise<void> {
    this.enCurso = true;
    this.documento.marcarGuardando();
    try {
      const resultado = await this.puerto.guardar(
        ruta,
        this.documento.fuente,
        this.documento.marcaDisco,
      );
      this.documento.guardadoOk(resultado.ruta ?? ruta, resultado.marcaDisco);
    } catch (error) {
      this.documento.guardadoError();
      throw error;
    } finally {
      this.enCurso = false;
    }
  }

  /** Abre un archivo y lo carga en el documento. */
  async abrir(ruta: string): Promise<void> {
    const resultado = await this.puerto.abrir(ruta);
    this.documento.cargar(
      resultado.contenido,
      ruta,
      resultado.marcaDisco,
      resultado.soloLectura,
    );
    await this.puerto.observarArchivo(ruta);
  }
}
