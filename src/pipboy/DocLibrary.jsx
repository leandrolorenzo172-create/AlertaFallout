import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Star, Search, X, List, Maximize2, Minimize2, Upload, FileText, Image as ImageIcon, Database, Moon, Zap, MoveHorizontal } from 'lucide-react';
import { listDocs, getDoc, getFile, getMeta, setMeta, onKbChange, takeOpenRequest, pdfjs, importFile, ACCEPT } from '@/lib/kb';
import { t } from '@/i18n';

// Biblioteca do Manual em estilo e-reader (Kindle/Kobo):
//  - ESTANTE: cada documento é um cartão com capa (1.ª página do PDF, ou capa gerada), título, páginas, progresso e resumo.
//  - LEITOR: ecrã inteiro, virar página com deslizar ou tocando nas laterais, toque no centro mostra/esconde os controlos;
//    no PC, a roda do rato / setas mudam de página. Zoom, ajuste à largura/altura, modo noite, marcadores, índice e pesquisa.
// Tudo offline: os ficheiros, o texto e o progresso ficam no IndexedDB do aparelho (src/lib/kb.js).

const box = { background: 'rgb(var(--cd) / 0.4)', border: '1px solid rgb(var(--c) / 0.2)' };
const btn = { background: 'rgb(var(--cb) / 0.6)', border: '1px solid rgb(var(--c) / 0.3)', color: 'rgb(var(--c))' };
const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const IMG_TYPES = ['png', 'jpg', 'jpeg', 'webp'];
const fmtDate = (iso) => { try { return new Date(iso).toLocaleDateString(); } catch { return ''; } };

// ---------- documento de exemplo (texto original da app), para a estante não começar vazia ----------
const SAMPLE_NAME = 'Guia do leitor SteelDeck.md';
const SAMPLE_TEXT = `# Guia do leitor SteelDeck

Bem-vindo à tua estante. Aqui ficam os documentos que importares, para leres sem internet, como num Kindle ou Kobo.

## Virar página

No telemóvel: desliza para a esquerda ou para a direita, ou toca na lateral direita para avançar e na lateral esquerda para recuar. Um toque no centro mostra ou esconde os controlos, para leres sem distrações.

No PC: usa a roda do rato (para baixo avança, para cima recua) ou as setas do teclado.

## Ecrã inteiro

O botão de ecrã inteiro esconde tudo o resto. No telemóvel, segura-o com uma mão e vira as páginas com o polegar.

## Ajustes

Zoom, ajuste à largura ou à altura do ecrã, modo noite para PDFs claros, transição de página suave ou instantânea, marcadores com a estrela, índice de capítulos e pesquisa dentro do documento.

## Importar

Toca em "Importar documentos" e escolhe ficheiros PDF, DOCX, TXT, MD, JSON, CSV ou XML. Ficam só neste aparelho. A IA da app também os consulta e cita o documento e a página.

## Progresso

A estante lembra-se da página onde ficaste em cada documento e mostra a barra de progresso no cartão.`;

async function ensureSample() {
  try {
    if (await getMeta('sample_seeded')) return;
    await setMeta('sample_seeded', true);
    if ((await listDocs()).length) return; // quem já tem documentos não recebe o exemplo
    await importFile(new File([SAMPLE_TEXT], SAMPLE_NAME, { type: 'text/markdown', lastModified: 1 }));
  } catch { /* sem armazenamento */ }
}

// ---------- capas ----------
const coverCache = new Map();
let coverQueue = Promise.resolve();
// gera (uma vez) a capa de um PDF ou imagem a partir da 1.ª página e guarda-a no IndexedDB
function loadCover(d) {
  if (coverCache.has(d.id)) return coverCache.get(d.id);
  const p = (coverQueue = coverQueue.then(async () => {
    const saved = await getMeta(`cover|${d.id}`).catch(() => null);
    if (saved) return saved;
    if (d.type !== 'pdf' && !IMG_TYPES.includes(d.type)) return null;
    const file = await getFile(d.id); if (!file) return null;
    const c = document.createElement('canvas');
    if (d.type === 'pdf') {
      const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
      const pg = await pdf.getPage(1); const v1 = pg.getViewport({ scale: 1 });
      const vp = pg.getViewport({ scale: 240 / v1.width });
      c.width = vp.width; c.height = vp.height;
      await pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
      await pdf.destroy();
    } else {
      const url = URL.createObjectURL(file);
      const img = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = url; });
      const w = 240; c.width = w; c.height = Math.round((img.height / img.width) * w);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
    }
    const data = c.toDataURL('image/jpeg', 0.72);
    await setMeta(`cover|${d.id}`, data).catch(() => {});
    return data;
  }).catch(() => null));
  coverCache.set(d.id, p);
  return p;
}

function Cover({ d }) {
  const [src, setSrc] = useState(null);
  useEffect(() => { let alive = true; loadCover(d).then((s) => { if (alive) setSrc(s); }); return () => { alive = false; }; }, [d]);
  const Icon = d.type === 'pdf' ? BookOpen : IMG_TYPES.includes(d.type) ? ImageIcon : ['json', 'csv', 'xml'].includes(d.type) ? Database : FileText;
  return (
    <div className="shrink-0 rounded-sm overflow-hidden relative" style={{ width: 84, height: 116, border: '1px solid rgb(var(--c) / 0.35)', boxShadow: '0 4px 12px rgb(0 0 0 / 0.5)' }}>
      {src ? <img src={src} alt="" className="w-full h-full" style={{ objectFit: 'cover' }} /> : (
        // capa gerada: cor do tema, ícone do tipo e título
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-1.5 text-center"
          style={{ background: 'linear-gradient(160deg, rgb(var(--c) / 0.28), rgb(var(--cd)) 70%)' }}>
          <Icon size={22} style={{ color: 'rgb(var(--c))' }} />
          <span className="text-[8px] leading-tight font-bold uppercase" style={{ color: 'rgb(var(--c) / 0.9)', overflowWrap: 'anywhere' }}>{d.title.slice(0, 40)}</span>
          <span className="text-[7px] uppercase tracking-widest" style={{ color: 'rgb(var(--c) / 0.6)' }}>{d.type}</span>
        </div>
      )}
    </div>
  );
}

// ---------- leitor em ecrã inteiro ----------
function Reader({ docId, startPage, onClose }) {
  const [doc, setDoc] = useState(null);
  const [pdf, setPdf] = useState(null);
  const [imgUrl, setImgUrl] = useState(null);
  const [page, setPage] = useState(startPage || 1);
  const [zoom, setZoom] = useState(1); // 1 = ajustado
  const [fit, setFit] = useState(() => localStorage.getItem('rd_fit') || 'width'); // 'width' | 'height'
  const [night, setNight] = useState(() => localStorage.getItem('rd_night') === '1');
  const [instant, setInstant] = useState(() => localStorage.getItem('rd_instant') === '1');
  const [fontSize, setFontSize] = useState(() => Number(localStorage.getItem('rd_font')) || 16);
  const [chrome, setChrome] = useState(true);
  const [panel, setPanel] = useState(null); // 'index' | 'search' | 'settings'
  const [marks, setMarks] = useState([]);
  const [outline, setOutline] = useState([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState(null);
  const [anim, setAnim] = useState(''); // classe da transição
  const [fs, setFs] = useState(false);
  const rootRef = useRef(null);
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const total = pdf ? pdf.numPages : (doc?.pages?.length || 1);
  const unit = t(doc?.unit || 'pág.');
  const save = (k, v) => { try { localStorage.setItem(k, v); } catch { /* sem armazenamento */ } };

  // abre o documento
  useEffect(() => {
    let alive = true; let loaded = null; let url = null;
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
          const ol = await loaded.getOutline().catch(() => null);
          const items = [];
          for (const it of (ol || []).slice(0, 80)) {
            try {
              const dest = typeof it.dest === 'string' ? await loaded.getDestination(it.dest) : it.dest;
              if (dest) items.push({ title: it.title, page: (await loaded.getPageIndex(dest[0])) + 1 });
            } catch { /* capítulo sem destino */ }
          }
          if (alive) setOutline(items);
        } else if (IMG_TYPES.includes(d.type)) {
          const file = await getFile(docId); url = URL.createObjectURL(file); if (alive) setImgUrl(url);
        } else {
          // documentos de texto: títulos Markdown (#) viram índice
          setOutline(d.pages.map((p, i) => ({ title: (p.match(/^#{1,3}\s+(.+)$/m) || [])[1], page: i + 1 })).filter((o) => o.title));
        }
      } catch { if (alive) setError(t('Não foi possível abrir este documento.')); }
    })();
    return () => { alive = false; if (loaded) loaded.destroy(); if (url) URL.revokeObjectURL(url); };
  }, [docId, startPage]);

  // desenha a página do PDF ajustada ao ecrã
  const draw = useCallback(async () => {
    if (!pdf || !stageRef.current) return;
    const p = await pdf.getPage(Math.min(page, pdf.numPages));
    const base = p.getViewport({ scale: 1 });
    const W = stageRef.current.clientWidth - 8; const H = stageRef.current.clientHeight - 8;
    const fitScale = fit === 'height' ? Math.min(H / base.height, W / base.width) : W / base.width;
    const css = fitScale * zoom;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const vp = p.getViewport({ scale: css * dpr });
    const c = canvasRef.current; if (!c) return;
    c.width = vp.width; c.height = vp.height; c.style.width = `${Math.round(base.width * css)}px`; c.style.height = `${Math.round(base.height * css)}px`;
    await p.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise.catch(() => {});
  }, [pdf, page, zoom, fit]);
  useEffect(() => { draw(); }, [draw, fs, chrome]);
  useEffect(() => { const r = () => draw(); window.addEventListener('resize', r); return () => window.removeEventListener('resize', r); }, [draw]);

  useEffect(() => { if (doc) setMeta(`last|${docId}`, page).catch(() => {}); }, [doc, docId, page]); // progresso
  useEffect(() => { if (stageRef.current) stageRef.current.scrollTo(0, 0); }, [page]);

  const go = useCallback((n, dir) => {
    const next = Math.min(total, Math.max(1, n || 1));
    if (next === page) return;
    if (!instant && dir) { setAnim(dir > 0 ? 'rd-in-next' : 'rd-in-prev'); setTimeout(() => setAnim(''), 260); }
    setPage(next);
  }, [total, page, instant]);
  const next = () => go(page + 1, 1);
  const prev = () => go(page - 1, -1);

  // ecrã inteiro (Fullscreen API; se não houver, o leitor já ocupa o ecrã todo)
  const toggleFs = async () => {
    try {
      if (!document.fullscreenElement) { await rootRef.current?.requestFullscreen?.(); setChrome(false); }
      else await document.exitFullscreen();
    } catch { setFs((v) => !v); }
  };
  useEffect(() => { const h = () => setFs(!!document.fullscreenElement); document.addEventListener('fullscreenchange', h); return () => document.removeEventListener('fullscreenchange', h); }, []);
  const close = () => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); onClose(); };

  // teclado e roda do rato (PC): ↓/→/PageDown avança, ↑/←/PageUp recua, Esc fecha
  useEffect(() => {
    const k = (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (['ArrowRight', 'PageDown', ' '].includes(e.key) || (e.key === 'ArrowDown' && zoom <= 1)) { e.preventDefault(); next(); }
      else if (['ArrowLeft', 'PageUp'].includes(e.key) || (e.key === 'ArrowUp' && zoom <= 1)) { e.preventDefault(); prev(); }
      else if (e.key === 'Escape' && !document.fullscreenElement) close();
    };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  });
  const wheelLock = useRef(0);
  const onWheel = (e) => {
    const el = stageRef.current; if (!el) return;
    const atTop = el.scrollTop <= 0; const atEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 2;
    const now = Date.now(); if (now - wheelLock.current < 450) return;
    // com a página maior que o ecrã, primeiro faz scroll; só muda de página quando chega ao fim/início
    if (e.deltaY > 30 && atEnd) { wheelLock.current = now; next(); }
    else if (e.deltaY < -30 && atTop) { wheelLock.current = now; prev(); }
  };

  // toque: deslizar para virar página; toque nas laterais vira, no centro mostra/esconde os controlos
  const touch = useRef(null);
  const onPointerDown = (e) => { touch.current = { x: e.clientX, y: e.clientY, t: Date.now() }; };
  const onPointerUp = (e) => {
    const s = touch.current; touch.current = null; if (!s) return;
    const dx = e.clientX - s.x; const dy = e.clientY - s.y; const el = stageRef.current;
    const zoomed = zoom > 1.05 && el && el.scrollWidth > el.clientWidth + 4;
    if (!zoomed && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) { if (dx < 0) next(); else prev(); return; }
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && Date.now() - s.t < 500) {
      const w = window.innerWidth; const x = e.clientX;
      if (x < w * 0.28) prev(); else if (x > w * 0.72) next(); else setChrome((c) => !c);
    }
  };

  const toggleMark = () => {
    const nx = marks.includes(page) ? marks.filter((m) => m !== page) : [...marks, page].sort((a, b) => a - b);
    setMarks(nx); setMeta(`marks|${docId}`, nx).catch(() => {});
  };
  const words = norm(q).split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  const hits = words.length && doc ? (doc.index || []).map((s, i) => (words.every((w) => s.includes(w)) ? i + 1 : 0)).filter(Boolean).slice(0, 60) : [];
  const pct = Math.round((page / total) * 100);
  const bar = { background: 'rgb(var(--cb) / 0.92)', borderColor: 'rgb(var(--c) / 0.25)' };
  const iconBtn = 'p-2 rounded-sm shrink-0';

  return (
    <div ref={rootRef} className="rd-root" role="dialog" aria-label={doc?.title || t('Leitor')}>
      {/* barra de cima */}
      <div className={`rd-bar rd-top ${chrome ? '' : 'rd-hide-top'}`} style={bar}>
        <button type="button" onClick={close} aria-label={t('Fechar leitor')} className={iconBtn} style={btn}><X size={16} /></button>
        <h3 className="flex-1 min-w-0 text-xs font-bold uppercase tracking-wider truncate">{doc?.title || t('A abrir...')}</h3>
        <button type="button" onClick={() => setPanel(panel === 'search' ? null : 'search')} aria-label={t('Procurar neste documento...')} className={iconBtn} style={btn}><Search size={16} /></button>
        <button type="button" onClick={() => setPanel(panel === 'index' ? null : 'index')} aria-label={t('Índice e marcadores')} className={iconBtn} style={btn}><List size={16} /></button>
        <button type="button" onClick={toggleMark} aria-pressed={marks.includes(page)} aria-label={t('Marcar esta página')} className={iconBtn} style={{ ...btn, color: marks.includes(page) ? '#ffaa00' : 'rgb(var(--c))' }}>
          <Star size={16} fill={marks.includes(page) ? '#ffaa00' : 'none'} />
        </button>
        <button type="button" onClick={toggleFs} aria-label={fs ? t('Sair do ecrã inteiro') : t('Ecrã inteiro')} className={iconBtn} style={btn}>{fs ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button>
      </div>

      {/* painéis: pesquisa, índice/marcadores, ajustes */}
      {panel && chrome && (
        <div className="rd-panel" style={bar}>
          {panel === 'search' && (<>
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-sm" style={btn}>
              <Search size={13} />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Procurar neste documento...')} className="flex-1 min-w-0 bg-transparent text-xs" style={{ outline: 'none', color: 'rgb(var(--c))' }} />
            </div>
            {words.length > 0 && <p className="text-[11px] mt-2">{hits.length ? hits.map((h) => <button key={h} type="button" onClick={() => { go(h); setPanel(null); }} className="underline mr-3 mb-1">{unit} {h}</button>) : t('Sem resultados neste documento.')}</p>}
          </>)}
          {panel === 'index' && (<div className="text-[11px]">
            <p className="uppercase tracking-wider mb-1" style={{ color: 'rgb(var(--c) / 0.6)' }}>{t('Marcadores')}</p>
            {marks.length ? marks.map((m) => <button key={m} type="button" onClick={() => { go(m); setPanel(null); }} className="underline mr-3">★ {unit} {m}</button>) : <span style={{ color: 'rgb(var(--c) / 0.5)' }}>{t('Nenhum. Usa a estrela para marcar uma página.')}</span>}
            <p className="uppercase tracking-wider mt-3 mb-1" style={{ color: 'rgb(var(--c) / 0.6)' }}>{t('Índice')}</p>
            {outline.length ? outline.map((o, i) => <button key={i} type="button" onClick={() => { go(o.page); setPanel(null); }} className="block w-full text-left py-1 underline">{o.title} <span style={{ color: 'rgb(var(--c) / 0.55)' }}>· {o.page}</span></button>)
              : <span style={{ color: 'rgb(var(--c) / 0.5)' }}>{t('Este documento não traz índice de capítulos.')}</span>}
          </div>)}
          {panel === 'settings' && (<div className="flex flex-wrap gap-2 text-[11px]">
            {pdf && <>
              <button type="button" onClick={() => { const f = fit === 'width' ? 'height' : 'width'; setFit(f); setZoom(1); save('rd_fit', f); }} className="flex items-center gap-1.5 px-2 py-1.5 rounded-sm" style={btn}><MoveHorizontal size={13} /> {fit === 'width' ? t('Ajustar à largura') : t('Página inteira')}</button>
              <button type="button" onClick={() => { setNight(!night); save('rd_night', night ? '0' : '1'); }} aria-pressed={night} className="flex items-center gap-1.5 px-2 py-1.5 rounded-sm" style={{ ...btn, borderColor: night ? 'rgb(var(--c))' : undefined }}><Moon size={13} /> {t('Modo noite')}</button>
            </>}
            {!pdf && !imgUrl && <>
              <button type="button" onClick={() => { const v = Math.max(12, fontSize - 2); setFontSize(v); save('rd_font', v); }} className="px-2 py-1.5 rounded-sm" style={btn}>A−</button>
              <button type="button" onClick={() => { const v = Math.min(28, fontSize + 2); setFontSize(v); save('rd_font', v); }} className="px-2 py-1.5 rounded-sm" style={btn}>A+</button>
            </>}
            <button type="button" onClick={() => { setInstant(!instant); save('rd_instant', instant ? '0' : '1'); }} aria-pressed={instant} className="flex items-center gap-1.5 px-2 py-1.5 rounded-sm" style={{ ...btn, borderColor: instant ? 'rgb(var(--c))' : undefined }}><Zap size={13} /> {instant ? t('Transição instantânea') : t('Transição suave')}</button>
          </div>)}
        </div>
      )}

      {/* página */}
      <div ref={stageRef} className="rd-stage" onWheel={onWheel} onPointerDown={onPointerDown} onPointerUp={onPointerUp}
        style={{ justifyContent: zoom > 1 ? 'flex-start' : 'center' }}>
        {error && <p className="text-xs p-4" style={{ color: '#ff6600' }}>{error}</p>}
        <div key={page} className={`rd-page ${anim}`}>
          {pdf ? <canvas ref={canvasRef} className="block mx-auto rd-canvas" style={{ filter: night ? 'invert(0.92) hue-rotate(180deg)' : 'none' }} />
            : imgUrl ? <img src={imgUrl} alt={doc?.title || ''} className="block mx-auto" style={{ maxWidth: `${100 * zoom}%`, height: 'auto' }} />
              : doc ? (
                <article className="rd-text" style={{ fontSize }}>
                  {(doc.pages?.[page - 1] || t('Este ficheiro não tem texto extraído.')).split(/\n{2,}/).map((para, i) => {
                    const h = para.match(/^(#{1,3})\s+(.+)/);
                    return h ? <h4 key={i} className={h[1].length === 1 ? 'rd-h1' : 'rd-h2'}>{h[2]}</h4> : <p key={i}>{para}</p>;
                  })}
                </article>
              ) : null}
        </div>
      </div>

      {/* barra de baixo */}
      <div className={`rd-bar rd-bottom ${chrome ? '' : 'rd-hide-bottom'}`} style={bar}>
        <button type="button" onClick={prev} disabled={page <= 1} aria-label={t('Página anterior')} className={`${iconBtn} disabled:opacity-30`} style={btn}><ChevronLeft size={16} /></button>
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <input type="range" min="1" max={total} value={page} onChange={(e) => go(Number(e.target.value))} aria-label={t('Ir para a página')} className="w-full rd-range" />
          <div className="flex justify-between text-[10px] tabular-nums" style={{ color: 'rgb(var(--c) / 0.7)' }}>
            <span>{unit} {page} / {total}</span><span>{pct}%</span>
          </div>
        </div>
        {(pdf || imgUrl) && <>
          <button type="button" onClick={() => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)))} disabled={zoom <= 1} aria-label={t('Reduzir')} className={`${iconBtn} disabled:opacity-30`} style={btn}><ZoomOut size={16} /></button>
          <button type="button" onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))} aria-label={t('Ampliar')} className={iconBtn} style={btn}><ZoomIn size={16} /></button>
        </>}
        <button type="button" onClick={() => setPanel(panel === 'settings' ? null : 'settings')} aria-label={t('Ajustes de leitura')} className={iconBtn} style={btn}>Aa</button>
        <button type="button" onClick={next} disabled={page >= total} aria-label={t('Página seguinte')} className={`${iconBtn} disabled:opacity-30`} style={btn}><ChevronRight size={16} /></button>
      </div>
    </div>
  );
}

// ---------- estante ----------
export default function DocLibrary() {
  const [docs, setDocs] = useState([]);
  const [open, setOpen] = useState(null); // { docId, page }
  const [recent, setRecent] = useState({});
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    const list = await listDocs().catch(() => []);
    setDocs(list);
    const r = {};
    for (const d of list) { const p = await getMeta(`last|${d.id}`).catch(() => null); if (p) r[d.id] = p; }
    setRecent(r);
  }, []);
  useEffect(() => {
    ensureSample().then(load);
    const req = takeOpenRequest(); if (req) setOpen(req);
    return onKbChange(load);
  }, [load]);

  const onFiles = async (files) => {
    const list = [...(files || [])]; if (!list.length) return;
    let ok = 0; let dup = 0; let bad = 0;
    for (const [i, f] of list.entries()) {
      setBusy(t('A importar {a} de {b}: {n}', { a: i + 1, b: list.length, n: f.name }));
      const r = await importFile(f).catch(() => ({ status: 'erro' }));
      if (r.status === 'ok') ok++; else if (r.status === 'duplicado') dup++; else bad++;
    }
    setBusy(''); setMsg([ok && t('{n} importado(s)', { n: ok }), dup && t('{n} já existia(m)', { n: dup }), bad && t('{n} falharam ou não são suportados', { n: bad })].filter(Boolean).join(' · '));
    if (fileRef.current) fileRef.current.value = '';
    load();
  };

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="flex-1 flex items-center gap-2 text-xs uppercase tracking-wider font-bold"><BookOpen size={14} />{' '}{t('Estante')} ({docs.length})</h3>
        <label className="flex items-center gap-1.5 px-2 py-1.5 rounded-sm text-[10px] uppercase tracking-wider cursor-pointer" style={btn}>
          <Upload size={13} /> {t('Importar documentos')}
          <input ref={fileRef} type="file" multiple accept={ACCEPT} className="sr-only" onChange={(e) => onFiles(e.target.files)} />
        </label>
      </div>
      <p className="text-[10px] mb-3" style={{ color: 'rgb(var(--c) / 0.55)' }}>
        {t('PDF, DOCX, TXT, MD, JSON, CSV e XML são lidos e indexados neste dispositivo. A IA pesquisa neles e cita o documento e a página. Toca num documento para o ler em ecrã inteiro.')}
      </p>
      {(busy || msg) && <p className="text-[11px] mb-2" style={{ color: '#ffaa00' }}>{busy || msg}</p>}
      {open && <Reader key={`${open.docId}|${open.page || 0}`} docId={open.docId} startPage={open.page} onClose={() => { setOpen(null); load(); }} />}
      {docs.length === 0 ? (
        <p className="p-3 rounded-sm text-[11px]" style={{ ...box, color: 'rgb(var(--c) / 0.6)' }}>{t('Ainda não há documentos. Usa "Importar documentos" para os juntar à estante.')}</p>
      ) : (
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {docs.map((d) => {
            const total = d.pages?.length || 1; const last = recent[d.id] || 0; const pct = last ? Math.round((last / total) * 100) : 0;
            const summary = (d.pages?.find((p) => p && p.trim().length > 40) || '').replace(/^#+\s*/gm, '').replace(/\s+/g, ' ').slice(0, 150);
            return (
              <li key={d.id}>
                <button type="button" onClick={() => setOpen({ docId: d.id })} className="w-full flex gap-3 p-2.5 rounded-md text-left rd-card"
                  style={{ background: 'linear-gradient(180deg, rgb(var(--cd) / 0.55), rgb(var(--cb) / 0.85))', border: '1px solid rgb(var(--c) / 0.3)', boxShadow: 'inset 0 0 0 1px rgb(0 0 0 / 0.4)' }}>
                  <Cover d={d} />
                  <span className="flex-1 min-w-0 flex flex-col">
                    <span className="text-sm font-bold leading-snug" style={{ color: 'rgb(var(--c))', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{d.title}</span>
                    <span className="text-[10px] mt-0.5 uppercase tracking-wider" style={{ color: 'rgb(var(--c) / 0.6)' }}>
                      {t(d.category)} · {total} {t(d.unit)}{d.size_kb ? ` · ${d.size_kb >= 1024 ? `${(d.size_kb / 1024).toFixed(1)} MB` : `${d.size_kb} KB`}` : ''}
                    </span>
                    {summary && <span className="text-[11px] mt-1 leading-snug" style={{ color: 'rgb(var(--c) / 0.75)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{summary}…</span>}
                    <span className="mt-auto pt-2">
                      <span className="block h-1.5 rounded-sm overflow-hidden" style={{ background: 'rgb(var(--c) / 0.12)' }}>
                        <span className="block h-full" style={{ width: `${pct}%`, background: 'rgb(var(--c))' }} />
                      </span>
                      <span className="flex justify-between text-[10px] mt-1" style={{ color: 'rgb(var(--c) / 0.6)' }}>
                        <span>{last ? t('Lido até {u} {p}', { u: t(d.unit), p: last }) : t('Por ler')}</span>
                        <span>{pct ? `${pct}%` : fmtDate(d.created_date)}</span>
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
