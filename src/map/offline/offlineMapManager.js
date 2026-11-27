// Mapas offline: guardar áreas (mosaicos + relevo + malha de caminhos), pacote PMTiles de Portugal e gestão do espaço.
// Tudo fica no IndexedDB do aparelho; depois do download a app não precisa de rede para mostrar o mapa nem calcular rotas.
import { get, put, del, getAll, deleteWhere } from './mapsDb';
import { tilesIn, countTiles, bboxKm2 } from './tileMath';
import { PMTilesReader } from './pmtiles';
import { buildGraphForArea } from './offlineRouting';
import { saveDemForArea } from './elevation';
import { t } from '@/i18n';

// Camadas que se podem guardar (o satélite da Esri não permite guardar mosaicos)
export const OFFLINE_LAYERS = {
  road: { label: 'Rodoviário (OpenStreetMap)', url: (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`, kb: 22 },
  terrain: { label: 'Terreno (OpenTopoMap)', url: (z, x, y) => `https://${'abc'[(x + y) % 3]}.tile.opentopomap.org/${z}/${x}/${y}.png`, kb: 38 },
};
// Zonas preparadas (bbox s, w, n, e)
export const PRESET_AREAS = [
  { id: 'braga', name: 'Braga (cidade)', bbox: { s: 41.515, w: -8.475, n: 41.585, e: -8.36 }, maxZoom: 16 },
  { id: 'geres', name: 'Gerês (Caldas e Serra)', bbox: { s: 41.68, w: -8.24, n: 41.82, e: -8.06 }, maxZoom: 15 },
  { id: 'peneda', name: 'Peneda-Gerês (norte)', bbox: { s: 41.84, w: -8.42, n: 42.0, e: -8.18 }, maxZoom: 14 },
];
// Limite por área: os servidores gratuitos de mosaicos proíbem descargas em massa. Áreas maiores -> usar o pacote PMTiles.
export const MAX_TILES = 4000;
export const MAX_GRAPH_KM2 = 900;

export function estimateArea(bbox, minZoom, maxZoom, layer = 'road') {
  const tiles = countTiles(bbox, minZoom, maxZoom);
  const km2 = bboxKm2(bbox);
  const mapMB = (tiles * (OFFLINE_LAYERS[layer]?.kb || 25)) / 1024;
  const demMB = (countTiles(bbox, 12, 12) * 90) / 1024;
  const graphMB = km2 <= MAX_GRAPH_KM2 ? Math.min(60, km2 * 0.08) : 0;
  return { tiles, km2, mapMB, demMB, graphMB, totalMB: mapMB + demMB + graphMB, tooBig: tiles > MAX_TILES, graphOk: km2 <= MAX_GRAPH_KM2 };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function fetchBlob(url, signal, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { signal, mode: 'cors' });
      if (r.ok) return await r.blob();
      if (r.status === 404) return null;
    } catch (e) { if (signal?.aborted) throw e; }
    await sleep(500 * (i + 1));
  }
  return null;
}

// Guarda uma área. onProgress({ phase, done, total, bytes, msg }). signal: AbortController.signal (cancelar).
export async function saveArea({ name, bbox, layer = 'road', minZoom = 10, maxZoom = 16, dem = true, graph = true }, onProgress = () => {}, signal) {
  const est = estimateArea(bbox, minZoom, maxZoom, layer);
  if (est.tooBig) throw new Error(t('Área demasiado grande: {n} mosaicos (máximo {m}). Aproxima o mapa ou baixa o zoom máximo.', { n: est.tiles, m: MAX_TILES }));
  const id = `${layer}-${Date.now().toString(36)}`;
  const L = OFFLINE_LAYERS[layer];
  const area = { id, name, bbox, layer, minZoom, maxZoom, tiles: 0, bytes: 0, dem: false, graph: false, created: Date.now(), done: false, warnings: [] };
  await put('areas', id, area);
  // 1) mosaicos do mapa (2 pedidos de cada vez, para respeitar os servidores gratuitos)
  const list = [...tilesIn(bbox, minZoom, maxZoom)];
  let done = 0; let bytes = 0; let i = 0;
  const worker = async () => {
    while (i < list.length) {
      if (signal?.aborted) throw new DOMException('Cancelado', 'AbortError');
      const t = list[i++]; const key = `${layer}/${t.z}/${t.x}/${t.y}`;
      const existing = await get('tiles', key);
      if (!existing) {
        const blob = await fetchBlob(L.url(t.z, t.x, t.y), signal);
        if (blob) { await put('tiles', key, { blob, area: id }); bytes += blob.size; }
      }
      done++;
      onProgress({ phase: 'mapa', done, total: list.length, bytes, msg: t('Mapa: {a}/{b} mosaicos', { a: done, b: list.length }) });
    }
  };
  await Promise.all([worker(), worker()]);
  area.tiles = done; area.bytes = bytes; await put('areas', id, area);
  // 2) relevo (altitude, desnível D+/D−)
  if (dem) {
    try { const r = await saveDemForArea(bbox, (p) => onProgress({ phase: 'relevo', ...p }), signal); area.dem = true; area.bytes += r.bytes; }
    catch (e) { if (signal?.aborted) throw e; area.warnings.push('relevo'); onProgress({ phase: 'relevo', msg: t('Relevo não descarregado ({e}).', { e: e.message }) }); }
  }
  // 3) malha de caminhos e estradas para rotas offline
  if (graph && est.graphOk) {
    try { const g = await buildGraphForArea(id, bbox, (p) => onProgress({ phase: 'rotas', ...p }), signal); area.graph = true; area.bytes += g.bytes; area.graphNodes = g.nodes; }
    catch (e) { if (signal?.aborted) throw e; area.warnings.push('rotas'); onProgress({ phase: 'rotas', msg: t('Malha de rotas não descarregada ({e}).', { e: e.message }) }); }
  }
  area.done = true; await put('areas', id, area);
  return area;
}

export const listAreas = () => getAll('areas').then((a) => a.sort((x, y) => y.created - x.created));
export async function deleteArea(id) {
  await deleteWhere('tiles', (_k, v) => v && v.area === id);
  await del('graphs', id);
  await del('areas', id);
}

// ---------- Pacote PMTiles (ex.: Portugal inteiro) importado de um ficheiro local ----------
let packReader = null; let packChecked = false;
export async function getPack() {
  if (!packChecked) {
    packChecked = true;
    const p = await get('packs', 'pack').catch(() => null);
    if (p?.blob) { packReader = new PMTilesReader(p.blob); try { await packReader.init(); } catch { packReader = null; } }
  }
  return packReader;
}
export async function packInfo() { const p = await get('packs', 'pack').catch(() => null); return p ? { name: p.name, size: p.size, header: p.header } : null; }
export async function importPack(file) {
  const reader = new PMTilesReader(file);
  const header = await reader.init(); // valida antes de guardar
  if (header.tileType === 'mvt') throw new Error(t('Este PMTiles é vetorial (MVT). A app lê pacotes raster (PNG/JPEG/WebP).'));
  await put('packs', 'pack', { blob: file, name: file.name, size: file.size, header });
  packReader = new PMTilesReader(file); await packReader.init(); packChecked = true;
  return header;
}
export async function deletePack() { await del('packs', 'pack'); packReader = null; packChecked = true; }

// Mosaico local: 1.º o guardado para esta camada, 2.º o pacote PMTiles. null = não existe offline.
export async function getLocalTile(layer, z, x, y) {
  const t = await get('tiles', `${layer}/${z}/${x}/${y}`).catch(() => null);
  if (t?.blob) return t.blob;
  const pack = await getPack();
  if (pack) { try { return await pack.getTile(z, x, y); } catch { return null; } }
  return null;
}

// Espaço ocupado
export async function storageReport() {
  const areas = await listAreas();
  const pack = await packInfo();
  const est = navigator.storage?.estimate ? await navigator.storage.estimate().catch(() => null) : null;
  const persisted = navigator.storage?.persisted ? await navigator.storage.persisted().catch(() => false) : false;
  return { areas, pack, mapsBytes: areas.reduce((s, a) => s + (a.bytes || 0), 0) + (pack?.size || 0), usage: est?.usage || 0, quota: est?.quota || 0, persisted };
}
// Pede ao browser para não apagar estes dados quando o espaço aperta
export const requestPersist = () => (navigator.storage?.persist ? navigator.storage.persist().catch(() => false) : Promise.resolve(false));
