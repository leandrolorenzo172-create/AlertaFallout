// Nomes de ruas e pesquisa de moradas com o Nominatim (OpenStreetMap).
// Regras do serviço gratuito: no máximo 1 pedido por segundo e sem pesquisa a cada tecla (só ao submeter).
// Respostas guardadas em cache (memória + localStorage) para não repetir pedidos nem gastar rede.
const NOMINATIM = 'https://nominatim.openstreetmap.org';
const CACHE_KEY = 'sd_geo_cache';
const MAX_CACHE = 300;

let cache = (() => { try { return new Map(JSON.parse(localStorage.getItem(CACHE_KEY) || '[]')); } catch { return new Map(); } })();
const remember = (k, v) => {
  cache.set(k, v);
  if (cache.size > MAX_CACHE) cache = new Map([...cache].slice(-MAX_CACHE));
  try { localStorage.setItem(CACHE_KEY, JSON.stringify([...cache])); } catch { /* sem espaço: fica só em memória */ }
};

// fila: um pedido de cada vez, com 1,1 s entre pedidos
let last = 0; let chain = Promise.resolve();
function queued(url) {
  const run = async () => {
    const wait = Math.max(0, last + 1100 - Date.now());
    if (wait) await new Promise((r) => setTimeout(r, wait));
    last = Date.now();
    const r = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  };
  const p = chain.then(run, run);
  chain = p.catch(() => {});
  return p;
}

const online = () => navigator.onLine !== false;

// Texto curto de uma morada do Nominatim: "Rua do Souto 10" ou o nome do sítio
function shortName(a = {}, fallback = '') {
  const road = a.road || a.pedestrian || a.footway || a.path || a.cycleway || a.square || a.residential;
  const place = a.amenity || a.shop || a.tourism || a.building || a.leisure;
  if (road) return `${road}${a.house_number ? ` ${a.house_number}` : ''}`;
  return place || fallback.split(',')[0] || '';
}

// Nome da rua num ponto (null sem rede ou sem resultado). Cache por ~11 m.
export async function reverseName(lat, lng) {
  const key = `r:${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (cache.has(key)) return cache.get(key);
  if (!online()) return null;
  try {
    const j = await queued(`${NOMINATIM}/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=pt`);
    const name = shortName(j.address, j.display_name) || null;
    if (name) remember(key, name);
    return name;
  } catch { return null; }
}

// Só o nome da rua mais próxima (sem número de porta). Usado para os troços sem nome (passeios, caminhos).
export async function streetName(lat, lng) {
  const key = `st:${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (cache.has(key)) return cache.get(key);
  if (!online()) return null;
  try {
    const j = await queued(`${NOMINATIM}/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=17&addressdetails=1&accept-language=pt`);
    const a = j.address || {};
    const name = a.road || a.pedestrian || a.footway || a.path || a.square || null;
    if (name) remember(key, name);
    return name;
  } catch { return null; }
}

// Pesquisa de moradas/locais em Portugal, com preferência pela zona visível do mapa
// -> [{ label, sub, lat, lng }]
export async function searchPlaces(q, view) {
  const text = q.trim();
  if (text.length < 3 || !online()) return [];
  const key = `s:${text.toLowerCase()}`;
  if (cache.has(key)) return cache.get(key);
  const vb = view ? `&viewbox=${view.w},${view.n},${view.e},${view.s}` : '';
  try {
    const j = await queued(`${NOMINATIM}/search?format=jsonv2&q=${encodeURIComponent(text)}&countrycodes=pt&limit=6&addressdetails=1&accept-language=pt${vb}`);
    const list = (Array.isArray(j) ? j : []).map((x) => ({
      label: shortName(x.address, x.display_name) || x.name || x.display_name,
      sub: [x.address?.suburb || x.address?.village, x.address?.city || x.address?.town || x.address?.municipality].filter(Boolean).join(', '),
      lat: Number(x.lat), lng: Number(x.lon),
    }));
    remember(key, list);
    return list;
  } catch { return []; }
}

// Lista de ruas -> sequência sem repetições seguidas: [{ name, m, at? }] (at = ponto do troço, para dar nome aos sem nome)
// keepUnnamed: não junta troços sem nome seguidos (cada um vai ter o seu nome perguntado)
export function compressStreets(parts, { keepUnnamed = false } = {}) {
  const out = [];
  for (const { name, m, at } of parts) {
    const n = (name || '').trim();
    const prev = out[out.length - 1];
    if (prev && prev.name === n && (n || !keepUnnamed)) { prev.m += m; if (!prev.at && at) prev.at = at; }
    else if (m > 0 || n) out.push({ name: n, m, ...(at ? { at } : {}) });
  }
  // troços sem nome muito curtos (passadeiras, ligações) não interessam
  return keepUnnamed ? out : out.filter((s, i) => s.name || s.m >= 40 || i === 0 || i === out.length - 1);
}

// Dá nome aos troços sem nome (até `max` pedidos), perguntando a rua mais próxima a meio de cada troço.
// Devolve a lista nova (juntando troços seguidos que fiquem com o mesmo nome).
export async function nameUnnamed(streets, max = 8) {
  const todo = streets.filter((s) => !s.name && s.at && s.m >= 60).sort((a, b) => b.m - a.m).slice(0, max);
  if (!todo.length) return compressStreets(streets);
  const names = new Map();
  for (const s of todo) names.set(s, await streetName(s.at[0], s.at[1]));
  return compressStreets(streets.map((s) => ({ ...s, name: s.name || names.get(s) || '' })));
}
