// "Meus ativos": 6 espaços personalizáveis de ativos/indicadores de investimento (aba ECONOMIA).
//  - espaço vazio: "+" -> formulário (categoria, nome, link e, sem cotação automática, valor e variação manuais)
//  - toque curto num ativo: abre o link numa nova aba
//  - manter premido mais de 5 s: apaga o ativo (barra de progresso a encher como aviso)
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, X, Save, Pencil, TrendingUp, TrendingDown } from 'lucide-react';
import { CATEGORIES, catById, loadSlots, saveSlots, fetchQuote, currencyOf, fmtNum, SLOTS } from './watchlist';
import { reportEconomy, onEconomyRefresh, onAddAssetRequest } from './economyTools';
import { t, locale } from '@/i18n';

const HOLD_MS = 5000;  // pressão longa para apagar
const TAP_MS = 450;    // até aqui conta como toque curto (abre o link)
const card = { background: 'rgb(var(--cd) / 0.35)', border: '1px solid rgb(var(--c) / 0.25)' };
const field = { background: 'rgb(var(--cb) / 0.85)', border: '1px solid rgb(var(--c) / 0.3)', color: 'rgb(var(--c))', outline: 'none' };
const time = (ms) => new Date(ms).toLocaleTimeString(locale(), { hour12: false });

function AssetCard({ a, onOpen, onDelete, onEdit }) {
  const [hold, setHold] = useState(false);
  const t0 = useRef(0); const timer = useRef(null); const fired = useRef(false); const start = useRef(null);
  const cancel = () => { clearTimeout(timer.current); setHold(false); };
  const down = (e) => {
    if (e.button && e.button !== 0) return;
    fired.current = false; t0.current = Date.now(); start.current = { x: e.clientX, y: e.clientY }; setHold(true);
    timer.current = setTimeout(() => { fired.current = true; setHold(false); if (navigator.vibrate) navigator.vibrate(60); onDelete(); }, HOLD_MS);
  };
  const up = () => {
    if (!hold && !fired.current) return;
    const dt = Date.now() - t0.current; cancel();
    if (!fired.current && dt < TAP_MS) onOpen(); // toque curto -> link; entre 0,45 s e 5 s não faz nada
  };
  const moved = (e) => { if (start.current && hold && Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 12) cancel(); }; // deslizar a página cancela
  const q = a.quote || (a.manual?.price != null ? { price: a.manual.price, pct: a.manual.pct ?? 0, change: a.manual.price - a.manual.price / (1 + (a.manual.pct ?? 0) / 100), at: a.manual.at, auto: false } : null);
  const up_ = (q?.pct ?? 0) >= 0;
  const color = !q ? 'rgb(var(--c) / 0.5)' : up_ ? 'rgb(var(--c))' : '#ef4444';
  const cat = catById[a.category];
  return (
    <div role="button" tabIndex={0} aria-label={t('{n}: toque para abrir, manter 5 segundos para apagar', { n: a.name })}
      onPointerDown={down} onPointerUp={up} onPointerLeave={cancel} onPointerCancel={cancel} onPointerMove={moved}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen(); if (e.key === 'Delete') onDelete(); }}
      onContextMenu={(e) => e.preventDefault()}
      className="relative p-3 rounded-sm overflow-hidden select-none cursor-pointer flex flex-col min-h-[132px]"
      style={{ ...card, borderColor: hold ? '#ef4444aa' : card.border.split(' ').slice(2).join(' '), touchAction: 'manipulation', WebkitTouchCallout: 'none' }}>
      <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onEdit(); }} aria-label={t('Editar {n}', { n: a.name })}
        className="absolute top-1.5 right-1.5 p-1 rounded-sm" style={{ color: 'rgb(var(--c) / 0.5)' }}><Pencil size={11} /></button>
      <p className="text-[11px] font-bold leading-tight pr-5" style={{ color: 'rgb(var(--c))', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{a.name}</p>
      <p className="text-[9px] uppercase tracking-wider mt-0.5 truncate" style={{ color: 'rgb(var(--c) / 0.5)' }}>{t(cat?.label || '')} · {currencyOf(a.name)}</p>
      <p className="text-xl font-bold tabular-nums mt-auto pt-2" style={{ color: 'rgb(var(--c))', textShadow: '0 0 8px rgb(var(--c) / 0.35)' }}>{q ? fmtNum(q.price, q.price >= 1000 ? 1 : 2) : '—'}</p>
      <p className="flex items-center gap-1 text-[11px] tabular-nums font-bold" style={{ color }}>
        {q ? <>{up_ ? '+' : ''}{fmtNum(q.change, 2)} ({up_ ? '+' : ''}{fmtNum(q.pct, 2)}%) {up_ ? <TrendingUp size={12} /> : <TrendingDown size={12} />}</> : t('sem cotação: edita para pôr o valor')}
      </p>
      <p className="text-[9px] mt-1 uppercase tracking-wider" style={{ color: 'rgb(var(--c) / 0.45)' }}>
        {q ? `${q.auto ? t('Dados atuais') : t('Valor manual')} · ${time(q.at)}` : t('Risco: {r}', { r: t(cat?.risk || '—') })}
      </p>
      {/* aviso da pressão longa: barra vermelha que enche em 5 s */}
      <span className="absolute left-0 bottom-0 h-1" style={{ background: '#ef4444', width: hold ? '100%' : '0%', transition: hold ? `width ${HOLD_MS}ms linear` : 'none', boxShadow: '0 0 8px #ef4444' }} />
      {hold && <span className="absolute inset-x-0 top-0 text-center text-[9px] uppercase tracking-widest py-0.5" style={{ background: '#ef444422', color: '#ef4444' }}>{t('Manter para apagar…')}</span>}
    </div>
  );
}

function AssetForm({ initial, onSave, onClose }) {
  const [category, setCategory] = useState(initial?.category || 'cripto');
  const [name, setName] = useState(initial?.name || '');
  const [link, setLink] = useState(initial?.link || '');
  const [price, setPrice] = useState(initial?.manual?.price ?? '');
  const [pct, setPct] = useState(initial?.manual?.pct ?? '');
  const cat = catById[category];
  const okLink = !link || /^https?:\/\/\S+\.\S+/.test(link.trim());
  const ok = name.trim() && okLink;
  const num = (v) => (v === '' || v == null ? null : Number(String(v).replace(/\s/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.')));
  const save = () => {
    if (!ok) return;
    const p = num(price); const c = num(pct);
    onSave({ category, name: name.trim(), link: link.trim(), manual: Number.isFinite(p) ? { price: p, pct: Number.isFinite(c) ? c : 0, at: Date.now() } : null });
  };
  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-3" style={{ background: '#000000b3' }} role="dialog" aria-modal="true" aria-label={t('Adicionar ativo')} onClick={onClose}>
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto p-4 rounded-sm" style={{ background: 'rgb(var(--cd))', border: '1px solid rgb(var(--c) / 0.6)', boxShadow: '0 0 18px rgb(var(--c) / 0.3)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-3">
          <Plus size={15} /><h3 className="flex-1 text-xs uppercase tracking-wider font-bold">{initial ? t('Editar ativo') : t('Adicionar ativo')}</h3>
          <button type="button" onClick={onClose} aria-label={t('Fechar')} className="p-1 rounded-sm" style={{ border: '1px solid rgb(var(--c) / 0.3)' }}><X size={13} /></button>
        </div>
        <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: 'rgb(var(--c) / 0.6)' }}>{t('Categoria')}</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-2 mb-1 rounded-sm text-xs" style={field}>
          {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{t(c.label)} — {t('Risco: {r}', { r: t(c.risk) })}</option>)}
        </select>
        <p className="text-[10px] mb-3" style={{ color: 'rgb(var(--c) / 0.55)' }}>{t('Ex.:')} {t(cat.ex)}</p>
        <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: 'rgb(var(--c) / 0.6)' }}>{t('Nome do ativo')}</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="BTC/USD - Bitcoin Dólar Americano" className="w-full p-2 mb-3 rounded-sm text-xs" style={field} autoFocus />
        <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: 'rgb(var(--c) / 0.6)' }}>{t('Link')}</label>
        <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://pt.investing.com/crypto/bitcoin/btc-usd" inputMode="url" className="w-full p-2 mb-1 rounded-sm text-xs" style={{ ...field, borderColor: okLink ? field.border.split(' ').slice(2).join(' ') : '#ef4444' }} />
        {!okLink && <p className="text-[10px] mb-2" style={{ color: '#ef4444' }}>{t('O link tem de começar por https://')}</p>}
        <p className="text-[10px] mb-3 mt-2" style={{ color: 'rgb(var(--c) / 0.55)' }}>
          {category === 'cripto' ? t('Criptoativos: a cotação atualiza sozinha (CoinGecko). O valor manual só é usado se a cotação falhar.') : t('Este tipo de ativo não tem cotação pública gratuita que a app possa ler: escreve o valor e a variação (podes editar quando quiseres).')}
        </p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div>
            <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: 'rgb(var(--c) / 0.6)' }}>{t('Valor atual')}</label>
            <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="61468,0" inputMode="decimal" className="w-full p-2 rounded-sm text-xs" style={field} />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: 'rgb(var(--c) / 0.6)' }}>{t('Variação %')}</label>
            <input value={pct} onChange={(e) => setPct(e.target.value)} placeholder="+1,10" inputMode="decimal" className="w-full p-2 rounded-sm text-xs" style={field} />
          </div>
        </div>
        <button type="button" onClick={save} disabled={!ok} className="w-full flex items-center justify-center gap-2 py-2 rounded-sm text-xs uppercase tracking-wider font-bold disabled:opacity-40"
          style={{ background: 'rgb(var(--c) / 0.16)', border: '1px solid rgb(var(--c))', color: 'rgb(var(--c))' }}>
          <Save size={13} /> {t('Guardar')}
        </button>
      </div>
    </div>
  );
}

export default function Watchlist() {
  const [slots, setSlots] = useState(loadSlots);
  const [form, setForm] = useState(null); // índice do espaço em edição
  const [msg, setMsg] = useState('');
  const update = useCallback((fn) => setSlots((prev) => { const next = fn(prev.slice()); saveSlots(next); return next; }), []);
  useEffect(() => { reportEconomy({ freeSlots: slots.filter((s) => !s).length }); }, [slots]);

  // cotações (só criptoativos têm automática); sobe também com o menu ≡ > ATUALIZAR DADOS e a cada 60 s
  const refresh = useCallback(async () => {
    const cur = loadSlots();
    const res = await Promise.all(cur.map((a) => (a ? fetchQuote(a).catch(() => null) : null)));
    if (res.some(Boolean)) update((prev) => prev.map((a, i) => (a && res[i] ? { ...a, coinId: res[i].coinId, quote: res[i] } : a)));
  }, [update]);
  useEffect(() => { refresh(); const id = setInterval(refresh, 60000); return () => clearInterval(id); }, [refresh]);
  useEffect(() => onEconomyRefresh(refresh), [refresh]);
  // menu ≡ > MEUS ATIVOS > ADICIONAR: abre o formulário no primeiro espaço livre
  useEffect(() => onAddAssetRequest(() => {
    const i = loadSlots().findIndex((s) => !s);
    if (i < 0) setMsg(t('Os 6 espaços estão ocupados. Mantém um ativo premido 5 segundos para o apagar.')); else setForm(i);
  }), []);

  const saveAt = (i, data) => {
    update((prev) => { prev[i] = { ...(prev[i] || {}), ...data, quote: prev[i]?.name === data.name ? prev[i]?.quote : null, coinId: prev[i]?.name === data.name ? prev[i]?.coinId : undefined }; return prev; });
    setForm(null); setTimeout(refresh, 50);
  };
  const remove = (i) => { const n = slots[i]?.name; update((prev) => { prev[i] = null; return prev; }); setMsg(t('«{n}» apagado.', { n })); setTimeout(() => setMsg(''), 3000); };
  const open = (a) => { if (a.link) window.open(a.link, '_blank', 'noopener,noreferrer'); else setMsg(t('Este ativo não tem link. Toca no lápis para o acrescentar.')); };

  return (
    <section id="eco-ativos" className="mb-4 rounded-sm scroll-mt-20" aria-label={t('Meus ativos')}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] uppercase tracking-wider" style={{ color: 'rgb(var(--c) / 0.45)' }}>{t('Meus ativos')} ({SLOTS - slots.filter((s) => !s).length}/{SLOTS})</p>
        <p className="text-[9px]" style={{ color: 'rgb(var(--c) / 0.4)' }}>{t('toque: abrir · manter 5 s: apagar')}</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {slots.map((a, i) => (a ? (
          <AssetCard key={i} a={a} onOpen={() => open(a)} onDelete={() => remove(i)} onEdit={() => setForm(i)} />
        ) : (
          <button key={i} type="button" onClick={() => setForm(i)} aria-label={t('Adicionar ativo no espaço {n}', { n: i + 1 })}
            className="flex items-center justify-center rounded-sm min-h-[132px]" style={{ background: 'rgb(var(--cd) / 0.2)', border: '1px dashed rgb(var(--c) / 0.3)', color: 'rgb(var(--c) / 0.55)' }}>
            <Plus size={26} />
          </button>
        )))}
      </div>
      {msg && <p role="status" className="text-[11px] mt-2" style={{ color: '#ffaa00' }}>{msg}</p>}
      {form != null && <AssetForm initial={slots[form]} onSave={(d) => saveAt(form, d)} onClose={() => setForm(null)} />}
    </section>
  );
}
