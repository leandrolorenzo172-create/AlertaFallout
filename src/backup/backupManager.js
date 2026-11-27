// Cópia de segurança completa da app num único ficheiro .zip (fflate, já incluído na app — sem servidores):
//   manifest.json          -> versão, data, ID do utilizador, lista de bases de dados e esquema de cada store
//   localStorage.json      -> todas as chaves (definições, pinos, conversas, ativos, filtros…)
//   idb/<base>/<store>.json -> registos de cada IndexedDB (documentos, músicas, mapas offline opcionais)
//   blobs/<n>              -> ficheiros binários (PDF, imagens, áudio, mosaicos…) referenciados pelos registos
// Restauro: valida o ficheiro e pergunta se SUBSTITUI os dados atuais ou FUNDE com os existentes.
import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import { t } from '@/i18n';

export const BACKUP_FORMAT = 'steeldeck-backup';
export const BACKUP_VERSION = 1;
const APP_DBS = ['pipboy_kb', 'pipboy_music', 'steeldeck_maps']; // bases conhecidas (o browser pode listar mais)
const MAPS_DB = 'steeldeck_maps';
const USER_KEY = 'sd_user_id';

// ---------- ID único do utilizador (UUID v4 persistente, editável) ----------
const uuid4 = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 15); return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16); }));
export function getUserId() {
  let id = null; try { id = localStorage.getItem(USER_KEY); } catch { /* sem armazenamento */ }
  if (!id) { id = uuid4(); try { localStorage.setItem(USER_KEY, id); } catch { /* */ } }
  return id;
}
// o utilizador pode personalizar (letras, números, - e _; 3 a 40 caracteres)
export function setUserId(v) {
  const id = String(v || '').trim().replace(/\s+/g, '-');
  if (!/^[A-Za-z0-9_-]{3,40}$/.test(id)) throw new Error(t('O ID só pode ter letras, números, - e _ (3 a 40 caracteres).'));
  localStorage.setItem(USER_KEY, id); return id;
}
const safeId = (id) => String(id).replace(/[^A-Za-z0-9_-]/g, '');

// ---------- IndexedDB genérico ----------
const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
function openExisting(name) {
  return new Promise((res, rej) => {
    let created = false;
    const r = indexedDB.open(name);
    r.onupgradeneeded = () => { created = true; }; // não existia: não se cria nada aqui
    r.onsuccess = () => { const db = r.result; if (created) { db.close(); indexedDB.deleteDatabase(name); res(null); } else res(db); };
    r.onerror = () => rej(r.error);
  });
}
async function dbNames() {
  const names = new Set(APP_DBS);
  try { if (indexedDB.databases) for (const d of await indexedDB.databases()) if (d.name) names.add(d.name); } catch { /* browser sem a função */ }
  return [...names];
}

// Converte valores com Blobs / TypedArrays / Datas para JSON + ficheiros binários
function encodeValue(v, blobs) {
  if (v instanceof Blob) {
    const n = blobs.length; blobs.push(v);
    return { __blob__: n, type: v.type, name: v instanceof File ? v.name : undefined, lastModified: v instanceof File ? v.lastModified : undefined };
  }
  if (ArrayBuffer.isView(v) && !(v instanceof DataView)) { const n = blobs.length; blobs.push(new Blob([v])); return { __ta__: v.constructor.name, b: n }; }
  if (v instanceof ArrayBuffer) { const n = blobs.length; blobs.push(new Blob([v])); return { __ab__: n }; }
  if (v instanceof Date) return { __date__: v.toISOString() };
  if (Array.isArray(v)) return v.map((x) => encodeValue(x, blobs));
  if (v && typeof v === 'object') { const o = {}; for (const [k, x] of Object.entries(v)) o[k] = encodeValue(x, blobs); return o; }
  return v;
}
function decodeValue(v, getBin) {
  if (Array.isArray(v)) return v.map((x) => decodeValue(x, getBin));
  if (v && typeof v === 'object') {
    if ('__blob__' in v) { const u8 = getBin(v.__blob__); return v.name != null ? new File([u8], v.name, { type: v.type, lastModified: v.lastModified }) : new Blob([u8], { type: v.type }); }
    if ('__ta__' in v) { const u8 = getBin(v.b); const C = globalThis[v.__ta__] || Uint8Array; return new C(u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength)); }
    if ('__ab__' in v) { const u8 = getBin(v.__ab__); return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength); }
    if ('__date__' in v) return new Date(v.__date__);
    const o = {}; for (const [k, x] of Object.entries(v)) o[k] = decodeValue(x, getBin); return o;
  }
  return v;
}

async function dumpDb(name, blobs, onProgress) {
  const db = await openExisting(name);
  if (!db) return null;
  const schema = { name, version: db.version, stores: [] }; const data = {};
  for (const sn of db.objectStoreNames) {
    const tx = db.transaction(sn); const st = tx.objectStore(sn);
    schema.stores.push({ name: sn, keyPath: st.keyPath, autoIncrement: st.autoIncrement, indexes: [...st.indexNames].map((i) => { const ix = st.index(i); return { name: i, keyPath: ix.keyPath, unique: ix.unique, multiEntry: ix.multiEntry }; }) });
    const rows = [];
    await new Promise((res, rej) => {
      const c = st.openCursor();
      c.onsuccess = (e) => { const cur = e.target.result; if (!cur) { res(); return; } rows.push({ k: encodeValue(cur.key, blobs), v: encodeValue(cur.value, blobs) }); cur.continue(); };
      c.onerror = () => rej(c.error);
    });
    data[sn] = rows; onProgress?.(`${name}/${sn}: ${rows.length}`);
  }
  db.close();
  return { schema, data };
}

// ---------- EXPORTAR TUDO ----------
// opts.includeMaps: inclui os mapas offline (podem ser centenas de MB)
export async function createBackup({ includeMaps = false, onProgress } = {}) {
  const userId = getUserId();
  const blobs = []; const files = {};
  const ls = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); ls[k] = localStorage.getItem(k); }
  files['localStorage.json'] = strToU8(JSON.stringify(ls));
  const dbs = [];
  for (const name of await dbNames()) {
    if (name === MAPS_DB && !includeMaps) continue;
    onProgress?.(t('A copiar {n}…', { n: name }));
    const d = await dumpDb(name, blobs, onProgress).catch(() => null);
    if (!d) continue;
    dbs.push(d.schema);
    for (const [sn, rows] of Object.entries(d.data)) files[`idb/${name}/${sn}.json`] = strToU8(JSON.stringify(rows));
  }
  onProgress?.(t('A juntar {n} ficheiros…', { n: blobs.length }));
  for (let i = 0; i < blobs.length; i++) files[`blobs/${i}`] = [new Uint8Array(await blobs[i].arrayBuffer()), { level: 0 }]; // binários já vêm comprimidos
  const created = new Date();
  const manifest = {
    format: BACKUP_FORMAT, version: BACKUP_VERSION, app: 'SteelDeck', appVersion: (typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : document.querySelector('meta[name="sd-version"]')?.content) || 'web',
    userId, created: created.toISOString(), includeMaps, databases: dbs, blobs: blobs.length,
    counts: { localStorage: Object.keys(ls).length, records: dbs.reduce((s, d) => s + d.stores.reduce((acc, st) => acc + (JSON.parse(strFromU8(files[`idb/${d.name}/${st.name}.json`])).length), 0), 0) },
  };
  files['manifest.json'] = strToU8(JSON.stringify(manifest, null, 2));
  onProgress?.(t('A comprimir…'));
  const zip = zipSync(files, { level: 6 });
  const p2 = (n) => String(n).padStart(2, '0');
  const stamp = `${created.getFullYear()}-${p2(created.getMonth() + 1)}-${p2(created.getDate())}_${p2(created.getHours())}-${p2(created.getMinutes())}`;
  const name = `backup_${safeId(userId)}_${stamp}.zip`;
  return { file: new File([zip], name, { type: 'application/zip' }), manifest, summary: summarize(ls, manifest) };
}

// resumo legível (para o corpo do email)
function summarize(ls, manifest) {
  const count = (k) => { try { const v = JSON.parse(ls[k] || 'null'); return Array.isArray(v) ? v.filter(Boolean).length : 0; } catch { return 0; } };
  const lines = [
    `Backup SteelDeck — ID: ${manifest.userId}`,
    `Data: ${new Date(manifest.created).toLocaleString('pt-PT')}`,
    `Pinos no mapa: ${count('braga_custom_pins')}`,
    `Conversas com o Mr. Steel: ${count('pb_ai_convs_v1')}`,
    `Ativos (Economia): ${count('sd_watchlist')}`,
    `Registos em bases de dados (documentos, notas, músicas${manifest.includeMaps ? ', mapas' : ''}): ${manifest.counts.records}`,
    `Ficheiros incluídos: ${manifest.blobs}`,
  ];
  return lines.join('\n');
}

// ---------- GUARDAR: pasta escolhida (File System Access API) ou descarga ----------
export async function saveBackupFile(file) {
  const userId = safeId(getUserId());
  if (window.showDirectoryPicker && window.isSecureContext) {
    try {
      const root = await window.showDirectoryPicker({ id: 'steeldeck-backup', mode: 'readwrite' });
      const dir = await root.getDirectoryHandle(`Backup_Sobrevivencia_${userId}`, { create: true });
      const fh = await dir.getFileHandle(file.name, { create: true });
      const w = await fh.createWritable(); await w.write(file); await w.close();
      return { method: 'folder', path: `${root.name}/Backup_Sobrevivencia_${userId}/${file.name}` };
    } catch (e) {
      if (e?.name === 'AbortError') return { method: 'cancelled' };
      // sem permissão ou pasta protegida: cai para a descarga
    }
  }
  downloadFile(file);
  return { method: 'download', path: file.name };
}
export function downloadFile(file) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = file.name; a.style.display = 'none';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 8000);
}

// ---------- ENVIAR POR EMAIL (Web Share com anexo; senão mailto + descarga) ----------
export async function shareBackupByEmail(file, summary) {
  const date = new Date().toLocaleDateString('pt-PT');
  const subject = `Backup App Sobrevivência - ID: ${getUserId()} - ${date}`;
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: subject, text: `${subject}\n\n${summary}` }); return { method: 'share' }; }
    catch (e) { if (e?.name === 'AbortError') return { method: 'cancelled' }; }
  }
  downloadFile(file); // o utilizador anexa o ficheiro que acabou de descarregar
  const body = `${summary}\n\nO ficheiro "${file.name}" foi descarregado para este dispositivo (pasta Transferências). Anexa-o a este email antes de enviar.`;
  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return { method: 'mailto' };
}

// ---------- IMPORTAR TUDO ----------
// Lê e valida o ficheiro. Devolve { manifest, files } ou lança erro com a razão.
export async function readBackup(file) {
  let files;
  try { files = unzipSync(new Uint8Array(await file.arrayBuffer())); } catch { throw new Error(t('O ficheiro não é um .zip válido.')); }
  if (!files['manifest.json']) throw new Error(t('Falta o manifest.json: não é um backup da SteelDeck.'));
  let manifest; try { manifest = JSON.parse(strFromU8(files['manifest.json'])); } catch { throw new Error(t('manifest.json danificado.')); }
  if (manifest.format !== BACKUP_FORMAT) throw new Error(t('Este ficheiro não é um backup da SteelDeck.'));
  if (manifest.version > BACKUP_VERSION) throw new Error(t('Backup feito por uma versão mais recente da app. Atualiza a app primeiro.'));
  if (!files['localStorage.json']) throw new Error(t('Backup incompleto (falta localStorage.json).'));
  for (const d of manifest.databases || []) for (const st of d.stores) if (!files[`idb/${d.name}/${st.name}.json`]) throw new Error(t('Backup incompleto (falta {n}).', { n: `${d.name}/${st.name}` }));
  for (let i = 0; i < (manifest.blobs || 0); i++) if (!files[`blobs/${i}`]) throw new Error(t('Backup incompleto (falta o ficheiro {n}).', { n: i }));
  return { manifest, files };
}

// Listas guardadas no localStorage que se juntam por id quando se funde (pinos, conversas, ativos)
const MERGE_ARRAYS = { braga_custom_pins: 'id', pb_ai_convs_v1: 'id', sd_watchlist: null };
function mergeLocalArray(key, cur, inc) {
  try {
    const a = JSON.parse(cur || '[]'); const b = JSON.parse(inc || '[]');
    if (!Array.isArray(a) || !Array.isArray(b)) return cur;
    const idk = MERGE_ARRAYS[key];
    if (!idk) return JSON.stringify(a.map((x, i) => x || b[i] || null)); // espaços fixos (ativos): preenche os vazios
    const seen = new Set(a.map((x) => x && x[idk]));
    return JSON.stringify([...a, ...b.filter((x) => x && !seen.has(x[idk]))]);
  } catch { return cur; }
}

// mode: 'replace' (substitui tudo) | 'merge' (junta: mantém o que existe e acrescenta o que falta)
export async function restoreBackup({ manifest, files }, mode = 'merge', onProgress) {
  const getBin = (n) => files[`blobs/${n}`];
  // 1) localStorage
  const ls = JSON.parse(strFromU8(files['localStorage.json']));
  if (mode === 'replace') { const keep = localStorage.getItem(USER_KEY); localStorage.clear(); if (keep && !ls[USER_KEY]) localStorage.setItem(USER_KEY, keep); }
  for (const [k, v] of Object.entries(ls)) {
    const cur = localStorage.getItem(k);
    if (mode === 'replace' || cur == null) localStorage.setItem(k, v);
    else if (k in MERGE_ARRAYS) localStorage.setItem(k, mergeLocalArray(k, cur, v));
    // fundir: restantes definições atuais ficam como estão
  }
  // 2) IndexedDB (cria as bases/stores em falta com o esquema do backup)
  let written = 0;
  for (const d of manifest.databases || []) {
    onProgress?.(t('A restaurar {n}…', { n: d.name }));
    const db = await new Promise((res, rej) => {
      const probe = indexedDB.open(d.name);
      probe.onupgradeneeded = () => { /* base nova: criada já com o esquema abaixo */
        for (const st of d.stores) if (!probe.result.objectStoreNames.contains(st.name)) {
          const os = probe.result.createObjectStore(st.name, { keyPath: st.keyPath ?? undefined, autoIncrement: !!st.autoIncrement });
          for (const ix of st.indexes || []) os.createIndex(ix.name, ix.keyPath, { unique: ix.unique, multiEntry: ix.multiEntry });
        }
      };
      probe.onsuccess = () => res(probe.result); probe.onerror = () => rej(probe.error);
    });
    // a base existia com versão inferior e sem stores? sobe a versão para os criar
    let target = db;
    const missing = d.stores.filter((st) => !db.objectStoreNames.contains(st.name));
    if (missing.length) {
      const v = Math.max(db.version + 1, d.version); db.close();
      target = await new Promise((res, rej) => {
        const up = indexedDB.open(d.name, v);
        up.onupgradeneeded = () => { for (const st of missing) { const os = up.result.createObjectStore(st.name, { keyPath: st.keyPath ?? undefined, autoIncrement: !!st.autoIncrement }); for (const ix of st.indexes || []) os.createIndex(ix.name, ix.keyPath, { unique: ix.unique, multiEntry: ix.multiEntry }); } };
        up.onsuccess = () => res(up.result); up.onerror = () => rej(up.error);
      });
    }
    for (const st of d.stores) {
      const rows = JSON.parse(strFromU8(files[`idb/${d.name}/${st.name}.json`]));
      const tx = target.transaction(st.name, 'readwrite'); const os = tx.objectStore(st.name);
      if (mode === 'replace') os.clear();
      for (const row of rows) {
        const key = decodeValue(row.k, getBin); const val = decodeValue(row.v, getBin);
        if (mode === 'merge') {
          const exists = await req(os.count(key)).catch(() => 0);
          if (exists) continue;
        }
        if (os.keyPath != null) os.put(val); else os.put(val, key);
        written++;
      }
      await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
    }
    target.close();
  }
  return { written, localStorage: Object.keys(ls).length };
}
