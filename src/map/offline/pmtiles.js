// Leitor de PMTiles v3 (ficheiro único com mosaicos) a partir de um Blob local — sem bibliotecas nem servidor.
// Especificação: https://github.com/protomaps/PMTiles/blob/main/spec/v3/spec.md
// Suporta mosaicos raster (PNG, JPEG, WebP, AVIF). Diretórios com compressão gzip ou sem compressão.
import { gunzipSync } from 'fflate';
import { t } from '@/i18n';

const TILE_TYPES = { 1: 'mvt', 2: 'png', 3: 'jpeg', 4: 'webp', 5: 'avif' };
const MIME = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp', avif: 'image/avif' };

const u64 = (dv, o) => dv.getUint32(o, true) + dv.getUint32(o + 4, true) * 2 ** 32;
export function parseHeader(buf) {
  const dv = new DataView(buf);
  const magic = new TextDecoder().decode(new Uint8Array(buf, 0, 7));
  if (magic !== 'PMTiles') throw new Error(t('Não é um ficheiro PMTiles.'));
  const version = dv.getUint8(7);
  if (version !== 3) throw new Error(t('PMTiles versão {v} não suportada (só v3).', { v: version }));
  return {
    rootOffset: u64(dv, 8), rootLength: u64(dv, 16), metaOffset: u64(dv, 24), metaLength: u64(dv, 32),
    leafOffset: u64(dv, 40), leafLength: u64(dv, 48), dataOffset: u64(dv, 56), dataLength: u64(dv, 64),
    internalCompression: dv.getUint8(97), tileCompression: dv.getUint8(98), tileType: TILE_TYPES[dv.getUint8(99)] || 'desconhecido',
    minZoom: dv.getUint8(100), maxZoom: dv.getUint8(101),
    bbox: { w: dv.getInt32(102, true) / 1e7, s: dv.getInt32(106, true) / 1e7, e: dv.getInt32(110, true) / 1e7, n: dv.getInt32(114, true) / 1e7 },
  };
}

// z/x/y -> TileID (curva de Hilbert por nível)
export function zxyToTileId(z, x, y) {
  let acc = (4 ** z - 1) / 3; // mosaicos de todos os níveis anteriores
  const n = 2 ** z; let tx = x; let ty = y;
  for (let s = n / 2; s >= 1; s /= 2) {
    const rx = (tx & s) > 0 ? 1 : 0; const ry = (ty & s) > 0 ? 1 : 0;
    acc += s * s * ((3 * rx) ^ ry);
    if (ry === 0) { if (rx === 1) { tx = n - 1 - tx; ty = n - 1 - ty; } const t = tx; tx = ty; ty = t; }
  }
  return acc;
}

function readVarint(bytes, pos) {
  let v = 0; let shift = 0; let b;
  do { b = bytes[pos.i++]; v += (b & 0x7f) * 2 ** shift; shift += 7; } while (b & 0x80);
  return v;
}
function decompress(u8, kind) {
  if (kind === 1 || kind === 0) return u8;
  if (kind === 2) return gunzipSync(u8);
  throw new Error(t('Compressão do PMTiles não suportada (só gzip ou nenhuma).'));
}
function parseDirectory(u8) {
  const pos = { i: 0 }; const n = readVarint(u8, pos);
  const entries = new Array(n); let last = 0;
  for (let k = 0; k < n; k++) { last += readVarint(u8, pos); entries[k] = { tileId: last }; }
  for (let k = 0; k < n; k++) entries[k].runLength = readVarint(u8, pos);
  for (let k = 0; k < n; k++) entries[k].length = readVarint(u8, pos);
  for (let k = 0; k < n; k++) {
    const v = readVarint(u8, pos);
    entries[k].offset = v === 0 && k > 0 ? entries[k - 1].offset + entries[k - 1].length : v - 1;
  }
  return entries;
}
function findEntry(entries, id) {
  let lo = 0; let hi = entries.length - 1;
  while (lo <= hi) {
    const m = (lo + hi) >> 1; const e = entries[m];
    if (id < e.tileId) hi = m - 1; else if (id > e.tileId) lo = m + 1; else return e;
  }
  if (hi >= 0) { const e = entries[hi]; if (e.runLength === 0) return e; if (id - e.tileId < e.runLength) return e; } // diretório-folha ou repetição
  return null;
}

export class PMTilesReader {
  constructor(blob) { this.blob = blob; this.header = null; this.dirCache = new Map(); }
  async read(offset, length) { return new Uint8Array(await this.blob.slice(offset, offset + length).arrayBuffer()); }
  async init() {
    if (!this.header) this.header = parseHeader((await this.read(0, 127)).buffer);
    return this.header;
  }
  async dir(offset, length) {
    const k = `${offset}:${length}`;
    if (!this.dirCache.has(k)) { this.dirCache.set(k, parseDirectory(decompress(await this.read(offset, length), this.header.internalCompression))); if (this.dirCache.size > 64) this.dirCache.delete(this.dirCache.keys().next().value); }
    return this.dirCache.get(k);
  }
  // devolve um Blob com a imagem do mosaico, ou null se não existir
  async getTile(z, x, y) {
    const h = await this.init();
    if (z < h.minZoom || z > h.maxZoom || h.tileType === 'mvt') return null;
    const id = zxyToTileId(z, x, y);
    let offset = h.rootOffset; let length = h.rootLength;
    for (let depth = 0; depth < 4; depth++) {
      const e = findEntry(await this.dir(offset, length), id);
      if (!e) return null;
      if (e.runLength > 0) {
        let data = await this.read(h.dataOffset + e.offset, e.length);
        if (h.tileCompression === 2) data = gunzipSync(data);
        return new Blob([data], { type: MIME[h.tileType] || 'image/png' });
      }
      offset = h.leafOffset + e.offset; length = e.length; // diretório-folha
    }
    return null;
  }
}
