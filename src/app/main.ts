import { Documento } from '../documento/documento';
import { Autoguardado } from '../persistencia/autoguardado';
import { Guardado } from '../persistencia/guardado';
import { entornoTauri, ErrorIpc, puertoTauri } from '../persistencia/ipc';
import { puertoDemo } from '../persistencia/demo';
import { Avisos } from '../ui/errores-vista';
import { BarraEstado } from '../ui/barra-estado';
import { GestorConflicto, dialogoConflictoNativo } from '../ui/conflicto';
import { ControlModos } from './modos';
import { Concentracion } from './concentracion';
import { Cierre, dialogoCierreNativo } from './cierre';
import { Recuperacion, dialogoRecuperacionNativo } from './recuperacion';
import { instalarAtajos } from './atajos';
import { alternarEncabezado, alternarFormatoEnLinea, insertarEnlace } from './atajos-formato';
import { abrirConDialogo, instalarArrastre } from './apertura';
import { manejarPegado } from './pegar';
import { aplicarTema, cargarPreferencias, type Tema } from './preferencias';

const app = document.querySelector<HTMLElement>('#app');
const lienzo = document.querySelector<HTMLElement>('#lienzo');
const barra = document.querySelector<HTMLElement>('#barra-estado');
if (!app || !lienzo || !barra) throw new Error('Falta la estructura base de Margen');

const preferencias = cargarPreferencias();
aplicarTema(preferencias.tema);

const idSesion =
  globalThis.localStorage?.getItem('margen.sesion') ??
  globalThis.crypto?.randomUUID?.() ??
  `sesion-${Date.now()}`;
try {
  globalThis.localStorage?.setItem('margen.sesion', idSesion);
} catch {
  // Sin almacenamiento local: la sesión es efímera.
}

const puerto = entornoTauri() ? puertoTauri : puertoDemo();
const documento = new Documento();
const avisos = new Avisos();
const guardado = new Guardado(documento, puerto);
const autoguardado = new Autoguardado(documento, puerto, idSesion, {
  intervaloMs: preferencias.intervaloAutoguardadoSeg * 1000,
});
const conflicto = new GestorConflicto(documento, puerto, dialogoConflictoNativo());
const recuperacion = new Recuperacion(puerto, documento, dialogoRecuperacionNativo());
const concentracion = new Concentracion(app, puerto, preferencias, (activa) => {
  app.dataset.concentracion = String(activa);
});

const estadoUi: { barra?: BarraEstado } = {};

function alEditar(fuente: string, seleccion: { anchor: number; head: number }): void {
  documento.editar(fuente, seleccion);
  if (documento.modificado) autoguardado.notificarEdicion();
}

const control = new ControlModos({
  documento,
  contenedor: lienzo,
  alCambiarModo: (modo) => {
    estadoUi.barra?.refrescar(modo);
    lienzo.dataset.modo = modo;
  },
  alEditar,
});

const barraEstado = new BarraEstado(barra, documento, {
  cambiarModo: (modo) => void control.cambiar(modo),
});
estadoUi.barra = barraEstado;

// Al hacer clic en el margen o en la zona vacía bajo el texto, el foco vuelve
// al editor activo. Sin esto, el área editable parecía limitarse a la línea
// que ya contenía texto.
lienzo.addEventListener('pointerdown', (evento) => {
  const objetivo = evento.target as HTMLElement | null;
  if (objetivo?.closest('.ProseMirror, .cm-editor')) return;
  control.vistaActiva.enfocar();
});

documento.suscribir(() => {
  barraEstado.refrescar(control.modo);
  actualizarTitulo();
});

function actualizarTitulo(): void {
  const nombre = documento.ruta?.split(/[\\/]/).pop() ?? 'Sin título';
  const marca = documento.modificado ? ' •' : '';
  document.title = `${nombre}${marca} — Margen`;
}

async function guardar(): Promise<void> {
  try {
    await guardado.guardar();
    await recuperacion.liquidar(idSesion);
  } catch (error) {
    if (error instanceof ErrorIpc && error.codigo === 'conflicto_externo') {
      await conflicto.manejarCambioExterno();
      return;
    }
    avisos.mostrarError(error, [
      { etiqueta: 'Reintentar', ejecutar: () => void guardar(), primaria: true },
      { etiqueta: 'Guardar como', ejecutar: () => void guardarComo() },
      { etiqueta: 'Cancelar', ejecutar: () => avisos.cerrar() },
    ]);
  }
}

async function guardarComo(): Promise<void> {
  try {
    await guardado.guardarComo();
    await recuperacion.liquidar(idSesion);
  } catch (error) {
    avisos.mostrarError(error, [
      { etiqueta: 'Reintentar', ejecutar: () => void guardarComo(), primaria: true },
      { etiqueta: 'Cancelar', ejecutar: () => avisos.cerrar() },
    ]);
  }
}

async function abrirRuta(ruta: string): Promise<void> {
  try {
    await guardado.abrir(ruta);
    control.refrescar();
  } catch (error) {
    avisos.mostrarError(error, [
      { etiqueta: 'Elegir otro archivo', ejecutar: () => void abrir(), primaria: true },
      { etiqueta: 'Cancelar', ejecutar: () => avisos.cerrar() },
    ]);
  }
}

async function abrir(): Promise<void> {
  try {
    await abrirConDialogo(puerto, abrirRuta);
  } catch (error) {
    avisos.mostrarError(error);
  }
}

async function nuevo(): Promise<void> {
  const cierre = new Cierre(documento, dialogoCierreNativo(), guardar, () => {
    documento.cargar('', null);
    control.refrescar();
  });
  await cierre.solicitarCierre();
}

function insertarMarkdown(texto: string): void {
  const { anchor, head } = documento.seleccion;
  const fuente = documento.fuente;
  documento.editar(fuente.slice(0, anchor) + texto + fuente.slice(head), {
    anchor: anchor + texto.length,
    head: anchor + texto.length,
  });
  control.refrescar();
}

function aplicarFormato(formato: 'negrita' | 'cursiva' | 'tachado' | 'codigo' | 'enlace'): void {
  const resultado =
    formato === 'enlace'
      ? insertarEnlace(documento.fuente, documento.seleccion)
      : alternarFormatoEnLinea(documento.fuente, documento.seleccion, formato);
  documento.editar(resultado.fuente, resultado.seleccion);
  control.refrescar();
}

function aplicarEncabezado(nivel: 1 | 2 | 3 | 4 | 5 | 6): void {
  const resultado = alternarEncabezado(documento.fuente, documento.seleccion, nivel);
  documento.editar(resultado.fuente, resultado.seleccion);
  control.refrescar();
}

function cambiarTema(tema: Tema): void {
  preferencias.tema = tema;
  aplicarTema(tema);
}

instalarAtajos({
  'Mod+S': () => void guardar(),
  'Mod+Shift+S': () => void guardarComo(),
  'Mod+O': () => void abrir(),
  'Mod+N': () => void nuevo(),
  'Mod+/': () => void control.alternarFuente(),
  F11: () => void concentracion.alternar(),
  Escape: (evento) => {
    if (!concentracion.manejarTecla(evento)) avisos.cerrar();
  },
  'Mod+Z': () => control.deshacer(),
  'Mod+Shift+Z': () => control.rehacer(),
  'Mod+Y': () => control.rehacer(),
  'Mod+B': () => aplicarFormato('negrita'),
  'Mod+I': () => aplicarFormato('cursiva'),
  'Mod+Shift+X': () => aplicarFormato('tachado'),
  'Mod+K': () => aplicarFormato('enlace'),
  'Mod+1': () => aplicarEncabezado(1),
  'Mod+2': () => aplicarEncabezado(2),
  'Mod+3': () => aplicarEncabezado(3),
  'Mod+4': () => aplicarEncabezado(4),
  'Mod+5': () => aplicarEncabezado(5),
  'Mod+6': () => aplicarEncabezado(6),
  'Mod+Shift+T': () => cambiarTema(siguienteTema(preferencias.tema)),
});

document.addEventListener('paste', (evento) => {
  const textoPlano = pegadoTextoPlano;
  pegadoTextoPlano = false;
  const markdown = manejarPegado(evento, textoPlano);
  if (!markdown) return;
  evento.preventDefault();
  insertarMarkdown(markdown);
});

let pegadoTextoPlano = false;
window.addEventListener('keydown', (evento) => {
  if ((evento.ctrlKey || evento.metaKey) && evento.shiftKey && evento.key.toLowerCase() === 'v') {
    pegadoTextoPlano = true;
    setTimeout(() => {
      pegadoTextoPlano = false;
    }, 1500);
  }
});

instalarArrastre(lienzo as HTMLElement, (ruta) => void abrirRuta(ruta));

window.addEventListener('beforeunload', (evento) => {
  if (!documento.modificado) return;
  evento.preventDefault();
  evento.returnValue = '';
  void autoguardado.volcarAhora();
});

window.addEventListener('pagehide', () => {
  void autoguardado.volcarAhora();
});

function siguienteTema(actual: Tema): Tema {
  const orden: Tema[] = ['auto', 'claro', 'oscuro'];
  return orden[(orden.indexOf(actual) + 1) % orden.length];
}

async function conectarEventosTauri(): Promise<void> {
  if (!entornoTauri()) return;
  try {
    const { listen } = await import('@tauri-apps/api/event');
    await listen<string>('menu:accion', (evento) => {
      const accion = evento.payload;
      if (accion === 'nuevo') void nuevo();
      if (accion === 'abrir') void abrir();
      if (accion === 'guardar') void guardar();
      if (accion === 'guardar_como') void guardarComo();
      if (accion === 'concentracion') void concentracion.alternar();
    });
    await listen('archivo_modificado_externamente', () => {
      void conflicto.manejarCambioExterno();
    });
    await listen('archivo_eliminado_externamente', () => {
      void conflicto.manejarCambioExterno();
    });
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().onCloseRequested(async (evento) => {
      const cierre = new Cierre(documento, dialogoCierreNativo(), guardar, () => {
        void autoguardado.volcarAhora();
      });
      if (!(await cierre.solicitarCierre())) {
        evento.preventDefault();
        return;
      }
      await autoguardado.volcarAhora();
    });
  } catch {
    // Sin eventos nativos disponibles (modo navegador).
  }
}

async function iniciar(): Promise<void> {
  await control.iniciar();
  barraEstado.montar(control.modo);
  concentracion.aplicarAnchoColumna(preferencias.anchoColumna);

  const pendientes = await recuperacion.buscar(idSesion);
  if (pendientes.length > 0) {
    const restaurado = await recuperacion.ofrecer();
    if (restaurado) control.refrescar();
  }

  await conectarEventosTauri();
  control.vistaActiva.enfocar();
  actualizarTitulo();
}

void iniciar();
