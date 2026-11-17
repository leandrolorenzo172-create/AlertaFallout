// Gera o ficheiro autónomo radio-fallout-pt.html a partir do sintonizador da app.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const css = readFileSync('src/radio/radioTuner.css', 'utf8');
const strip = (f) => readFileSync(f, 'utf8').replace(/^import .*$/gm, '').replace(/^export /gm, '');
const js = strip('src/radio/canvasTheme.js') + '\n' + strip('src/radio/radioTuner.js');

const html = `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Rádio Fallout PT</title>
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
${js}
mountRadio(document.getElementById('radio'));
</script>
</body>
</html>
`;
writeFileSync('radio-fallout-pt.html', html);
mkdirSync('public', { recursive: true });
writeFileSync('public/radio-fallout-pt.html', html);
console.log('radio-fallout-pt.html', html.length, 'bytes');
