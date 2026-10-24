# Compilación y verificación

## 1. Preparación

```bash
npm install
rustup toolchain install 1.90.0
rustup default 1.90.0
```

En Linux, además:

```bash
sudo apt-get update
sudo apt-get install -y libwebkit2gtk-4.1-dev libgtk-3-dev \
  libayatana-appindicator3-dev librsvg2-dev pkg-config libssl-dev
```

## 2. Pruebas

```bash
npm test                 # 196 pruebas JS/TS
npm run test:rust        # 7 pruebas Rust
npm run lint
npx tsc --noEmit
```

Las pruebas cubren:

- modelo de documento, máquina de estados e historial;
- corpus de 30 documentos con idempotencia y 20 conmutaciones por documento;
- guardar/reabrir, conflicto externo, autoguardado y recuperación;
- protección de HTML crudo y tablas irregulares;
- Unicode español y emojis;
- aislamiento de red por configuración y por código;
- benchmark de 1k/10k/50k/100k palabras.

## 3. Build del frontend

```bash
npm run build
```

Genera `dist/`. El aviso de tamaño de fragmento (>500 kB) es esperado por
Milkdown + CodeMirror en una sola entrada; no afecta a la corrección.

## 4. Aplicación de escritorio

```bash
npm run tauri:dev
npm run tauri:build
```

Los instaladores se configuran en `src-tauri/tauri.conf.json`
(`bundle.targets = "all"`). Antes de publicar hay que validar cada artefacto en
una máquina o VM limpia del sistema correspondiente.

## 5. CI

`.github/workflows/ci.yml` ejecuta en Ubuntu, Windows y macOS:

1. `npm ci` y `npm run build`;
2. `npm test`;
3. instalación de Rust 1.90 y dependencias de WebKit en Linux;
4. `cargo check` del proyecto nativo.

La validación de instaladores en máquinas limpias no está automatizada.
