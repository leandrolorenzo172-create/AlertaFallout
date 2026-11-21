// Separador Greves: índice que sobe com o número de greves noticiadas no ano, por setor, com a lista do ano.
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Megaphone } from 'lucide-react';
import ThreatGauge from '../pipboy/ThreatGauge';
import { fetchStrikes } from '../api/liveData';
import { card, Loading, Header, ErrorBox, Stat, NewsItem } from './IndicatorParts';

export default function StrikesTab() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sector, setSector] = useState('Todos');
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(await fetchStrikes()); } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const sectors = useMemo(() => Object.entries(data?.bySector || {}).sort((a, b) => b[1] - a[1]), [data]);
  const list = useMemo(() => (data?.items || []).filter((x) => sector === 'Todos' || x.sector === sector), [data, sector]);

  if (loading && !data) return <div className="p-4"><Header icon={Megaphone} title="Greves" /><Loading text="A contar greves do ano..." /></div>;
  if (!data) return <div className="p-4"><Header icon={Megaphone} title="Greves" onRefresh={load} /><ErrorBox text={error} /></div>;

  const since = new Date(data.since).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const maxSector = Math.max(1, ...sectors.map((s) => s[1]));

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <Header icon={Megaphone} title={`Greves ${data.year}`} onRefresh={load} />
      <div className="p-4 rounded-sm mb-4" style={card}>
        <ThreatGauge label="✊ Índice de greves" value={data.level || 0} />
        <p className="text-xs" style={{ color: 'rgb(var(--c) / 0.75)' }}>
          <b>{data.count}</b> greves noticiadas em {data.year}. O índice chega a 10 com {data.reference} greves no ano.
        </p>
      </div>
      {/* Próximas greves com dia marcado (as mesmas que geram os avisos) */}
      {(data.upcoming || []).filter((u) => u.sector !== 'Internacional').length > 0 && (
        <div className="p-4 rounded-sm mb-4" style={{ ...card, border: '1px solid #ffaa0055' }}>
          <p className="text-[10px] uppercase tracking-wider mb-2 font-bold" style={{ color: '#ffaa00' }}>Próximas greves</p>
          {data.upcoming.filter((u) => u.sector !== 'Internacional').map((u) => {
            const f = (d) => d.split('-').reverse().join('/');
            const when = u.days.length > 1 ? `${f(u.days[0])} a ${f(u.days[u.days.length - 1])}` : f(u.days[0]);
            return (
              <a key={u.id} href={u.url || undefined} target="_blank" rel="noreferrer" className="block mb-2 last:mb-0">
                <p className="text-xs font-bold" style={{ color: 'rgb(var(--c) / 0.9)' }}>📅 {when} · {u.sector}</p>
                <p className="text-[11px] leading-snug" style={{ color: 'rgb(var(--c) / 0.6)' }}>{u.title}</p>
              </a>
            );
          })}
        </div>
      )}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <Stat label="No ano" value={data.count} sub={`desde ${since}`} />
        <Stat label="30 dias" value={data.last30} sub="mais recentes" />
        <Stat label="Setores" value={sectors.length} sub={sectors[0] ? `mais: ${sectors[0][0]}` : '—'} />
      </div>
      {sectors.length > 0 && (
        <div className="p-4 rounded-sm mb-4" style={card}>
          <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'rgb(var(--c) / 0.45)' }}>Por setor</p>
          {sectors.map(([name, n]) => (
            <button key={name} type="button" onClick={() => setSector(sector === name ? 'Todos' : name)} className="w-full flex items-center gap-2 mb-1.5 text-left">
              <span className="text-[11px] w-28 shrink-0" style={{ color: sector === name ? 'rgb(var(--c))' : 'rgb(var(--c) / 0.7)', fontWeight: sector === name ? 700 : 400 }}>{name}</span>
              <span className="flex-1 h-3 rounded-sm overflow-hidden" style={{ background: 'rgb(var(--cd))', border: '1px solid rgb(var(--c) / 0.15)' }}>
                <span className="block h-full" style={{ width: `${(n / maxSector) * 100}%`, background: 'rgb(var(--c) / 0.7)' }} />
              </span>
              <span className="text-[11px] w-8 text-right tabular-nums">{n}</span>
            </button>
          ))}
          <p className="text-[10px] mt-2" style={{ color: 'rgb(var(--c) / 0.4)' }}>Toca num setor para filtrar a lista.</p>
        </div>
      )}
      <h3 className="text-xs uppercase tracking-wider font-bold mb-3" style={{ color: 'rgb(var(--c) / 0.53)' }}>
        Greves do ano {sector !== 'Todos' ? `· ${sector}` : ''} ({list.length})
      </h3>
      {list.slice(0, 120).map((a, i) => <NewsItem key={i} a={a} badge={a.sector} />)}
      <p className="mt-4 text-[10px] leading-relaxed" style={{ color: 'rgb(var(--c) / 0.4)' }}>
        Índice calculado automaticamente, não é oficial: 1 + 9 × (greves noticiadas no ano ÷ {data.reference}), entre 1 e 10.
        Conta notícias sobre greves e paralisações (sem repetidas) de jornais portugueses, recolhidas de hora a hora e acumuladas desde {since}.
        A referência anual muda-se em scripts/fetch-news.mjs (REFERENCIA_ANUAL).
      </p>
    </div>
  );
}
