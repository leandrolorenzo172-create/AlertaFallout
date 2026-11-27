// Relevo offline: mosaicos de elevação "Terrarium" (dados abertos SRTM/ETOPO na AWS, gratuitos, sem chave).
// Cada píxel codifica a altitude: h = R×256 + G + B/256 − 32768 (metros). Guardados em IndexedDB (store "dem").
import { get, put } from './mapsDb';
import { tilesIn } from './tileMath';
import { t } from '@/i18n';

export const DEM_ZOOM = 12; // ≈ 30 m por píxel em Portugal: bom para desnível de caminhadas
const DEM_URL = (z, x, y) => `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
const decoded = new Map(); // "z/x/y" -> Float32Array(256*256) (cache em memória)

export async function saveDemForArea(bbox, onProgress = () => {}, signal) {
  const list = [...tilesIn(bbox, DEM_ZOOM, DEM_ZOOM)];
  let bytes = 0; let done = 0;
  for (const t of list) {
    if (signal?.aborted) throw new DOMException('Cancelado', 'AbortError');
    const key = `${t.z}/${t.x}/${t.y}`;
    if (!(await get('dem', key))) {
      const r = await fetch(DEM_URL(t.z, t.x, t.y), { signal });
      if (r.ok) { const b = await r.blob(); await put('dem', key, b); bytes += b.size; }
    }
    done++; onProgress({ done, total: list.length, bytes, msg: t('Relevo: {a}/{b}', { a: done, b: list.length }) });
  }
  return { bytes, tiles: list.length };
}

async function decode(blob) {
  const bmp = await createImageBitmap(blob);
  const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(bmp.width, bmp.height) : Object.assign(document.createElement('canvas'), { width: bmp.width, height: bmp.height });
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bmp, 0, 0);
  const px = ctx.getImageData(0, 0, bmp.width, bmp.height).data;
  const out = new Float32Array(bmp.width * bmp.height);
  for (let i = 0, j = 0; j < out.length; i += 4, j++) out[j] = px[i] * 256 + px[i + 1] + px[i + 2] / 256 - 32768;
  return out;
}
async function demTile(z, x, y, online) {
  const key = `${z}/${x}/${y}`;
  if (decoded.has(key)) return decoded.get(key);
  let blob = await get('dem', key).catch(() => null);
  if (!blob && online && navigator.onLine !== false) {
    try { const r = await fetch(DEM_URL(z, x, y)); if (r.ok) { blob = await r.blob(); put('dem', key, blob).catch(() => {}); } } catch { /* sem rede */ }
  }
  if (!blob) return null;
  const arr = await decode(blob);
  decoded.set(key, arr); if (decoded.size > 48) decoded.delete(decoded.keys().next().value);
  return arr;
}
// Altitude (m) num ponto; null se não houver relevo guardado (e online=false ou sem rede)
export async function getElevation(lat, lng, { online = true } = {}) {
  const z = DEM_ZOOM; const n = 2 ** z;
  const fx = ((lng + 180) / 360) * n;
  const r = (lat * Math.PI) / 180;
  const fy = ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n;
  const x = Math.floor(fx); const y = Math.floor(fy);
  const t = await demTile(z, x, y, online);
  if (!t) return null;
  const px = Math.min(255, Math.max(0, Math.floor((fx - x) * 256))); const py = Math.min(255, Math.max(0, Math.floor((fy - y) * 256)));
  return t[py * 256 + px];
}

// Perfil de um percurso [[lat,lng],…]: amostra a cada ~25 m. Devolve { up, down, max, min, start, end, samples, segments }
export async function elevationProfile(path, { online = true, step = 25 } = {}) {
  const pts = []; // pontos amostrados com a distância acumulada
  const R = 6371000; const rad = Math.PI / 180;
  const dist = (a, b) => { const dLat = (b[0] - a[0]) * rad; const dLng = (b[1] - a[1]) * rad; const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLng / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
  let acc = 0; pts.push({ p: path[0], d: 0 });
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]; const b = path[i]; const d = dist(a, b);
    const k = Math.floor(d / step);
    for (let j = 1; j <= k; j++) pts.push({ p: [a[0] + ((b[0] - a[0]) * j * step) / d, a[1] + ((b[1] - a[1]) * j * step) / d], d: acc + j * step });
    acc += d; pts.push({ p: b, d: acc });
  }
  const samples = [];
  for (const s of pts.length > 1500 ? pts.filter((_, i) => i % Math.ceil(pts.length / 1500) === 0) : pts) {
    const h = await getElevation(s.p[0], s.p[1], { online });
    if (h != null) samples.push({ d: s.d, h });
  }
  if (samples.length < 2) return null;
  // suaviza o ruído do relevo (média móvel de 5) antes de somar subidas e descidas
  const sm = samples.map((s, i) => { const w = samples.slice(Math.max(0, i - 2), i + 3); return { d: s.d, h: w.reduce((t, x) => t + x.h, 0) / w.length }; });
  let up = 0; let down = 0; const segments = [];
  for (let i = 1; i < sm.length; i++) {
    const dh = sm[i].h - sm[i - 1].h; const dd = sm[i].d - sm[i - 1].d;
    if (dh > 0) up += dh; else down -= dh;
    segments.push({ dd, dh });
  }
  const hs = sm.map((s) => s.h);
  return { up, down, max: Math.max(...hs), min: Math.min(...hs), start: hs[0], end: hs[hs.length - 1], samples: sm, segments };
}

// Tempo a pé — regra de Naismith (5 km/h + 1 h por cada 600 m de subida) com as correções de Langmuir na descida:
// descidas suaves (5–12°) poupam 10 min por 300 m; descidas íngremes (>12°) somam 10 min por 300 m.
export function naismithMinutes(distM, profile) {
  let min = (distM / 1000 / 5) * 60;
  if (!profile) return Math.max(1, Math.round(min));
  min += (profile.up / 600) * 60;
  let gentle = 0; let steep = 0;
  for (const s of profile.segments) {
    if (s.dh >= 0 || s.dd <= 0) continue;
    const deg = (Math.atan(-s.dh / s.dd) * 180) / Math.PI;
    if (deg >= 5 && deg <= 12) gentle += -s.dh; else if (deg > 12) steep += -s.dh;
  }
  min += (-gentle / 300) * 10 + (steep / 300) * 10;
  return Math.max(1, Math.round(min));
}
