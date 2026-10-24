# Limitaciones conocidas

Este documento refleja el estado real de la implementación, no el ideal del plan.

## Verificación pendiente

- **PoC en navegador**: las validaciones de fidelidad semántica, cursor,
  historial y ausencia de bucles se ejecutan sin DOM. La latencia real de
  conmutación con Milkdown y el comportamiento de HTML en línea requieren abrir
  `npm run poc` en un navegador y registrar los resultados en `poc-results.md`.
- **Multiplataforma**: el build nativo se compiló y probó solo en Linux. No se
  han generado ni probado instaladores de Windows ni macOS.
- **Accesibilidad manual**: existen foco visible, etiquetas textuales y atajos,
  pero no se ha hecho una auditoría con lector de pantalla ni con usuarios.

## Comportamiento del editor visual

- El **HTML crudo en bloque** se sustituye por un bloque literal identificado
  antes de entrar en Milkdown y se restaura al serializar. El usuario lo ve como
  código, no como HTML renderizado.
- Las **tablas GFM irregulares** también se protegen como bloque literal para no
  perder celdas. La edición celda a celda depende del preset GFM en tablas
  regulares; no hay una interfaz de tabla propia.
- El **HTML en línea** (`<kbd>`, `<br>`) puede degradarse a texto en modo visual.
  El modo fuente y el guardado lo conservan; conviene revisarlo en la PoC.
- La selección se mapea por texto plano con una heurística de marcas Markdown.
  El objetivo de ±2 caracteres está cubierto en pruebas unitarias, pero no se ha
  medido con el editor real en todos los formatos.

## Ventanas y sesiones

- La aplicación usa una sola ventana. La aclaración de reutilizar una ventana
  vacía o abrir otra no está implementada todavía; abrir un archivo reemplaza el
  documento de la ventana actual tras confirmar cambios.
- La sesión de recuperación es por instalación, no por ventana. El borrador se
  elimina al guardar o al descartar la recuperación, según la aclaración.

## Rendimiento

- El parseo/serialización de 50 000 palabras tarda ~2,6 s y el de 100 000
  ~5,2 s en Node (entorno de pruebas). El objetivo provisional de conmutación
  <200 ms para 50 000 palabras **no está confirmado** y probablemente requiera
  optimización o revisión del objetivo tras medir en la aplicación real.
- El bundle inicial supera 1 MB minificado por los editores; no se ha aplicado
  división de código.

## Fuera de alcance por diseño

- Sin nube, cuentas, colaboración, IA, plugins ni base de datos de notas.
- Sin descarga de imágenes remotas: en modo lectura se sustituyen por una marca
  textual; en modo visual la CSP de Tauri impide la petición y se muestra el
  texto alternativo.
- Sin Python en ningún punto del proyecto.
