// Gera o ficheiro autónomo radio-fallout-pt.html a partir do sintonizador da app.
// Tudo fica dentro do HTML (lista de emissoras e hls.js), para não depender de outros sites.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const css = readFileSync('src/radio/radioTuner.css', 'utf8');
const strip = (f) => readFileSync(f, 'utf8')
  .replace(/^import .*$/gm, '')
  .replace(/^export \{[^}]*\};?$/gm, '')
  .replace(/^export /gm, '');
const stations = JSON.parse(readFileSync('src/data/stationsPT.json', 'utf8'));
const hlsJs = readFileSync('node_modules/hls.js/dist/hls.min.js', 'utf8');
const safe = (code) => code.replace(/<\/script/gi, '<\\/script'); // não fechar o <script> antes do tempo

const js = [
  `const stationsPT = ${JSON.stringify(stations)};`,
  strip('src/radio/defaultStations.js'),
  strip('src/radio/canvasTheme.js'),
  strip('src/radio/nowPlaying.js'),
  strip('src/radio/radioTuner.js'),
].join('\n');

const html = `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Rádio SteelDeck</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=VT323&display=swap" />
<style>
:root { --c: 0 255 65; --cd: 0 26 0; --cb: 0 10 0; }
html, body { margin: 0; min-height: 100%; background: #0a0d0a; color-scheme: dark; }
body { display: flex; align-items: center; justify-content: center; padding: 12px 0;
  background: radial-gradient(ellipse at 50% 0%, #1a2019, #050605 70%); }
#radio { width: 100%; }
${css}
</style>
</head>
<body>
<div id="radio"></div>
<script>
${safe(hlsJs)}
</script>
<script>
${safe(js)}
// Link partilhado: #f=97.4, #f=1000&b=AM (também aceita #/radio?f=97.4)
function readHash() {
  const h = location.hash.replace(/^#/, '');
  const p = new URLSearchParams(h.includes('?') ? h.slice(h.indexOf('?') + 1) : h);
  const f = Number(p.get('f'));
  return { initialFreq: p.get('f') && Number.isFinite(f) ? f : undefined, band: p.get('b') === 'AM' ? 'AM' : (p.get('f') ? 'FM' : undefined) };
}
const linkHash = (f, b) => '#f=' + f + (b === 'AM' ? '&b=AM' : '');
let destroyRadio = null;
function start() {
  if (destroyRadio) destroyRadio();
  destroyRadio = mountRadio(document.getElementById('radio'), Object.assign(readHash(), {
    onTune: (f, b) => { lastHash = linkHash(f, b); history.replaceState(null, '', location.pathname + location.search + lastHash); },
    shareUrl: (f, b) => location.href.split('#')[0] + linkHash(f, b),
  }));
}
let lastHash = location.hash;
window.addEventListener('hashchange', () => { if (location.hash !== lastHash) { lastHash = location.hash; start(); } });
start();
</script>
</body>
</html>
`;
writeFileSync('radio-fallout-pt.html', html);
mkdirSync('public', { recursive: true });
writeFileSync('public/radio-fallout-pt.html', html);
console.log('radio-fallout-pt.html', html.length, 'bytes,', stations.stations.length, 'emissoras extra');
