import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import fs from 'node:fs';

// Gera dist/sw.js com a lista de todos os ficheiros da app e uma versão nova em cada build.
function serviceWorker() {
  let outDir = 'dist';
  return {
    name: 'pipboy-service-worker',
    apply: 'build',
    configResolved(cfg) { outDir = cfg.build.outDir; },
    closeBundle() {
      const files = [];
      const walk = (dir) => {
        for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, f.name);
          if (f.isDirectory()) walk(full);
          else files.push(path.relative(outDir, full).split(path.sep).join('/'));
        }
      };
      walk(outDir);
      const precache = ['./', ...files.filter((f) => f !== 'sw.js' && !f.endsWith('.map') && !f.startsWith('icons/tempo/') && f !== 'guia-steeldeck.pdf') /* o guia fica guardado no IndexedDB da estante */ /* miniaturas das notificações: só se descarregam quando chega uma */.sort()];
      const version = `${new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 6)}`;
      const sw = fs.readFileSync('scripts/sw-template.js', 'utf8')
        .replace('__VERSION__', version)
        .replace('__PRECACHE__', JSON.stringify(precache, null, 1));
      fs.writeFileSync(path.join(outDir, 'sw.js'), sw);
      console.log(`sw.js: versão ${version}, ${precache.length} ficheiros na cache`);
    },
  };
}

// Copia a aplicação de rota a pé offline (ficheiro único) para dist/rota-offline.html: abre-se também sozinha
function standaloneRoute() {
  let outDir = 'dist';
  return {
    name: 'steeldeck-rota-offline', apply: 'build',
    configResolved(cfg) { outDir = cfg.build.outDir; },
    writeBundle() { fs.copyFileSync('src/map/rota-offline.html', path.join(outDir, 'rota-offline.html')); },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), standaloneRoute(), serviceWorker()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  build: {
    assetsInlineLimit: 100000,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      // app.js e app.css com nome fixo (o artefacto do claude.ai aponta para eles);
      // partes carregadas só quando precisas (hls.js) ficam em assets/
      output: { entryFileNames: 'app.js', chunkFileNames: 'assets/[name]-[hash].js', assetFileNames: 'app[extname]' },
    },
  },
});
