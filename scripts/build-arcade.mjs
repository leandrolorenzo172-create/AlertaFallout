// Gera um único ficheiro HTML (CSS e JavaScript embutidos) com os 3 jogos do Mini Jogo:
// dist/arcade.html (publicado no GitHub Pages) e arcade/mini-arcade-retro.html (cópia no repositório).
import { build } from 'esbuild';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';

const res = await build({
  entryPoints: ['src/arcade/standalone.js'], bundle: true, minify: true, format: 'iife', write: false,
  target: ['es2020'], loader: { '.css': 'text' }, legalComments: 'none',
});
const js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = `<!doctype html>
<html lang="pt-PT">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#001a00">
<title>Mini Arcade Retro</title>
<!-- Mini Arcade Retro: Patrulha Estelar, Cobra e Guerra das Eras. Ficheiro único, funciona sem internet. -->
</head>
<body>
<div id="app"></div>
<script>${js}</script>
</body>
</html>
`;
mkdirSync('arcade', { recursive: true });
writeFileSync('arcade/mini-arcade-retro.html', html);
if (existsSync('dist')) writeFileSync('dist/arcade.html', html);
console.log(`arcade: ${(html.length / 1024).toFixed(0)} KB`);
