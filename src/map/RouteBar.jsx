// Barra de rota estilo Google Maps por cima do mapa: "De:" (origem) e "Para:" (destino).
// Sincronizada com a rota a pé do mapa: tocar no mapa, num pino, PARTIR DO GPS, DESFAZER, LIMPAR e inverter atualizam os campos.
// Cada campo também se pode editar: escrever uma morada (pesquisa OpenStreetMap ao submeter), escolher um pino ou "A sua localização".
import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpDown, LocateFixed, MapPin, Search, X, Loader2 } from 'lucide-react';
import { searchPlaces } from './geocode';
import { t } from '@/i18n';

const box = { background: 'rgb(var(--cd) / 0.6)', border: '1px solid rgb(var(--c) / 0.25)' };
const fieldBtn = { background: 'rgb(var(--cb) / 0.6)', border: '1px solid rgb(var(--c) / 0.2)', color: 'rgb(var(--c))' };
const optBtn = { background: 'rgb(var(--cd) / 0.98)', borderBottom: '1px solid rgb(var(--c) / 0.12)', color: 'rgb(var(--c))' };
const DOT = ['#22c55e', '#ef4444'];

// Texto a mostrar para um ponto
export const pointText = (p) => (!p ? '' : p.label || `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`);

function Field({ idx, point, pending, pins, getView, onSet, onGps, editing, setEditing }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null); // null = ainda não pesquisou
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);
  const open = editing === idx;
  useEffect(() => { if (open) { setQ(''); setResults(null); setTimeout(() => inputRef.current?.focus(), 30); } }, [open]);

  const label = idx === 0 ? t('De:') : t('Para:');
  const placeholder = idx === 0 ? t('Escolhe a origem (toca no mapa ou pesquisa)') : t('Escolhe o destino (toca no mapa ou pesquisa)');
  const text = pointText(point);
  const pinHits = pins.filter((p) => !q.trim() || `${p.name} ${p.description || ''}`.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 5);

  const search = async (e) => {
    e?.preventDefault();
    if (q.trim().length < 3) { setResults([]); return; }
    setBusy(true); setResults(await searchPlaces(q, getView())); setBusy(false);
  };
  const pick = (p) => { onSet(idx, p); setEditing(null); };

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: DOT[idx], boxShadow: `0 0 6px ${DOT[idx]}` }} aria-hidden="true" />
        <span className="w-11 shrink-0 text-[10px] uppercase tracking-wider font-bold" style={{ color: 'rgb(var(--c) / 0.75)' }}>{label}</span>
        {open ? (
          <form onSubmit={search} className="flex-1 min-w-0 flex items-center gap-1">
            <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} enterKeyHint="search" aria-label={label}
              placeholder={t('Rua, local ou nome de um pino…')} className="flex-1 min-w-0 px-2 py-1.5 rounded-sm text-xs outline-none" style={fieldBtn}
              onKeyDown={(e) => { if (e.key === 'Escape') setEditing(null); }} />
            <button type="submit" aria-label={t('Pesquisar')} className="p-1.5 rounded-sm" style={fieldBtn}>{busy ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}</button>
            <button type="button" onClick={() => setEditing(null)} aria-label={t('Cancelar')} className="p-1.5 rounded-sm" style={fieldBtn}><X size={13} /></button>
          </form>
        ) : (
          <>
            <button type="button" onClick={() => setEditing(idx)} className="flex-1 min-w-0 text-left px-2 py-1.5 rounded-sm text-xs truncate" style={{ ...fieldBtn, color: text ? 'rgb(var(--c))' : 'rgb(var(--c) / 0.45)' }}
              aria-label={`${label} ${text || placeholder}`}>
              {pending && !point?.label ? <><Loader2 size={11} className="inline animate-spin mr-1" />{text}</> : text || placeholder}
            </button>
            {point && <button type="button" onClick={() => onSet(idx, null)} aria-label={t('Limpar {n}', { n: label })} className="p-1.5 rounded-sm shrink-0" style={fieldBtn}><X size={12} /></button>}
          </>
        )}
      </div>

      {open && (
        <div className="absolute left-[4.6rem] right-0 top-full mt-1 z-[1200] rounded-sm overflow-hidden max-h-[45vh] overflow-y-auto" style={{ border: '1px solid rgb(var(--c) / 0.4)', boxShadow: '0 6px 20px #000a' }}>
          <button type="button" onClick={async () => { setBusy(true); const p = await onGps(); setBusy(false); if (p) pick(p); }} className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs" style={optBtn}>
            <LocateFixed size={13} /> {t('A sua localização')}
          </button>
          {pinHits.map((p) => (
            <button key={p.id} type="button" onClick={() => pick({ lat: p.lat, lng: p.lng, label: p.name, kind: 'pin' })} className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs" style={optBtn}>
              <MapPin size={13} style={{ color: p.color }} /> <span className="truncate">{p.name}</span><span className="ml-auto text-[9px] opacity-50 uppercase">{t('pino')}</span>
            </button>
          ))}
          {results?.map((r, i) => (
            <button key={`${r.lat},${r.lng},${i}`} type="button" onClick={() => pick({ lat: r.lat, lng: r.lng, label: r.label, kind: 'search' })} className="w-full flex flex-col px-3 py-2 text-left text-xs" style={optBtn}>
              <span className="truncate">{r.label}</span>{r.sub && <span className="text-[10px] opacity-60 truncate">{r.sub}</span>}
            </button>
          ))}
          {results && !results.length && !busy && (
            <p className="px-3 py-2 text-[11px]" style={{ ...optBtn, color: 'rgb(var(--c) / 0.6)' }}>
              {navigator.onLine === false ? t('Sem rede: escolhe um pino, a tua localização ou toca no mapa.') : q.trim().length < 3 ? t('Escreve pelo menos 3 letras e toca na lupa.') : t('Sem resultados para «{q}».', { q: q.trim() })}
            </p>
          )}
          {!results && <p className="px-3 py-2 text-[10px]" style={{ ...optBtn, color: 'rgb(var(--c) / 0.5)' }}>{t('Escreve uma morada e toca na lupa, ou escolhe uma opção acima.')}</p>}
        </div>
      )}
    </div>
  );
}

export default function RouteBar({ ends, pending, pins, getView, onSet, onSwap, onGps }) {
  const [editing, setEditing] = useState(null); // 0 = De, 1 = Para
  return (
    <div className="flex items-stretch gap-2 p-2 rounded-sm mb-3" style={box} aria-label={t('Rota: origem e destino')}>
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        {[0, 1].map((i) => <Field key={i} idx={i} point={ends[i]} pending={pending[i]} pins={pins} getView={getView} onSet={onSet} onGps={onGps} editing={editing} setEditing={setEditing} />)}
      </div>
      <button type="button" onClick={onSwap} disabled={!ends[0] && !ends[1]} aria-label={t('Inverter origem e destino')} className="px-2 rounded-sm disabled:opacity-30" style={fieldBtn}><ArrowUpDown size={15} /></button>
    </div>
  );
}
