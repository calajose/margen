// Construye el paquete pacman de Margen (.pkg.tar.zst) para Arch Linux/CachyOS.
//
// Tauri v2 ya no genera paquetes de pacman (solo deb, rpm y appimage en Linux),
// así que empaquetamos el binario de release con nFPM usando packaging/nfpm.yaml.
//
// Uso: npm run empaquetar:arch   (requiere antes `npm run tauri:build`)
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, platform, arch } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const NFPM_VERSION = '2.48.0';
const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(raiz);

const conf = JSON.parse(readFileSync(join('src-tauri', 'tauri.conf.json'), 'utf8'));
const binario = join('src-tauri', 'target', 'release', 'margen');
const salida = join('src-tauri', 'target', 'release', 'bundle', 'arch');

if (!existsSync(binario)) {
  console.error(`✗ No se encuentra el binario ${binario}.`);
  console.error('  Compila antes los bundles con: npm run tauri:build');
  process.exit(1);
}

const nfpm = await localizarNfpm();
mkdirSync(salida, { recursive: true });

const resultado = spawnSync(
  nfpm,
  ['package', '--config', 'packaging/nfpm.yaml', '--packager', 'archlinux', '--target', salida],
  { stdio: 'inherit', env: { ...process.env, VERSION: conf.version } },
);

if (resultado.error) {
  console.error(`✗ No se pudo ejecutar nfpm: ${resultado.error.message}`);
  process.exit(1);
}
if (resultado.status !== 0) {
  process.exit(resultado.status ?? 1);
}

console.log(`✓ Paquete pacman generado en ${salida}/ (versión ${conf.version})`);

// Devuelve la ruta de un binario nfpm: el de NFPM_BIN, el del PATH o uno
// descargado y cacheado en ~/.cache/margen.
async function localizarNfpm() {
  if (process.env.NFPM_BIN) return process.env.NFPM_BIN;

  const enPath = spawnSync('nfpm', ['--version'], { stdio: 'ignore' });
  if (!enPath.error && enPath.status === 0) return 'nfpm';

  const directorio = join(homedir(), '.cache', 'margen', `nfpm-${NFPM_VERSION}`);
  const binarioNfpm = join(directorio, 'nfpm');
  if (existsSync(binarioNfpm)) return binarioNfpm;

  if (platform() !== 'linux' || arch() !== 'x64') {
    console.error('✗ nfpm no está instalado y la descarga automática solo soporta Linux x86_64.');
    console.error('  Instálalo a mano: https://nfpm.goreleaser.com/docs/install/');
    process.exit(1);
  }

  const url = `https://github.com/goreleaser/nfpm/releases/download/v${NFPM_VERSION}/nfpm_${NFPM_VERSION}_Linux_x86_64.tar.gz`;
  console.log(`↓ Descargando nFPM ${NFPM_VERSION}…`);
  const respuesta = await fetch(url);
  if (!respuesta.ok) {
    console.error(`✗ Error al descargar nfpm (${respuesta.status} ${respuesta.statusText}).`);
    process.exit(1);
  }

  mkdirSync(directorio, { recursive: true });
  const tarball = join(directorio, 'nfpm.tar.gz');
  writeFileSync(tarball, Buffer.from(await respuesta.arrayBuffer()));

  const extraido = spawnSync('tar', ['-xzf', tarball, '-C', directorio, 'nfpm'], { stdio: 'inherit' });
  if (extraido.error || extraido.status !== 0) {
    console.error('✗ No se pudo extraer el tarball de nfpm.');
    process.exit(1);
  }
  chmodSync(binarioNfpm, 0o755);
  return binarioNfpm;
}
