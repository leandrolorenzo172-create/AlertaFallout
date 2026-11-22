import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Star, Search, X, List } from 'lucide-react';
import { listDocs, getDoc, getFile, getMeta, setMeta, onKbChange, takeOpenRequest, pdfjs } from '@/lib/kb';
import { t } from '@/i18n';

const box = { background: 'rgb(var(--cd) / 0.4)', border: '1px solid rgb(var(--c) / 0.2)' };
const btn = { background: 'rgb(var(--cb) / 0.6)', border: '1px solid rgb(var(--c) / 0.3)', color: 'rgb(var(--c))' };
const norm = (t) => (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Leitor offline: PDF desenhado página a página; outros documentos em texto por secções.
function Reader({ docId, startPage, onClose }) {
  const [doc, setDoc] = useState(null);
  const [pdf, setPdf] = useState(null);
  const [page, setPage] = useState(startPage || 1);
  const [zoom, setZoom] = useState(1);
  const [marks, setMarks] = useState([]);
  const [outline, setOutline] = useState([]);
  const [showIndex, setShowIndex] = useState(false);
  const [q, setQ] = useState('');
  const [error, setError] = useState(null);
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const total = pdf ? pdf.numPages : (doc?.pages?.length || 1);

  useEffect(() => {
    let alive = true; let loaded = null;
    (async () => {
      try {
        const d = await getDoc(docId);
        if (!alive || !d) return;
        setDoc(d);
        setMarks((await getMeta(`marks|${docId}`)) || []);
        if (!startPage) { const last = await getMeta(`last|${docId}`); if (alive && last) setPage(last); }
        if (d.type === 'pdf') {
          const file = await getFile(docId);
          loaded = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
          if (!alive) { loaded.destroy(); return; }
          setPdf(loaded);
          // índice / capítulos do PDF, quando existe
          const ol = await loaded.getOutline().catch(() => null);
          const items = [];
          for (const it of (ol || []).slice(0, 60)) {
            try {
              const dest = typeof it.dest === 'string' ? await loaded.getDestination(it.dest) : it.dest;
              if (dest) items.push({ title: it.title, page: (await loaded.getPageIndex(dest[0])) + 1 });
            } catch (e) { /* capítulo sem destino */ }
          }
          if (alive) setOutline(items);
        }
      } catch (e) { if (alive) setError(t('Não foi possível abrir este documento.')); }
    })();
    return () => { alive = false; if (loaded) loaded.destroy(); };
  }, [docId, startPage]);

  // desenha a página do PDF
  useEffect(() => {
    if (!pdf) return undefined;
    let task = null; let alive = true;
    (async () => {
      const p = await pdf.getPage(Math.min(page, pdf.numPages));
      if (!alive) return;
      const width = (wrapRef.current?.clientWidth || 320) * zoom;
      const base = p.getViewport({ scale: 1 });
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const vp = p.getViewport({ scale: (width / base.width) * dpr });
      const c = canvasRef.current; if (!c) return;
      c.width = vp.width; c.height = vp.height; c.style.width = `${width}px`;
      task = p.render({ canvasContext: c.getContext('2d'), viewport: vp });
      task.promise.catch(() => {});
    })();
    return () => { alive = false; if (task) task.cancel(); };
  }, [pdf, page, zoom]);

  useEffect(() => { if (doc) setMeta(`last|${docId}`, page).catch(() => {}); }, [doc, docId, page]); // histórico de leitura

  const go = (n) => setPage(Math.min(total, Math.max(1, n || 1)));
  const toggleMark = () => {
    const next = marks.includes(page) ? marks.filter((m) => m !== page) : [...marks, page].sort((a, b) => a - b);
    setMarks(next); setMeta(`marks|${docId}`, next).catch(() => {});
  };
  const words = norm(q).split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  const hits = words.length && doc ? (doc.index || []).map((t, i) => (words.every((w) => t.includes(w)) ? i + 1 : 0)).filter(Boolean).slice(0, 40) : [];
  const unit = doc?.unit || t('pág.');

  return (
    <div className="p-3 rounded-sm mb-4" style={box}>
      <div className="flex items-center gap-2 mb-2">
        <BookOpen size={14} />
        <h3 className="flex-1 min-w-0 text-xs font-bold uppercase tracking-wider truncate">{doc?.title || t('A abrir...')}</h3>
        <button type="button" onClick={onClose} aria-label={t('Fechar leitor')} className="p-1.5 rounded-sm" style={btn}><X size={14} /></button>
      </div>
      {error && <p className="text-xs" style={{ color: '#ff6600' }}>{error}</p>}
      <div className="flex flex-wrap items-center gap-1.5 mb-2 text-xs">
        <button type="button" onClick={() => go(page - 1)} disabled={page <= 1} aria-label={t('Página anterior')} className="p-1.5 rounded-sm disabled:opacity-30" style={btn}><ChevronLeft size={14} /></button>
        <input id="reader-page" type="number" min="1" max={total} value={page} onChange={(e) => go(Number(e.target.value))} aria-label={t('Ir para a página')}
          className="w-14 px-1 py-1 rounded-sm text-center tabular-nums" style={{ ...btn, outline: 'none' }} />
        <span style={{ color: 'rgb(var(--c) / 0.6)' }}>/ {total} {unit}</span>
        <button type="button" onClick={() => go(page + 1)} disabled={page >= total} aria-label={t('Página seguinte')} className="p-1.5 rounded-sm disabled:opacity-30" style={btn}><ChevronRight size={14} /></button>
        {pdf && <>
          <button type="button" onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.2).toFixed(1)))} aria-label={t('Reduzir')} className="p-1.5 rounded-sm" style={btn}><ZoomOut size={14} /></button>
          <span className="tabular-nums" style={{ color: 'rgb(var(--c) / 0.6)' }}>{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => setZoom((z) => Math.min(3, +(z + 0.2).toFixed(1)))} aria-label={t('Ampliar')} className="p-1.5 rounded-sm" style={btn}><ZoomIn size={14} /></button>
        </>}
        <button type="button" onClick={toggleMark} aria-pressed={marks.includes(page)} aria-label={t('Marcar esta página')} className="p-1.5 rounded-sm" style={{ ...btn, color: marks.includes(page) ? '#ffaa00' : 'rgb(var(--c))' }}>
          <Star size={14} fill={marks.includes(page) ? '#ffaa00' : 'none'} />
        </button>
        <button type="button" onClick={() => setShowIndex((v) => !v)} aria-pressed={showIndex} aria-label={t('Índice e marcadores')} className="p-1.5 rounded-sm" style={btn}><List size={14} /></button>
      </div>
      <div className="flex items-center gap-2 mb-2 px-2 py-1 rounded-sm" style={btn}>
        <Search size={13} />
        <input id="reader-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Procurar neste documento...')} className="flex-1 min-w-0 bg-transparent text-xs" style={{ outline: 'none', color: 'rgb(var(--c))' }} />
      </div>
      {words.length > 0 && (
        <p className="text-[11px] mb-2" style={{ color: 'rgb(var(--c) / 0.75)' }}>
          {hits.length ? <>{t('Encontrado em:')}{' '}{hits.map((h) => <button key={h} type="button" onClick={() => go(h)} className="underline mr-2">{unit} {h}</button>)}</> : t('Sem resultados neste documento.')}
        </p>
      )}
      {showIndex && (
        <div className="mb-2 p-2 rounded-sm text-[11px]" style={{ background: 'rgb(var(--cb) / 0.6)', border: '1px solid rgb(var(--c) / 0.2)' }}>
          <p className="uppercase tracking-wider mb-1" style={{ color: 'rgb(var(--c) / 0.6)' }}>{t('Marcadores')}</p>
          {marks.length ? marks.map((m) => <button key={m} type="button" onClick={() => go(m)} className="underline mr-2">★ {unit} {m}</button>) : <span style={{ color: 'rgb(var(--c) / 0.5)' }}>{t('Nenhum. Usa a estrela para marcar uma página.')}</span>}
          <p className="uppercase tracking-wider mt-2 mb-1" style={{ color: 'rgb(var(--c) / 0.6)' }}>{t('Índice')}</p>
          {outline.length ? outline.map((o, i) => <button key={i} type="button" onClick={() => go(o.page)} className="block text-left underline">{o.title}{' '}{t('— pág.')}{' '}{o.page}</button>) : <span style={{ color: 'rgb(var(--c) / 0.5)' }}>{t('Este documento não traz índice de capítulos.')}</span>}
        </div>
      )}
      <div ref={wrapRef} className="overflow-auto rounded-sm" style={{ maxHeight: '70vh', background: pdf ? '#fff' : 'rgb(var(--cb) / 0.6)', border: '1px solid rgb(var(--c) / 0.2)' }}>
        {pdf ? <canvas ref={canvasRef} className="block" /> : (
          <pre className="p-3 text-xs whitespace-pre-wrap" style={{ color: 'rgb(var(--c) / 0.9)', fontFamily: 'inherit', overflowWrap: 'anywhere' }}>
            {doc ? (doc.pages?.[page - 1] || t('Este ficheiro não tem texto extraído.')) : ''}
          </pre>
        )}
      </div>
    </div>
  );
}

export default function DocLibrary() {
  const [docs, setDocs] = useState([]);
  const [open, setOpen] = useState(null); // { docId, page }
  const [recent, setRecent] = useState({});

  const load = useCallback(async () => {
    const list = await listDocs().catch(() => []);
    setDocs(list);
    const r = {};
    for (const d of list) { const p = await getMeta(`last|${d.id}`).catch(() => null); if (p) r[d.id] = p; }
    setRecent(r);
  }, []);
  useEffect(() => {
    load();
    const req = takeOpenRequest(); if (req) setOpen(req);
    return onKbChange(load);
  }, [load]);

  return (
    <div className="mb-4">
      <h3 className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold mb-2"><BookOpen size={14} />{' '}{t('Documentos importados (')}{docs.length})</h3>
      {open && <Reader key={`${open.docId}|${open.page || 0}`} docId={open.docId} startPage={open.page} onClose={() => { setOpen(null); load(); }} />}
      {docs.length === 0 ? (
        <p className="p-3 rounded-sm text-[11px]" style={{ ...box, color: 'rgb(var(--c) / 0.6)' }}>
          {t('Ainda não há documentos. Importa PDF ou texto no separador Ficheiros IA e aparecem aqui para leitura offline.')}
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {docs.map((d) => (
            <li key={d.id}>
              <button type="button" onClick={() => setOpen({ docId: d.id })} className="w-full flex items-center gap-2 px-3 py-2 rounded-sm text-left" style={btn}>
                <BookOpen size={14} className="shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block text-xs truncate">{d.title}</span>
                  <span className="block text-[10px]" style={{ color: 'rgb(var(--c) / 0.55)' }}>
                    {d.category} · {d.pages?.length || 0} {d.unit}{recent[d.id] ? ` · ${t('lido até')} ${d.unit} ${recent[d.id]}` : ''}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
