// Base de dados local dos mapas offline (IndexedDB "steeldeck_maps"):
//   tiles  -> chave "layer/z/x/y"  · valor { blob, area }          (mosaicos raster guardados)
//   areas  -> chave id             · valor { id, name, bbox, layer, minZoom, maxZoom, tiles, bytes, dem, graph, created }
//   dem    -> chave "z/x/y"        · valor Blob PNG (Terrarium)    (relevo para altitude e desnível)
//   graphs -> chave id da área     · valor { lat, lng, off, to, w, n } (malha de caminhos para rotas offline)
//   packs  -> chave "pack"         · valor { blob, name, header, size } (pacote PMTiles importado, ex.: Portugal)
const DB = 'steeldeck_maps';
const STORES = ['tiles', 'areas', 'dem', 'graphs', 'packs'];
let dbp = null;
export function openMaps() {
  if (!dbp) {
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => { for (const s of STORES) if (!req.result.objectStoreNames.contains(s)) req.result.createObjectStore(s); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => { dbp = null; reject(req.error); };
    });
  }
  return dbp;
}
const wrap = (req) => new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
export async function get(store, key) { const db = await openMaps(); return wrap(db.transaction(store).objectStore(store).get(key)); }
export async function put(store, key, value) { const db = await openMaps(); return wrap(db.transaction(store, 'readwrite').objectStore(store).put(value, key)); }
export async function del(store, key) { const db = await openMaps(); return wrap(db.transaction(store, 'readwrite').objectStore(store).delete(key)); }
export async function getAll(store) { const db = await openMaps(); return wrap(db.transaction(store).objectStore(store).getAll()); }
export async function count(store) { const db = await openMaps(); return wrap(db.transaction(store).objectStore(store).count()); }
// apaga todas as chaves de um store que satisfazem test(key, value)
export async function deleteWhere(store, test) {
  const db = await openMaps();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, 'readwrite'); const st = tx.objectStore(store); let n = 0;
    st.openCursor().onsuccess = (e) => { const c = e.target.result; if (!c) return; if (test(c.key, c.value)) { c.delete(); n++; } c.continue(); };
    tx.oncomplete = () => res(n); tx.onerror = () => rej(tx.error);
  });
}
