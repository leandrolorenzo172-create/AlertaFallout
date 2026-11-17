// Service worker do Pip-Boy Terminal (gerado em cada build por vite.config.js).
// - Guarda a app (HTML, JS, CSS, ícones, manual e dados) para abrir sem internet.
// - NUNCA guarda nem interceta streams de áudio (.m3u8, .aac, .mp3...) nem as APIs de dados ao vivo:
//   esses pedidos seguem diretamente para a rede, como se o service worker não existisse.
// - A versão muda em cada build, por isso os utilizadores recebem as atualizações.
const VERSION = '__VERSION__';
const CACHE = `pipboy-app-${VERSION}`;
const FONTS = 'pipboy-fontes';
const PRECACHE = __PRECACHE__;
const BASE = new URL('./', self.location).href; // funciona em /AlertaFallout/ ou na raiz

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(PRECACHE.map((p) => new Request(BASE + p, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('pipboy-app-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const AUDIO = /\.(m3u8|m3u|pls|aac|mp3|ogg|oga|opus|m4a|flac|ts)(\?|$)/i;

// Rede primeiro (validando com o servidor, sem usar a cache HTTP do browser), cópia guardada sem internet.
// Assim uma versão nova aparece logo na próxima abertura da app.
async function networkFirst(req, key, ms) {
  const cache = await caches.open(CACHE);
  try {
    const res = await Promise.race([fetch(req, { cache: 'no-cache' }), new Promise((_, rej) => setTimeout(() => rej(new Error('lento')), ms))]);
    if (res && res.ok) cache.put(key || req, res.clone());
    return res;
  } catch (e) {
    const hit = await cache.match(key || req, { ignoreSearch: true });
    if (hit) return hit;
    throw e;
  }
}
async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
  return res;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || req.headers.has('range')) return; // streams pedem por partes: não tocar
  if (req.destination === 'audio' || req.destination === 'video') return;
  const url = new URL(req.url);
  if (AUDIO.test(url.pathname)) return;

  if (url.href.startsWith(BASE)) {
    if (req.mode === 'navigate') {
      event.respondWith(networkFirst(req, BASE + 'index.html', 4000));
    } else if (url.pathname.includes('/data/')) {
      event.respondWith(networkFirst(req, null, 6000)); // notícias recolhidas de hora a hora: rede primeiro, cópia sem internet
    } else if (url.pathname.endsWith('/sw.js')) {
      return;
    } else if (/\/(assets|icons)\//.test(url.pathname)) {
      event.respondWith(cacheFirst(req, CACHE)); // nomes com hash ou que não mudam: cache primeiro
    } else {
      event.respondWith(networkFirst(req, null, 4000)); // app.js, app.css, manifest...: rede primeiro
    }
    return;
  }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(req, FONTS));
  }
  // Tudo o resto (APIs ao vivo, emissoras, mapas) vai diretamente para a rede.
});
