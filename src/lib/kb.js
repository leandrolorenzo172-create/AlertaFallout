// Base de conhecimento local: IMPORTAR -> EXTRAIR -> INDEXAR -> BASE DE CONHECIMENTO -> IA + MANUAL.
// Tudo fica no browser (IndexedDB): o texto extraído, por página ou secção, e o ficheiro original.
import * as pdfjs from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { unzipSync, strFromU8 } from 'fflate';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

const TEXT_EXT = ['txt', 'md', 'csv', 'json', 'xml'];
const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'webp'];
export const ACCEPT = '.pdf,.txt,.md,.csv,.json,.xml,.docx,.png,.jpg,.jpeg,.webp';
const CATEGORY = { pdf: 'Manual PDF', docx: 'Documento', txt: 'Texto', md: 'Texto', csv: 'Dados', json: 'Dados', xml: 'Dados' };

let dbPromise;
function db() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open('pipboy_kb', 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore('docs', { keyPath: 'id' }); // metadados + texto por página
        req.result.createObjectStore('files'); // ficheiro original (uma só cópia)
        req.result.createObjectStore('meta'); // marcadores e histórico de leitura
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}
async function run(store, mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction(store, mode);
    const req = fn(t.objectStore(store));
    t.oncomplete = () => resolve(req && req.result);
    t.onerror = () => reject(t.error); t.onabort = () => reject(t.error);
  });
}

const listeners = new Set();
export const onKbChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const changed = () => listeners.forEach((l) => l());

const norm = (t) => (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const chunk = (text, size = 1800) => {
  const out = []; const paras = text.split(/\n{2,}/); let cur = '';
  for (const p of paras) {
    if (cur && cur.length + p.length > size) { out.push(cur.trim()); cur = ''; }
    cur += `${p}\n\n`;
    while (cur.length > size * 1.5) { out.push(cur.slice(0, size)); cur = cur.slice(size); }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
};

async function extract(file, ext) {
  if (ext === 'pdf') {
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const pages = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const tc = await (await pdf.getPage(i)).getTextContent();
      pages.push(tc.items.map((it) => it.str + (it.hasEOL ? '\n' : ' ')).join('').replace(/[ \t]+/g, ' ').trim());
    }
    await pdf.destroy();
    return { pages, unit: 'pág.' };
  }
  if (ext === 'docx') {
    const zip = unzipSync(new Uint8Array(await file.arrayBuffer()), { filter: (f) => f.name === 'word/document.xml' });
    const xml = strFromU8(zip['word/document.xml'] || new Uint8Array());
    const text = xml.replace(/<\/w:p>/g, '\n\n').replace(/<w:tab\/>/g, '\t').replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
    return { pages: chunk(text), unit: 'secção' };
  }
  if (TEXT_EXT.includes(ext)) return { pages: chunk(await file.text()), unit: 'secção' };
  return { pages: [], unit: 'secção' }; // imagens: guardadas, mas sem texto (não há OCR offline)
}

// Importa um ficheiro. Devolve { status: 'ok' | 'duplicado' | 'erro' | 'nao_suportado', doc? }
export async function importFile(file, onStep = () => {}) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (![...TEXT_EXT, ...IMAGE_EXT, 'pdf', 'docx'].includes(ext)) return { status: 'nao_suportado' };
  const id = `${file.name}|${file.size}|${file.lastModified || 0}`; // o mesmo ficheiro não é guardado duas vezes
  const existing = await run('docs', 'readonly', (s) => s.get(id));
  if (existing) return { status: 'duplicado', doc: existing };
  try {
    onStep('EXTRAIR');
    const { pages, unit } = await extract(file, ext);
    onStep('INDEXAR');
    const doc = {
      id, name: file.name, title: file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '), type: ext,
      category: IMAGE_EXT.includes(ext) ? 'Imagem' : (CATEGORY[ext] || 'Outro'),
      folder: (file.webkitRelativePath || '').split('/')[0] || 'Geral',
      size_kb: Math.round((file.size || 0) / 1024), created_date: new Date().toISOString(), enabled: true,
      pages, unit, chars: pages.reduce((n, p) => n + p.length, 0),
      index: pages.map((p) => norm(p)), // texto normalizado para a pesquisa
    };
    await run('files', 'readwrite', (s) => s.put(file, id));
    await run('docs', 'readwrite', (s) => s.put(doc));
    changed();
    return { status: 'ok', doc };
  } catch (e) {
    return { status: 'erro', error: e.message };
  }
}

export const listDocs = async () => ((await run('docs', 'readonly', (s) => s.getAll())) || []).sort((a, b) => b.created_date.localeCompare(a.created_date));
export const getDoc = (id) => run('docs', 'readonly', (s) => s.get(id));
export const getFile = (id) => run('files', 'readonly', (s) => s.get(id));
export async function updateDoc(id, patch) {
  const d = await getDoc(id); if (!d) return null;
  const next = { ...d, ...patch };
  await run('docs', 'readwrite', (s) => s.put(next)); changed();
  return next;
}
// Apaga o documento, o ficheiro original, o índice, os marcadores e o histórico de leitura.
export async function deleteDoc(id) {
  await run('docs', 'readwrite', (s) => s.delete(id));
  await run('files', 'readwrite', (s) => s.delete(id));
  await run('meta', 'readwrite', (s) => s.delete(`marks|${id}`));
  await run('meta', 'readwrite', (s) => s.delete(`last|${id}`));
  changed();
}
export const getMeta = (key) => run('meta', 'readonly', (s) => s.get(key));
export const setMeta = (key, value) => run('meta', 'readwrite', (s) => s.put(value, key));

const words = (q) => norm(q).split(/[^a-z0-9]+/).filter((w) => w.length > 2);
function excerptAt(text, ws) {
  const n = norm(text); let pos = -1;
  for (const w of ws) { const p = n.indexOf(w); if (p >= 0 && (pos < 0 || p < pos)) pos = p; }
  const start = Math.max(0, pos - 100);
  return (start ? '…' : '') + text.slice(start, start + 320).replace(/\s+/g, ' ').trim() + '…';
}
// Pesquisa nos documentos ativos. Devolve as páginas/secções mais relevantes, com referência.
export async function searchDocs(query, { limit = 8, onlyEnabled = true } = {}) {
  const ws = words(query); if (!ws.length) return [];
  const docs = await listDocs(); const hits = [];
  for (const d of docs) {
    if (onlyEnabled && d.enabled === false) continue;
    const inTitle = ws.filter((w) => norm(`${d.title} ${d.category}`).includes(w)).length;
    (d.index || []).forEach((txt, i) => {
      let score = 0; let found = 0;
      for (const w of ws) { const c = txt.split(w).length - 1; if (c) { found++; score += Math.min(c, 5); } }
      if (found) hits.push({ docId: d.id, name: d.name, title: d.title, type: d.type, page: i + 1, unit: d.unit, score: score + found * 4 + inTitle * 2, excerpt: excerptAt(d.pages[i], ws) });
    });
    if (inTitle && !(d.index || []).length) hits.push({ docId: d.id, name: d.name, title: d.title, type: d.type, page: 1, unit: d.unit, score: inTitle * 2, excerpt: `${d.category} · ${d.size_kb} KB` });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
export const refOf = (h) => `${h.name}, ${h.unit} ${h.page}`;

// Pedido para abrir um documento no leitor do separador Manual
let pendingOpen = null;
export const requestOpen = (docId, page = 1) => { pendingOpen = { docId, page }; };
export const takeOpenRequest = () => { const p = pendingOpen; pendingOpen = null; return p; };

export { pdfjs };
