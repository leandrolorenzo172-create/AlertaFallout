// Procura a pergunta nos ficheiros ativos da base de conhecimento (modo offline).
const norm = (t) => (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function searchFiles(query, files) {
  const words = norm(query).split(/[^a-z0-9]+/).filter((w) => w.length > 3);
  if (!words.length) return null;
  let best = null;
  for (const f of files || []) {
    if (f.enabled === false || !f.extracted_text) continue;
    const text = norm(f.extracted_text);
    let score = 0;
    let firstPos = -1;
    for (const w of words) {
      const pos = text.indexOf(w);
      if (pos >= 0) { score++; if (firstPos < 0 || pos < firstPos) firstPos = pos; }
    }
    if (score > 0 && (!best || score > best.score)) {
      const start = Math.max(0, firstPos - 120);
      best = { score, name: f.name, excerpt: f.extracted_text.slice(start, start + 500).trim() };
    }
  }
  return best && best.score >= Math.min(2, words.length) ? { name: best.name, excerpt: best.excerpt } : null;
}
