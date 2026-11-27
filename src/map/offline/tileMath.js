// Conversões entre coordenadas e mosaicos (Web Mercator, esquema XYZ do OpenStreetMap)
export const lon2x = (lon, z) => Math.floor(((lon + 180) / 360) * 2 ** z);
export const lat2y = (lat, z) => { const r = (lat * Math.PI) / 180; return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z); };
export const x2lon = (x, z) => (x / 2 ** z) * 360 - 180;
export const y2lat = (y, z) => { const n = Math.PI - (2 * Math.PI * y) / 2 ** z; return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))); };
// bbox = { s, w, n, e } (graus)
export function tileRange(bbox, z) {
  return { z, x0: lon2x(bbox.w, z), x1: lon2x(bbox.e, z), y0: lat2y(bbox.n, z), y1: lat2y(bbox.s, z) };
}
export function* tilesIn(bbox, minZ, maxZ) {
  for (let z = minZ; z <= maxZ; z++) {
    const r = tileRange(bbox, z);
    for (let x = r.x0; x <= r.x1; x++) for (let y = r.y0; y <= r.y1; y++) yield { z, x, y };
  }
}
export function countTiles(bbox, minZ, maxZ) {
  let n = 0;
  for (let z = minZ; z <= maxZ; z++) { const r = tileRange(bbox, z); n += (r.x1 - r.x0 + 1) * (r.y1 - r.y0 + 1); }
  return n;
}
// área aproximada da bbox em km²
export function bboxKm2(b) {
  const h = (b.n - b.s) * 111.32; const w = (b.e - b.w) * 111.32 * Math.cos((((b.n + b.s) / 2) * Math.PI) / 180);
  return Math.abs(h * w);
}
export const inBbox = (b, lat, lng) => lat >= b.s && lat <= b.n && lng >= b.w && lng <= b.e;
// distância em metros (haversine)
export function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000; const r = Math.PI / 180;
  const dLat = (lat2 - lat1) * r; const dLng = (lng2 - lng1) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
