// Rotas a pé 100% offline: malha de caminhos/estradas do OpenStreetMap (Overpass) guardada por área
// e caminho mais curto com A* (heurística = distância em linha reta). Sem servidor depois do download.
import { get, put, getAll } from './mapsDb';
import { inBbox, haversine } from './tileMath';
import { compressStreets } from '../geocode';
import { t } from '@/i18n';

// Servidores Overpass públicos e gratuitos (tenta por ordem)
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
// tudo o que se pode percorrer a pé (exclui autoestradas, vias rápidas e caminhos privados/proibidos a peões)
// vias com etiquetas (para o nome da rua) + nós só com coordenadas
const QUERY = (b) => `[out:json][timeout:120];way["highway"]["highway"!~"^(motorway|motorway_link|trunk|trunk_link|construction|proposed|raceway|bus_guideway)$"]["access"!~"^(private|no)$"]["foot"!~"^no$"](${b.s},${b.w},${b.n},${b.e})->.w;.w out body qt;node(w.w);out skel qt;`;

async function overpass(bbox, signal) {
  let lastErr = null;
  for (const url of OVERPASS) {
    // cada servidor tem 45 s; se não responder, passa ao seguinte (sem perder o "Cancelar" do utilizador)
    const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 45000);
    const onAbort = () => ctrl.abort(); signal?.addEventListener('abort', onAbort);
    try {
      const r = await fetch(url, { method: 'POST', body: new URLSearchParams({ data: QUERY(bbox) }), signal: ctrl.signal });
      if (r.ok) return await r.json();
      lastErr = new Error(`HTTP ${r.status}`);
    } catch (e) { if (signal?.aborted) throw e; lastErr = e; }
    finally { clearTimeout(timer); signal?.removeEventListener('abort', onAbort); }
  }
  throw lastErr || new Error('Overpass indisponível');
}

// Constrói a malha (grafo em formato CSR: compacto e rápido) e guarda-a na área
export async function buildGraphForArea(areaId, bbox, onProgress = () => {}, signal) {
  onProgress({ msg: t('Rotas: a descarregar caminhos e estradas…') });
  const data = await overpass(bbox, signal);
  onProgress({ msg: t('Rotas: a construir a malha…') });
  const nodeIdx = new Map(); const lat = []; const lng = [];
  for (const el of data.elements) if (el.type === 'node') { nodeIdx.set(el.id, lat.length); lat.push(el.lat); lng.push(el.lon); }
  const adj = Array.from({ length: lat.length }, () => []); // [vizinho, distância, índice do nome] …
  const names = []; const nameIdx = new Map();
  for (const el of data.elements) {
    if (el.type !== 'way' || !el.nodes) continue;
    const nm = el.tags?.name || el.tags?.ref || '';
    let ni = -1;
    if (nm) { if (!nameIdx.has(nm)) { nameIdx.set(nm, names.length); names.push(nm); } ni = nameIdx.get(nm); }
    for (let i = 1; i < el.nodes.length; i++) {
      const a = nodeIdx.get(el.nodes[i - 1]); const b = nodeIdx.get(el.nodes[i]);
      if (a == null || b == null || a === b) continue;
      const d = haversine(lat[a], lng[a], lat[b], lng[b]);
      adj[a].push(b, d, ni); adj[b].push(a, d, ni); // a pé, todas as vias nos dois sentidos
    }
  }
  const n = lat.length; const off = new Uint32Array(n + 1);
  for (let i = 0; i < n; i++) off[i + 1] = off[i] + adj[i].length / 3;
  const to = new Uint32Array(off[n]); const w = new Float32Array(off[n]); const nm = new Int32Array(off[n]);
  for (let i = 0; i < n; i++) for (let k = 0, j = off[i]; k < adj[i].length; k += 3, j++) { to[j] = adj[i][k]; w[j] = adj[i][k + 1]; nm[j] = adj[i][k + 2]; }
  const graph = { n, lat: Float64Array.from(lat), lng: Float64Array.from(lng), off, to, w, nm, names, bbox };
  await put('graphs', areaId, graph);
  graphCache.set(areaId, graph);
  const bytes = graph.lat.byteLength + graph.lng.byteLength + off.byteLength + to.byteLength + w.byteLength + nm.byteLength + names.join('').length * 2;
  onProgress({ msg: t('Rotas: {n} pontos de caminho guardados.', { n }) });
  return { nodes: n, bytes };
}

const graphCache = new Map();
async function graphFor(a, b) {
  const areas = (await getAll('areas')).filter((x) => x.graph && inBbox(x.bbox, a.lat, a.lng) && inBbox(x.bbox, b.lat, b.lng));
  for (const ar of areas) {
    if (!graphCache.has(ar.id)) { const g = await get('graphs', ar.id); if (g) graphCache.set(ar.id, g); }
    if (graphCache.has(ar.id)) return graphCache.get(ar.id);
  }
  return null;
}
// nó mais próximo (até maxM metros)
function nearest(g, lat, lng, maxM = 400) {
  let best = -1; let bd = Infinity; const kx = Math.cos((lat * Math.PI) / 180);
  for (let i = 0; i < g.n; i++) {
    const dy = g.lat[i] - lat; const dx = (g.lng[i] - lng) * kx; const d = dy * dy + dx * dx;
    if (d < bd) { bd = d; best = i; }
  }
  if (best < 0) return null;
  const m = haversine(lat, lng, g.lat[best], g.lng[best]);
  return m <= maxM ? { i: best, m } : null;
}

class Heap {
  constructor() { this.k = []; this.p = []; }
  get size() { return this.k.length; }
  push(k, p) { const K = this.k; const P = this.p; let i = K.length; K.push(k); P.push(p); while (i > 0) { const j = (i - 1) >> 1; if (P[j] <= P[i]) break; [K[i], K[j]] = [K[j], K[i]]; [P[i], P[j]] = [P[j], P[i]]; i = j; } }
  pop() { const K = this.k; const P = this.p; const top = K[0]; const lk = K.pop(); const lp = P.pop(); if (K.length) { K[0] = lk; P[0] = lp; let i = 0; for (;;) { const l = 2 * i + 1; const r = l + 1; let m = i; if (l < K.length && P[l] < P[m]) m = l; if (r < K.length && P[r] < P[m]) m = r; if (m === i) break; [K[i], K[m]] = [K[m], K[i]]; [P[i], P[m]] = [P[m], P[i]]; i = m; } } return top; }
}

// Rota a pé offline entre a e b ({lat,lng}). Devolve { path:[[lat,lng]…], meters, snapA, snapB } ou { error }
export async function routeOffline(a, b) {
  const g = await graphFor(a, b);
  if (!g) {
    const covered = (await getAll('areas')).some((x) => inBbox(x.bbox, a.lat, a.lng) && inBbox(x.bbox, b.lat, b.lng));
    return { error: covered ? 'nograph' : 'noarea' };
  }
  const s = nearest(g, a.lat, a.lng); const dst = nearest(g, b.lat, b.lng);
  if (!s || !dst) return { error: 'far' };
  const dist = new Float64Array(g.n).fill(Infinity); const prev = new Int32Array(g.n).fill(-1); const prevEdge = new Int32Array(g.n).fill(-1); const closed = new Uint8Array(g.n);
  const h = (i) => haversine(g.lat[i], g.lng[i], g.lat[dst.i], g.lng[dst.i]);
  const heap = new Heap(); dist[s.i] = 0; heap.push(s.i, h(s.i));
  while (heap.size) {
    const u = heap.pop();
    if (u === dst.i) break;
    if (closed[u]) continue; closed[u] = 1;
    for (let j = g.off[u]; j < g.off[u + 1]; j++) {
      const v = g.to[j]; if (closed[v]) continue;
      const nd = dist[u] + g.w[j];
      if (nd < dist[v]) { dist[v] = nd; prev[v] = u; prevEdge[v] = j; heap.push(v, nd + h(v)); }
    }
  }
  if (!Number.isFinite(dist[dst.i])) return { error: 'nopath' };
  const path = []; const parts = [];
  for (let i = dst.i; i !== -1; i = prev[i]) {
    path.push([g.lat[i], g.lng[i]]);
    const j = prevEdge[i]; // nome da rua do troço que chega a este nó (malhas antigas não têm nomes)
    if (j >= 0) parts.push({ name: g.nm && g.nm[j] >= 0 ? g.names[g.nm[j]] : '', m: g.w[j] });
  }
  path.reverse(); parts.reverse();
  return { path: [[a.lat, a.lng], ...path, [b.lat, b.lng]], meters: dist[dst.i] + s.m + dst.m, snapA: s.m, snapB: dst.m, streets: g.nm ? compressStreets(parts) : [] };
}
