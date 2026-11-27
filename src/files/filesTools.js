// Ferramentas rápidas da aba FICHEIROS (menu ≡ flutuante): estado partilhado entre o menu (HotBar)
// e a vista da Base de Conhecimento (KnowledgeFilesTab). Filtro e ordenação ficam guardados no dispositivo.
import { useSyncExternalStore } from 'react';
import { listDocs, deleteDoc, importFile, updateDoc } from '@/lib/kb';
import { ensureGuide, isGuide } from '@/lib/guide';

export const FILE_TYPES = ['pdf', 'docx', 'txt', 'md', 'json', 'csv', 'xml'];
export const FILE_SORTS = [
  { id: 'new', label: 'Data de inserido: mais recentes' },
  { id: 'old', label: 'Data de inserido: mais antigos' },
  { id: 'az', label: 'Ordem alfabética: A–Z' },
  { id: 'za', label: 'Ordem alfabética: Z–A' },
  { id: 'small', label: 'Tamanho: menor primeiro' },
  { id: 'big', label: 'Tamanho: maior primeiro' },
];
const KEY = 'sd_files_view';
const saved = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } })();

let state = {
  types: Array.isArray(saved.types) ? saved.types.filter((x) => FILE_TYPES.includes(x)) : [], // vazio = todos
  sort: FILE_SORTS.some((s) => s.id === saved.sort) ? saved.sort : 'new',
  panel: null,        // null | 'note' | 'filter' | 'sort'
  confirmReset: false, // diálogo "Eliminar biblioteca"
};
const listeners = new Set();
const set = (patch) => {
  state = { ...state, ...patch };
  try { localStorage.setItem(KEY, JSON.stringify({ types: state.types, sort: state.sort })); } catch { /* sem armazenamento */ }
  listeners.forEach((l) => l());
};
export const getFilesView = () => state;
export const useFilesView = () => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, getFilesView);

export const openFilesPanel = (panel) => set({ panel: state.panel === panel ? null : panel });
export const closeFilesPanel = () => set({ panel: null });
export const toggleFileType = (t) => set({ types: state.types.includes(t) ? state.types.filter((x) => x !== t) : [...state.types, t] });
export const clearFileTypes = () => set({ types: [] });
export const setFileSort = (sort) => set({ sort });
export const askReset = (open = true) => set({ confirmReset: open });
export const filesFiltered = (s = state) => s.types.length > 0 || s.sort !== 'new';

// IMPORTAR FICHEIRO: a vista abre o seletor de ficheiros já existente (mesmo fluxo do botão "Ficheiros")
const EVT = 'steeldeck:files-import';
export const requestImport = () => window.dispatchEvent(new Event(EVT));
export const onImportRequest = (fn) => { window.addEventListener(EVT, fn); return () => window.removeEventListener(EVT, fn); };

// Filtro + ordenação aplicados à lista de documentos
const typeOf = (d) => String(d?.type || (d?.name || '').split('.').pop() || '').toLowerCase();
export function viewDocs(docs, v = state) {
  const by = {
    new: (a, b) => String(b.created_date).localeCompare(String(a.created_date)),
    old: (a, b) => String(a.created_date).localeCompare(String(b.created_date)),
    az: (a, b) => String(a.title).localeCompare(String(b.title), 'pt', { sensitivity: 'base' }),
    za: (a, b) => String(b.title).localeCompare(String(a.title), 'pt', { sensitivity: 'base' }),
    small: (a, b) => (a.size_kb || 0) - (b.size_kb || 0),
    big: (a, b) => (b.size_kb || 0) - (a.size_kb || 0),
  }[v.sort];
  return docs.filter((d) => !v.types.length || v.types.includes(typeOf(d))).sort(by);
}

// NOTAS: grava a nota como ficheiro .md pelo mesmo fluxo de importação (fica indexada para a IA e aparece no Manual)
export async function saveNote({ title, content, tags }) {
  const name = `${title.trim().replace(/[\\/:*?"<>|]+/g, '').slice(0, 60) || 'Nota'}.md`;
  const tagList = String(tags || '').split(',').map((x) => x.trim()).filter(Boolean);
  const body = `# ${title.trim()}\n\n${tagList.length ? `Etiquetas: ${tagList.join(', ')}\n\n` : ''}${content.trim()}\n`;
  const file = new File([body], name, { type: 'text/markdown', lastModified: Date.now() });
  const r = await importFile(file);
  if (r.status === 'ok') await updateDoc(r.doc.id, { title: title.trim(), category: 'Nota', tags: tagList, note: true });
  return r;
}

// ELIMINAR BIBLIOTECA: apaga todos os documentos e notas, menos o Guia de Sobrevivência SteelDeck
export async function resetLibrary() {
  const docs = await listDocs();
  const gone = docs.filter((d) => !isGuide(d));
  for (const d of gone) await deleteDoc(d.id);
  await ensureGuide().catch(() => {}); // se o Guia faltar, volta a ser importado
  return gone.length;
}
