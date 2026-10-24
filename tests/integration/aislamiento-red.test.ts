import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const raiz = process.cwd();

function leer(ruta: string): string {
  return readFileSync(join(raiz, ruta), 'utf8');
}

function archivosFuente(directorio: string): string[] {
  const salida: string[] = [];
  for (const entrada of readdirSync(directorio)) {
    const ruta = join(directorio, entrada);
    if (statSync(ruta).isDirectory()) salida.push(...archivosFuente(ruta));
    else if (/\.(ts|rs|json|html)$/.test(entrada)) salida.push(ruta);
  }
  return salida;
}

describe('aislamiento de red (SC-007)', () => {
  it('no incluye plugins HTTP ni actualizador', () => {
    const paquete = leer('package.json');
    expect(paquete).not.toContain('@tauri-apps/plugin-http');
    expect(paquete).not.toContain('plugin-updater');

    const cargo = leer('src-tauri/Cargo.toml');
    expect(cargo).not.toContain('tauri-plugin-http');
    expect(cargo).not.toContain('tauri-plugin-updater');
    expect(cargo).not.toContain('reqwest');
  });

  it('las capacidades nativas no conceden red ni sistema de archivos', () => {
    const capacidades = leer('src-tauri/capabilities/default.json');
    expect(capacidades).not.toContain('http');
    expect(capacidades).not.toContain('fs:');
    expect(capacidades).not.toContain('shell');
  });

  it('la CSP no permite recursos remotos', () => {
    const configuracion = JSON.parse(leer('src-tauri/tauri.conf.json')) as {
      app: { security: { csp: string } };
    };
    const csp = configuracion.app.security.csp;
    expect(csp).toContain("img-src 'self' data:");
    const sinExcepcionLocal = csp.replace('http://ipc.localhost', '');
    expect(sinExcepcionLocal).not.toContain('https:');
    expect(sinExcepcionLocal).not.toContain('http:');
    expect(csp).toContain('ipc:');
  });

  it('el código de la aplicación no realiza peticiones de red', () => {
    const archivos = [
      ...archivosFuente(join(raiz, 'src')),
      ...archivosFuente(join(raiz, 'src-tauri', 'src')),
    ];
    const sospechosos = archivos.filter((archivo) => {
      const contenido = readFileSync(archivo, 'utf8');
      return /\bfetch\s*\(|XMLHttpRequest|WebSocket|https?:\/\/[^\s'"]+/.test(
        contenido.replace(/https:\/\/schema\.tauri\.app[^\s'"]*/g, ''),
      );
    });
    expect(sospechosos).toEqual([]);
  });

  it('el modo lectura bloquea imágenes remotas', () => {
    // Se comprueba también en us5-formato; aquí se fija el invariante global.
    const lectura = leer('src/app/lectura.ts');
    expect(lectura).toContain('rehypeImagenesLocales');
    expect(lectura).toContain('imagen remota');
  });
});
