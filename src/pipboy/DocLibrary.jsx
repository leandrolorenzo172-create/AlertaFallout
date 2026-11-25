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

## Consulta

Os manuais são para consultar muitas vezes: ao abrir, o leitor volta à última página que viste. Para saltar para outra página, escreve o número na barra de baixo.`;

import { ensureGuide, isGuide } from '@/lib/guide';
export { isGuide };
// o guia do sistema primeiro, depois os outros pela data
const shelfOrder = (list) => [...list].sort((a, b) => (isGuide(b) - isGuide(a)) || b.created_date.localeCompare(a.created_date));

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

// ---------- folha a virar (efeito de livro) ----------
// Por baixo fica a página que vai aparecer; por cima, a folha roda em 3D presa ao lado esquerdo (lombada),
// com o verso em papel e sombras que acompanham a curva.
function FlipLayer({ flip, night, renderText, stageRef }) {
  const st = stageRef.current; const SW = st?.clientWidth || 360; const SH = st?.clientHeight || 600;
  const isPdf = !!flip.cur;
  const w = isPdf ? flip.w : Math.min(SW, 680); const h = isPdf ? flip.h : SH;
  const left = Math.max(0, (SW - w) / 2) + (st?.scrollLeft || 0); const top = isPdf ? Math.max(0, (SH - h) / 2) : 0;
  // seguinte: a folha atual roda de 0 até -180°; anterior: a folha anterior volta de -180° até 0
  const angle = flip.dir === 1 ? -180 * flip.p : -180 * (1 - flip.p);
  const lift = Math.sin((Math.abs(angle) * Math.PI) / 180); // 0 → 1 → 0 ao meio da volta
  const tr = flip.anim ? 'transform .34s cubic-bezier(.3,.7,.3,1), box-shadow .34s' : 'none';
  const filter = night ? 'invert(0.92) hue-rotate(180deg)' : 'none';
  const face = (src, n) => (isPdf ? <img src={src} alt="" draggable={false} style={{ width: w, height: h, display: 'block', filter }} />
    : <div style={{ width: w, height: h, overflow: 'hidden', background: 'rgb(var(--cb))' }}>{renderText(n)}</div>);
  const under = flip.dir === 1 ? face(flip.nb, flip.target) : face(flip.cur, flip.target + 1);
  const turning = flip.dir === 1 ? face(flip.cur, flip.target - 1) : face(flip.nb, flip.target);
  return (
    <div className="rd-flip" style={{ width: SW, height: SH }}>
      <div style={{ position: 'absolute', left, top, width: w, height: h, perspective: 2200 }}>
        <div style={{ position: 'absolute', inset: 0 }}>{under}
          {/* sombra projetada pela folha sobre a página de baixo */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `linear-gradient(90deg, rgba(0,0,0,${0.55 * lift}) 0%, rgba(0,0,0,0) ${30 + 60 * (1 - lift)}%)` }} />
        </div>
        <div style={{ position: 'absolute', inset: 0, transformOrigin: 'left center', transformStyle: 'preserve-3d', transform: `rotateY(${angle}deg)`, transition: tr,
          boxShadow: `${-20 * lift}px 0 ${30 * lift}px rgba(0,0,0,${0.5 * lift})` }}>
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>{turning}
            {/* curva da folha: escurece junto à lombada e brilha na dobra */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `linear-gradient(90deg, rgba(0,0,0,${0.35 * lift}) 0%, rgba(255,255,255,${0.12 * lift}) 70%, rgba(0,0,0,${0.25 * lift}) 100%)` }} />
          </div>
          {/* verso da folha: papel */}
          <div style={{ position: 'absolute', inset: 0, transform: 'rotateY(180deg)', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
            background: isPdf ? (night ? '#1d1d1d' : 'linear-gradient(90deg,#d9d4c7,#f4f0e6 40%,#e6e1d4)') : 'linear-gradient(90deg, rgb(var(--cd)), rgb(var(--cb)))' }} />
        </div>
      </div>
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
  // imagem de uma página do PDF ao tamanho do ecrã (cache), usada na animação de virar a folha
  const snaps = useRef(new Map());
  const sizeRef = useRef({ css: 1, w: 0, h: 0 });
  const [drawn, setDrawn] = useState(0);
  const snap = useCallback(async (n, css) => {
    if (!pdf || n < 1 || n > pdf.numPages) return null;
    const key = `${n}|${css.toFixed(4)}`;
    if (snaps.current.has(key)) return snaps.current.get(key);
    const job = (async () => {
      const pg = await pdf.getPage(n); const dpr = Math.min(window.devicePixelRatio || 1, 1.6);
      const vp = pg.getViewport({ scale: css * dpr });
      const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
      await pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
      return c.toDataURL('image/jpeg', 0.85);
    })();
    snaps.current.set(key, job);
    if (snaps.current.size > 12) snaps.current.delete(snaps.current.keys().next().value);
    return job;
  }, [pdf]);

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
    sizeRef.current = { css, w: Math.round(base.width * css), h: Math.round(base.height * css) };
    await p.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise.catch(() => {});
    setDrawn(page);
    // páginas vizinhas já desenhadas em imagem, para a folha virar sem esperas
    for (const n of [page + 1, page - 1]) snap(n, css).catch(() => {});
  }, [pdf, page, zoom, fit]);
  useEffect(() => { draw(); }, [draw, fs, chrome]);
  useEffect(() => { const r = () => draw(); window.addEventListener('resize', r); return () => window.removeEventListener('resize', r); }, [draw]);

  useEffect(() => { if (doc) setMeta(`last|${docId}`, page).catch(() => {}); }, [doc, docId, page]); // progresso
  useEffect(() => { if (stageRef.current) stageRef.current.scrollTo(0, 0); }, [page]);

  // ---- virar a folha como num livro: a folha roda presa à lombada (lado esquerdo), com sombra; a seguinte aparece por baixo
  // flip = { dir: 1 (seguinte) | -1 (anterior), p: 0..1 progresso, cur, nb (imagens), anim: true quando está a acabar sozinha }
  const [flip, setFlip] = useState(null);
  const flipRef = useRef(null); flipRef.current = flip;
  const isText = !pdf && !imgUrl;
  const startFlip = useCallback(async (dir) => {
    const target = page + dir;
    if (target < 1 || target > total) return null;
    if (isText) { const f = { dir, p: 0, target }; setFlip(f); return f; }
    if (!pdf) return null;
    const css = sizeRef.current.css;
    const cur = canvasRef.current ? canvasRef.current.toDataURL('image/jpeg', 0.85) : await snap(page, css);
    const nb = await snap(target, css);
    const f = { dir, p: 0, target, cur, nb, w: sizeRef.current.w, h: sizeRef.current.h }; setFlip(f); return f;
  }, [page, total, pdf, isText, snap]);
  // termina a folha: completa (vira) ou volta para trás
  const finishFlip = useCallback((complete) => {
    const f = flipRef.current; if (!f) return;
    setFlip({ ...f, p: complete ? 1 : 0, anim: true });
    setTimeout(() => {
      if (complete) { setPage(f.target); if (isText) setFlip(null); } else setFlip(null);
    }, 340);
  }, [isText]);
  // a folha só sai depois de a página nova estar desenhada (sem piscar)
  useEffect(() => { if (flip && flip.anim && flip.p === 1 && (isText || drawn === flip.target)) setTimeout(() => setFlip(null), 30); }, [drawn, flip, isText]);

  const go = useCallback(async (n, dir) => {
    const nx = Math.min(total, Math.max(1, n || 1));
    if (nx === page || flipRef.current) return;
    if (!instant && dir && Math.abs(nx - page) === 1 && zoom <= 1) {
      const f = await startFlip(dir);
      if (f) { requestAnimationFrame(() => requestAnimationFrame(() => finishFlip(true))); return; }
    }
    setPage(nx);
  }, [total, page, instant, zoom, startFlip, finishFlip]);
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
  // O botão "voltar" do telemóvel/navegador fecha só o leitor (fica no Manual), em vez de mudar de separador.
  const closedRef = useRef(false);
  const onCloseRef = useRef(onClose); onCloseRef.current = onClose;
  useEffect(() => {
    window.history.pushState({ ...(window.history.state || {}), sdReader: 1 }, '', window.location.href);
    const onPop = () => { if (closedRef.current) return; closedRef.current = true; if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); onCloseRef.current(); };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const close = () => {
    if (closedRef.current) return; closedRef.current = true;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    if (window.history.state?.sdReader) window.history.back(); // retira a entrada do leitor sem sair do Manual
    onClose();
  };

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
  // A folha acompanha o dedo: arrastar para a esquerda vira para a seguinte, para a direita volta à anterior.
  const touch = useRef(null);
  const zoomedNow = () => { const el = stageRef.current; return zoom > 1.05 && el && el.scrollWidth > el.clientWidth + 4; };
  const gStart = (x, y) => { if (flipRef.current?.anim) return; touch.current = { x, y, t: Date.now(), mode: null, starting: false }; };
  const gMove = (x, y) => {
    const s = touch.current; if (!s || zoomedNow() || instant) return;
    const dx = x - s.x; const dy = y - s.y;
    if (!s.mode) {
      if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        s.mode = 'flip'; s.starting = true;
        startFlip(dx < 0 ? 1 : -1).then((f) => { s.starting = false; if (!f) s.mode = 'none'; });
      } else if (Math.abs(dy) > 12) s.mode = 'none';
      return;
    }
    const f = flipRef.current;
    if (s.mode === 'flip' && f && !f.anim) {
      const W = stageRef.current?.clientWidth || window.innerWidth;
      const p = Math.max(0, Math.min(1, (f.dir === 1 ? -dx : dx) / (W * 0.9)));
      setFlip({ ...f, p });
    }
  };
  const gEnd = (x, y) => {
    const s = touch.current; touch.current = null; if (!s) return;
    const dx = x - s.x; const dy = y - s.y; const dt = Date.now() - s.t;
    if (s.mode === 'flip') {
      const f = flipRef.current;
      if (f && !f.anim) { const fast = Math.abs(dx) / Math.max(dt, 1) > 0.5; finishFlip(f.p > 0.3 || (fast && Math.abs(dx) > 40)); }
      else if (!f && instant === false && s.starting) setTimeout(() => { const g = flipRef.current; if (g && !g.anim) finishFlip(true); }, 120);
      return;
    }
    if (instant && !zoomedNow() && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) { if (dx < 0) next(); else prev(); return; }
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && dt < 500) {
      const w = window.innerWidth;
      if (x < w * 0.28) prev(); else if (x > w * 0.72) next(); else setChrome((c) => !c);
    }
  };
  const onTouchStart = (e) => { const tt = e.touches[0]; if (e.touches.length === 1) gStart(tt.clientX, tt.clientY); else touch.current = null; };
  const onTouchMove = (e) => { const tt = e.touches[0]; if (tt) gMove(tt.clientX, tt.clientY); };
  const onTouchEnd = (e) => { const tt = e.changedTouches[0]; if (tt) gEnd(tt.clientX, tt.clientY); };
  const onPointerDown = (e) => { if (e.pointerType === 'mouse' && e.button === 0) gStart(e.clientX, e.clientY); };
  const onPointerMove = (e) => { if (e.pointerType === 'mouse' && touch.current) gMove(e.clientX, e.clientY); };
  const onPointerUp = (e) => { if (e.pointerType === 'mouse') gEnd(e.clientX, e.clientY); };

  const renderText = (n) => (
    <article className="rd-text" style={{ fontSize }}>
      {(doc?.pages?.[n - 1] || t('Este ficheiro não tem texto extraído.')).split(/\n{2,}/).map((para, i) => {
        const h = para.match(/^(#{1,3})\s+(.+)/);
        return h ? <h4 key={i} className={h[1].length === 1 ? 'rd-h1' : 'rd-h2'}>{h[2]}</h4> : <p key={i}>{para}</p>;
      })}
    </article>
  );

  const toggleMark = () => {
    const nx = marks.includes(page) ? marks.filter((m) => m !== page) : [...marks, page].sort((a, b) => a - b);
    setMarks(nx); setMeta(`marks|${docId}`, nx).catch(() => {});
  };
  const words = norm(q).split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  const hits = words.length && doc ? (doc.index || []).map((s, i) => (words.every((w) => s.includes(w)) ? i + 1 : 0)).filter(Boolean).slice(0, 60) : [];
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
      <div ref={stageRef} className="rd-stage" onWheel={onWheel} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
        style={{ justifyContent: zoom > 1 ? 'flex-start' : 'center', touchAction: zoom > 1.05 ? 'pan-x pan-y' : 'pan-y' }}>
        {error && <p className="text-xs p-4" style={{ color: '#ff6600' }}>{error}</p>}
        {flip && <FlipLayer flip={flip} night={night} renderText={(n) => renderText(n)} stageRef={stageRef} />}
        <div key={page} className={`rd-page ${anim}`} style={{ visibility: flip ? 'hidden' : 'visible' }}>
          {pdf ? <canvas ref={canvasRef} className="block mx-auto rd-canvas" style={{ filter: night ? 'invert(0.92) hue-rotate(180deg)' : 'none' }} />
            : imgUrl ? <img src={imgUrl} alt={doc?.title || ''} className="block mx-auto" style={{ maxWidth: `${100 * zoom}%`, height: 'auto' }} />
              : doc ? renderText(page) : null}
        </div>
      </div>

      {/* barra de baixo */}
      <div className={`rd-bar rd-bottom ${chrome ? '' : 'rd-hide-bottom'}`} style={bar}>
        <button type="button" onClick={prev} disabled={page <= 1} aria-label={t('Página anterior')} className={`${iconBtn} disabled:opacity-30`} style={btn}><ChevronLeft size={16} /></button>
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <form className="flex items-center justify-center gap-1.5 text-xs tabular-nums" style={{ color: 'rgb(var(--c) / 0.8)' }}
            onSubmit={(e) => { e.preventDefault(); const n = Number(e.currentTarget.elements.pg.value); if (n) go(n); e.currentTarget.elements.pg.blur(); }}>
            <span>{unit}</span>
            <input key={page} name="pg" type="number" inputMode="numeric" min="1" max={total} defaultValue={page} aria-label={t('Ir para a página')}
              onBlur={(e) => { const n = Number(e.target.value); if (n && n !== page) go(n); }}
              className="w-14 text-center rounded-sm py-1 bg-transparent outline-none" style={{ border: '1px solid rgb(var(--c) / 0.4)', color: 'rgb(var(--c))' }} />
            <span>/ {total}</span>
          </form>
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
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    const list = await listDocs().catch(() => []);
    setDocs(shelfOrder(list));
  }, []);
  useEffect(() => {
    ensureSample().then(load); ensureGuide().then(load);
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
            const total = d.pages?.length || 1; 
            const summary = isGuide(d)
              ? t('Manual de campo completo: abrigos, armadilhas, armas, caça e pesca, água, fogo (12 métodos), plantas, árvores, alimentos, medicina, orientação no Minho, nós e mais 6 módulos')
              : (d.pages?.find((p) => p && p.trim().length > 40) || '').replace(/^#+\s*/gm, '').replace(/\s+/g, ' ').slice(0, 150);
            return (
              <li key={d.id}>
                <button type="button" onClick={() => setOpen({ docId: d.id })} className="w-full flex gap-3 p-2.5 rounded-md text-left rd-card"
                  style={{ background: 'linear-gradient(180deg, rgb(var(--cd) / 0.55), rgb(var(--cb) / 0.85))', border: '1px solid rgb(var(--c) / 0.3)', boxShadow: 'inset 0 0 0 1px rgb(0 0 0 / 0.4)' }}>
                  <Cover d={d} />
                  <span className="flex-1 min-w-0 flex flex-col">
                    {isGuide(d) && <span className="self-start text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 mb-1 rounded-sm" style={{ background: 'rgb(var(--c))', color: 'rgb(var(--cb))' }}>{t('eBook do sistema')}</span>}
                    <span className="text-sm font-bold leading-snug" style={{ color: 'rgb(var(--c))', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{d.title}</span>
                    {d.author && <span className="text-[10px] uppercase tracking-wider" style={{ color: 'rgb(var(--c) / 0.75)' }}>{d.author}</span>}
                    <span className="text-[10px] mt-0.5 uppercase tracking-wider" style={{ color: 'rgb(var(--c) / 0.6)' }}>
                      {t(d.category)} · {total} {t(d.unit)}{d.size_kb ? ` · ${d.size_kb >= 1024 ? `${(d.size_kb / 1024).toFixed(1)} MB` : `${d.size_kb} KB`}` : ''}
                    </span>
                    {summary && <span className="text-[11px] mt-1 leading-snug" style={{ color: 'rgb(var(--c) / 0.75)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{summary}…</span>}
                    <span className="mt-auto pt-2 text-[10px]" style={{ color: 'rgb(var(--c) / 0.55)' }}>{isGuide(d) ? t('18 módulos · sempre disponível offline') : fmtDate(d.created_date)}</span>
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
