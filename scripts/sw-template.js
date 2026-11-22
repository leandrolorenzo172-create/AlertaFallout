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

// Primeiro o essencial para a app abrir (rápido, para a instalação não falhar se a rede cair logo a seguir);
// depois o resto (leitor de PDF, hls.js, dados), sem bloquear a instalação.
const CORE = /^(\.\/|index\.html|app\.js|app\.css|manifest\.webmanifest|icons\/.*)$/;
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const c = await caches.open(CACHE);
    const req = (p) => new Request(BASE + p, { cache: 'reload' });
    await c.addAll(PRECACHE.filter((p) => CORE.test(p)).map(req));
    await self.skipWaiting();
    Promise.all(PRECACHE.filter((p) => !CORE.test(p)).map((p) => c.add(req(p)).catch(() => {}))); // o resto em segundo plano
  })());
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
    // ignoreVary: a cópia guardada na instalação não traz os mesmos cabeçalhos que o pedido da página (ex.: Origin)
    const hit = await cache.match(key || req, { ignoreSearch: true, ignoreVary: true });
    if (hit) return hit;
    throw e;
  }
}
async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req, { ignoreVary: true });
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

// ---------- Avisos de greve com a app fechada (Periodic Background Sync, Chrome/Android com a app instalada) ----------
// Mesma regra de src/notify/strikeAlerts.js: avisa ANTECEDENCIA_DIAS antes e no próprio dia. Estado partilhado na Cache Storage.
const ANTECEDENCIA_DIAS = 2;
const SECTOR_TXT = { 'Função pública': 'Greve da Função Pública', Saúde: 'Greve na Saúde', Educação: 'Greve nas escolas', Transportes: 'Greve nos Transportes',
  'Greve geral': 'Greve geral', Justiça: 'Greve na Justiça', Segurança: 'Greve nas forças de segurança', Autarquias: 'Greve nas autarquias' };
const dmy = (d) => { const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y.slice(2)}`; };
const ymdLocal = (t = new Date()) => `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
async function checkStrikes() {
  const c = await caches.open('pipboy-avisos'); const key = BASE + '__avisos-greve.json';
  const st = await c.match(key).then((r) => (r ? r.json() : { enabled: true, shown: {} })).catch(() => ({ enabled: true, shown: {} }));
  if (!st.enabled) return;
  const news = await fetch(BASE + 'data/news.json', { cache: 'no-cache' }).then((r) => r.json());
  const today = ymdLocal();
  for (const s of news?.strikes?.upcoming || []) {
    if (!s.days?.length || s.sector === 'Internacional') continue;
    const first = s.days[0], last = s.days[s.days.length - 1];
    const until = Math.round((new Date(first + 'T12:00') - new Date(today + 'T12:00')) / 86400000);
    const what = SECTOR_TXT[s.sector] || 'Greve';
    let k = null, title = null;
    if (today >= first && today <= last) { k = `${s.id}|dia|${today}`; title = `ALERTA — HOJE: ${what} (${dmy(today)})`; }
    else if (until > 0 && until <= ANTECEDENCIA_DIAS) { k = `${s.id}|pre`; title = `ALERTA — ${what} ${s.days.length > 1 ? `de ${dmy(first)} a ${dmy(last)}` : `dia ${dmy(first)}`}`; }
    if (!k || st.shown[k]) continue;
    await self.registration.showNotification(title, { body: s.title, tag: 'greve-' + k, icon: BASE + 'icons/icon-192.png', badge: BASE + 'icons/icon-192.png', data: { url: BASE + '#/greves' } });
    st.shown[k] = Date.now();
  }
  await c.put(key, new Response(JSON.stringify(st), { headers: { 'content-type': 'application/json' } }));
}
self.addEventListener('periodicsync', (event) => { if (event.tag === 'avisos-greve') event.waitUntil(checkStrikes().catch(() => {})); });
// Notificações push enviadas pelo GitHub Actions (scripts/send-push.mjs)
// Cada notificação traz a categoria (cat); só aparece se o interruptor dessa categoria estiver ligado na app.
const PREF_KEY = { greves: 'greves_enabled', meteorologia: 'meteorologia_enabled', catastrofes: 'catastrofes_enabled', guerra: 'guerra_enabled', tensao_global: 'tensao_global_enabled', pizza_index: 'pizza_index_enabled' };
const PREF_DEFAULTS = { pizza_index_enabled: false }; // as outras vêm ligadas por omissão
self.addEventListener('push', (event) => {
  let d = {}; try { d = event.data ? event.data.json() : {}; } catch { d = { title: 'Pip-Boy Terminal', body: event.data?.text() }; }
  event.waitUntil((async () => {
    const st = await caches.open('pipboy-avisos').then((c) => c.match(BASE + '__avisos-greve.json')).then((r) => (r ? r.json() : {})).catch(() => ({}));
    const key = PREF_KEY[d.cat];
    const on = key ? (st.prefs?.[key] ?? PREF_DEFAULTS[key] ?? true) : true;
    if (!on) return; // categoria desligada nas Definições
    await self.registration.showNotification(d.title || 'ALERTA', {
      // icon: miniatura da personagem à esquerda (muda com o tempo); badge: ícone pequeno da barra de estado
      // a miniatura vem na cor escolhida na app: ./icons/tempo/rain.png -> ./icons/tempo/<cor>/rain.png
      body: d.body || '', tag: d.tag || d.cat || 'alerta', badge: BASE + 'icons/icon-192.png',
      icon: new URL((d.icon || './icons/tempo/base.png').replace('/tempo/', `/tempo/${/^(green|white|amber|blue|red)$/.test(st.theme) ? st.theme : 'green'}/`), BASE).href,
      data: { url: new URL(d.url || './#/dashboard', BASE).href },
    });
  })());
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || './#/greves', BASE).href;
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const w = wins.find((x) => x.url.startsWith(BASE));
    if (w) { await w.focus(); return w.navigate(url).catch(() => {}); }
    return self.clients.openWindow(url);
  })());
});
