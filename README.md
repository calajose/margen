# Margen

Editor Markdown de escritorio, minimalista y local, para escribir sin distracciones.

Margen abre directamente en un documento en blanco, permite escribir con formato visible y guarda Markdown estándar (CommonMark + GFM) en disco. No tiene cuentas, nube, colaboración, plugins ni telemetría. Nunca descarga recursos remotos.

## Estado

Implementación funcional sobre Tauri 2 + TypeScript:

- Modelo de documento con fuente canónica única e historial compartido entre modos.
- Modo visual (Milkdown/ProseMirror), modo fuente (CodeMirror 6) y modo lectura saneado.
- Conmutación de modos sin sincronización viva (ADR-006), con protección de HTML crudo y tablas irregulares.
- Guardado atómico en Rust, detección de conflictos por mtime y borradores de recuperación.
- Autoguardado únicamente en el borrador; el archivo original solo cambia con guardado explícito.
- Barra de estado discreta, atajos de teclado, temas claro/oscuro/auto y modo concentración.
- 196 pruebas JS/TS y 7 pruebas Rust en verde; build de frontend verificado.

Pendiente de verificación antes de declarar el producto terminado:

- PoC en navegador real (Milkdown) de las 10 validaciones de `plan.md` §2.
- CI en los tres sistemas nativos y prueba de instaladores en máquinas limpias.
- Auditoría manual de accesibilidad con lector de pantalla.

Detalle en `docs/limitaciones.md` y en los resultados de la PoC.

## Requisitos

- Node.js 22 o superior y npm.
- Rust 1.90 o superior (`rustup`).
- Linux: `libwebkit2gtk-4.1-dev`, `libgtk-3-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`, `pkg-config`, `libssl-dev`.
- Windows: WebView2 (incluido en Windows 10/11) y Build Tools de Visual Studio.
- macOS: Xcode Command Line Tools.

## Comandos

```bash
npm install            # dependencias del frontend
npm test               # pruebas unitarias, round-trip e integración
npm run test:rust      # pruebas nativas (escritura atómica, borradores)
npm run lint           # ESLint
npm run build          # build del frontend
npm run tauri:dev      # aplicación de escritorio en desarrollo
npm run tauri:build    # instaladores nativos
npm run poc            # arnés de la PoC en el navegador
```

## Estructura

```
src/
  app/            arranque, modos, concentración, atajos, recuperación
  documento/      modelo, historial, serializador, conmutación, mapeo de cursor
  editor-visual/  adaptador Milkdown, listas, código, tablas, verbatim
  editor-fuente/  adaptador CodeMirror 6
  persistencia/   puerto IPC, guardado, autoguardado, demo de navegador
  ui/             barra de estado, avisos, conflictos
  poc/            arnés de validación (no forma parte de la app)
src-tauri/        backend Rust mínimo (archivos, borradores, ventana, menú)
tests/            unitarias, round-trip, integración, fixtures y benchmark
docs/             compilación y limitaciones
```

## Principios de diseño

1. El Markdown canónico es la única fuente de verdad; los editores lo presentan.
2. Una sola vista activa: la conmutación serializa y recarga, nunca sincroniza dos editores.
3. Rust transporta bytes; no interpreta Markdown.
4. Cero red: sin plugins HTTP, sin actualizador, sin descarga de imágenes remotas.
5. Sin Python en ningún punto del desarrollo, build, CI o ejecución.

Las especificaciones funcionales y técnicas viven en el repositorio privado del proyecto.
