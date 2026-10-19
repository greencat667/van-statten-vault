// Bundles src/ (Three.js r180, addons, app, embedded meshes) into one
// self-contained HTML file: van_statten_vault.html.
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';

const res = await build({
  entryPoints: ['src/main.js'],
  bundle: true,
  format: 'esm',
  minify: true,
  target: 'es2022',
  write: false,
  loader: { '.bin': 'base64' },
  legalComments: 'none',
  logLevel: 'warning',
});
let js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const banner = '/* The Vault — fan reconstruction. Three.js r180 (MIT, three.js authors) bundled. Cyberman helmet body: "Classic Cyberman Helmet" by ZacharyAnnese, Thingiverse 6839144, CC BY-SA. Dalek: rsfuhrer, Printables 12372, CC BY-NC-SA 4.0. TARDIS: CGTrader "TARDIS 2005 model A/B", Royalty Free. */\n';
const html = readFileSync('src/index.html', 'utf8').replace('/*BUNDLE*/', () => banner + js);
writeFileSync('van_statten_vault.html', html);
console.log(`van_statten_vault.html ${(html.length / 1048576).toFixed(2)} MB`);
