// eBook do sistema: GUIA DE SOBREVIVÊNCIA STEELDECK (PANDASTEEL).
// PDF gerado por scripts/build-guia.py; a app importa-o para a Base de Conhecimento (IndexedDB) na 1.ª vez que
// é preciso: ao abrir o Manual ou na 1.ª pergunta ao Mr. Steel. Fica sempre no topo da estante.
// Ao mudar a edição, sobe GUIDE_VERSION: a cópia antiga é substituída.
import { listDocs, importFile, updateDoc, deleteDoc } from './kb';

export const GUIDE_VERSION = 7;
const GUIDE_FILE = 'GUIA DE SOBREVIVENCIA STEELDECK.pdf';
export const isGuide = (d) => !!d?.system || String(d?.id || '').startsWith(`${GUIDE_FILE}|`);

let guideJob = null;
export function ensureGuide() {
  if (guideJob) return guideJob;
  guideJob = (async () => {
    try {
      const docs = await listDocs();
      if (docs.some((d) => isGuide(d) && d.guideVersion === GUIDE_VERSION)) return; // já está a edição atual
      const res = await fetch('./guia-steeldeck.pdf');
      if (!res.ok) return;
      const blob = await res.blob();
      const file = new File([blob], GUIDE_FILE, { type: 'application/pdf', lastModified: GUIDE_VERSION });
      const r = await importFile(file);
      const docId = r.doc?.id;
      if (!docId) return;
      for (const d of docs) if (isGuide(d) && d.id !== docId) await deleteDoc(d.id).catch(() => {}); // edições antigas
      await updateDoc(docId, { title: 'GUIA DE SOBREVIVÊNCIA STEELDECK', author: 'PANDASTEEL', category: 'Manual de campo', system: true, guideVersion: GUIDE_VERSION });
    } catch { /* sem rede na 1.ª abertura: tenta de novo da próxima vez */ } finally { guideJob = null; }
  })();
  return guideJob;
}
