import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  // Tauri espera una salida estática predecible.
  envPrefix: ['VITE_', 'TAURI_'],
});
