import { Documento } from '../documento/documento';
import { ConmutadorModos, type Modo, type Vista } from '../documento/conmutar';
import { mismaSemantica, normalizar } from '../documento/serializador';
import { EditorFuente } from '../editor-fuente';
import { EditorVisual } from '../editor-visual';
import { MetricasPoc } from './metricas';

/**
 * Arnés de la PoC (T007/T013). No es la aplicación real: sirve para medir
 * fidelidad semántica, latencia de conmutación, mapeo de cursor y bucles de
 * sincronización antes de continuar con la implementación.
 */

const corpus = import.meta.glob('/tests/fixtures/corpus/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

const selector = document.querySelector<HTMLSelectElement>('#documento')!;
const lienzo = document.querySelector<HTMLElement>('#lienzo')!;
const metricas = document.querySelector<HTMLElement>('#metricas')!;
const resultados = document.querySelector<HTMLElement>('#resultados')!;

const documento = new Documento();
const motor = new ConmutadorModos(documento);
const contador = new MetricasPoc();

const alEditar = (fuente: string, seleccion: { anchor: number; head: number }) => {
  documento.editar(fuente, seleccion);
};

const visual = new EditorVisual(alEditar);
const fuente = new EditorFuente(alEditar);

let original = '';

for (const [ruta, contenido] of Object.entries(corpus)) {
  const opcion = document.createElement('option');
  opcion.value = contenido;
  opcion.textContent = ruta.split('/').pop() ?? ruta;
  selector.append(opcion);
}

function montar(vista: Vista): void {
  const elemento = (vista as unknown as { elemento?: HTMLElement }).elemento;
  if (elemento) {
    lienzo.replaceChildren(elemento);
    elemento.hidden = false;
  }
}

function actualizarMetricas(extra: Record<string, unknown>): void {
  metricas.textContent = JSON.stringify(
    {
      ...motor.metricas,
      ...contador,
      ...extra,
    },
    null,
    2,
  );
}

function registrar(nombre: string, ok: boolean, detalle: string): void {
  const fila = document.createElement('p');
  fila.className = ok ? 'resultado-ok' : 'resultado-fallo';
  fila.textContent = `${ok ? '✓' : '✗'} ${nombre}: ${detalle}`;
  resultados.append(fila);
}

async function iniciar(): Promise<void> {
  await visual.preparado;
  montar(visual);
  motor.conmutar('visual', visual);
  original = selector.value || Object.values(corpus)[0] || '# Hola\n';
  visual.cargar(original, { anchor: 0, head: 0 });
  actualizarMetricas({ estado: 'listo' });
}

document.querySelector('#cargar')?.addEventListener('click', () => {
  original = selector.value;
  contador.reiniciar();
  if (motor.modo === 'visual') {
    visual.cargar(original, { anchor: 0, head: 0 });
  } else {
    fuente.cargar(original, { anchor: 0, head: 0 });
  }
  motor.metricas.parses = 0;
  motor.metricas.conmutaciones = 0;
  actualizarMetricas({ estado: 'documento cargado' });
});

document.querySelector('#conmutar')?.addEventListener('click', () => {
  const destino: Modo = motor.modo === 'visual' ? 'fuente' : 'visual';
  const vista = destino === 'visual' ? visual : fuente;
  montar(vista);
  motor.conmutar(destino, vista);
  contador.registrarConmutacion();
  contador.registrarParse();
  actualizarMetricas({ estado: `modo ${destino}`, cursor: motor.vista?.leerSeleccion() });
});

document.querySelector('#deshacer')?.addEventListener('click', () => {
  for (let i = 0; i < 15; i += 1) motor.deshacer();
  actualizarMetricas({ estado: 'deshecho ×15' });
});

document.querySelector('#verificar')?.addEventListener('click', () => {
  const actual = motor.vista?.leerFuente() ?? '';
  const fiel = mismaSemantica(original, normalizar(actual));
  registrar('Fidelidad semántica', fiel, fiel ? 'idéntica' : 'difiere del original');
  registrar(
    'Sin sincronización viva',
    !motor.metricas.vivaSincronizacionActiva && contador.sincronizacionesVivas === 0,
    `${contador.sincronizacionesVivas} sincronizaciones`,
  );
  registrar(
    'Parsea como máximo una vez por conmutación',
    contador.parses <= motor.metricas.conmutaciones + 1,
    `${contador.parses} parses / ${motor.metricas.conmutaciones} conmutaciones`,
  );
});

void iniciar();
