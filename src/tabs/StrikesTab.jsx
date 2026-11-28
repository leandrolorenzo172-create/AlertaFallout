// Separador Greves: índice que sobe com o número de greves noticiadas no ano, por setor, com a lista do ano.
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Megaphone, Search, X } from 'lucide-react';
import { useStrikesTools, reportStrikes, setSector, setQuery, openSearch, onStrikesRefresh, strikesFiltered, toggleOnlyActive } from '@/strikes/strikesTools';
import ThreatGauge from '../pipboy/ThreatGauge';
import { fetchStrikes } from '../api/liveData';
import { countryName } from '@/geo/country';
import { card, Loading, Header, ErrorBox, Stat, NewsItem } from './IndicatorParts';
import { t, locale } from '@/i18n';

export default function StrikesTab() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  // filtros partilhados com o menu ≡ (setor, palavra-chave, só ativas)
  const tools = useStrikesTools();
  const { sector, query, onlyActive } = tools;
  const load = useCallback(async (fresh = false) => {
    setLoading(true); setError(null); reportStrikes({ loading: true });
    try { setData(await fetchStrikes({ fresh })); reportStrikes({ lastSync: Date.now() }); } catch (e) { setError(e.message); } finally { setLoading(false); reportStrikes({ loading: false }); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => onStrikesRefresh(() => load(true)), [load]); // menu ≡ > ATUALIZAR DADOS (sem cache)

  const sectors = useMemo(() => Object.entries(data?.bySector || {}).sort((a, b) => b[1] - a[1]), [data]);
  // greves marcadas de hoje em diante (as mesmas que geram os avisos)
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = useMemo(() => (data?.upcoming || []).filter((u) => u.sector !== 'Internacional'), [data]);
  const active = useMemo(() => upcoming.filter((u) => (u.days || []).some((d) => d >= today)), [upcoming, today]);
  useEffect(() => { reportStrikes({ sectors, activeCount: active.length }); }, [sectors, active.length]);
  const norm = (x) => String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const activeKeys = useMemo(() => new Set(active.flatMap((u) => [u.url, norm(u.title)]).filter(Boolean)), [active]);
  const list = useMemo(() => {
    const words = norm(query).split(/\s+/).filter(Boolean);
    return (data?.items || []).filter((x) => (sector === 'Todos' || x.sector === sector)
      && (!words.length || words.every((w) => norm(`${x.title} ${x.source} ${x.sector}`).includes(w)))
      && (!onlyActive || activeKeys.has(x.url) || activeKeys.has(norm(x.title))));
  }, [data, sector, query, onlyActive, activeKeys]);
  const searchRef = useRef(null);
  useEffect(() => { if (tools.searchOpen) setTimeout(() => searchRef.current?.focus(), 200); }, [tools.searchOpen]);

  if (loading && !data) return <div className="p-4"><Header icon={Megaphone} title={t('Greves')} /><Loading text={t("A contar greves do ano...")} /></div>;
  if (!data) return <div className="p-4"><Header icon={Megaphone} title={t('Greves')} onRefresh={() => load(true)} /><ErrorBox text={error} /></div>;

  const since = new Date(data.since).toLocaleDateString(locale(), { day: '2-digit', month: '2-digit', year: 'numeric' });
  const maxSector = Math.max(1, ...sectors.map((s) => s[1]));

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <Header icon={Megaphone} title={`${t('Greves')} ${data.year}${loading ? ` · ${t('A atualizar…')}` : ''}`} onRefresh={() => load(true)} />
      {data.newsFor && !data.newsFor.local && (
        <p className="text-[10px] mb-3 p-2 rounded-sm" style={{ border: '1px solid #ffaa0055', color: '#ffaa00' }}>
          {t('Ainda não há notícias locais para {p}: a mostrar greves de {q}.', { p: countryName(data.newsFor.requested) || '—', q: countryName(data.newsFor.country) })}
        </p>
      )}
      <div className="p-4 rounded-sm mb-4" style={card}>
        <ThreatGauge label={t('✊ Índice de greves')} value={data.level || 0} />
        <p className="text-xs" style={{ color: 'rgb(var(--c) / 0.75)' }}>
          <b>{data.count}</b>{' '}{t('greves noticiadas em')}{' '}{data.year}{t('. O índice chega a 10 com')}{' '}{data.reference}{' '}{t('greves no ano.')}
        </p>
      </div>
      {/* Próximas greves com dia marcado (as mesmas que geram os avisos) */}
      {upcoming.length > 0 && (
        <div id="greves-proximas" className="p-4 rounded-sm mb-4 scroll-mt-20" style={{ ...card, border: `1px solid ${onlyActive ? '#ef4444aa' : '#ffaa0055'}` }}>
          <p className="text-[10px] uppercase tracking-wider mb-2 font-bold" style={{ color: '#ffaa00' }}>{t('Em curso / Próximas greves')}{active.length ? <span style={{ color: '#ef4444' }}> · {t('{n} ativa(s)', { n: active.length })}</span> : null}</p>
          {upcoming.map((u) => {
            const f = (d) => d.split('-').reverse().join('/');
            const when = u.days.length > 1 ? `${f(u.days[0])} a ${f(u.days[u.days.length - 1])}` : f(u.days[0]);
            return (
              <a key={u.id} href={u.url || undefined} target="_blank" rel="noreferrer" className="block mb-2 last:mb-0">
                <p className="text-xs font-bold" style={{ color: 'rgb(var(--c) / 0.9)' }}>📅 {when} · {t(u.sector)}</p>
                <p className="text-[11px] leading-snug" style={{ color: 'rgb(var(--c) / 0.6)' }}>{u.title}</p>
              </a>
            );
          })}
        </div>
      )}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <Stat label={t('No ano')} value={data.count} sub={`desde ${since}`} />
        <Stat label={t('30 dias')} value={data.last30} sub={t("mais recentes")} />
        <Stat label={t('Setores')} value={sectors.length} sub={sectors[0] ? `mais: ${sectors[0][0]}` : '—'} />
      </div>
      {sectors.length > 0 && (
        <div id="greves-setor" className="p-4 rounded-sm mb-4 scroll-mt-20" style={card}>
          <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'rgb(var(--c) / 0.45)' }}>{t('Por setor')}</p>
          {sectors.map(([name, n]) => (
            <button key={name} type="button" onClick={() => setSector(sector === name ? 'Todos' : name)} className="w-full flex items-center gap-2 mb-1.5 text-left">
              <span className="text-[11px] w-28 shrink-0" style={{ color: sector === name ? 'rgb(var(--c))' : 'rgb(var(--c) / 0.7)', fontWeight: sector === name ? 700 : 400 }}>{t(name)}</span>
              <span className="flex-1 h-3 rounded-sm overflow-hidden" style={{ background: 'rgb(var(--cd))', border: '1px solid rgb(var(--c) / 0.15)' }}>
                <span className="block h-full" style={{ width: `${(n / maxSector) * 100}%`, background: 'rgb(var(--c) / 0.7)' }} />
              </span>
              <span className="text-[11px] w-8 text-right tabular-nums">{n}</span>
            </button>
          ))}
          <p className="text-[10px] mt-2" style={{ color: 'rgb(var(--c) / 0.4)' }}>{t('Toca num setor para filtrar a lista.')}</p>
        </div>
      )}
      <div id="greves-lista" className="scroll-mt-20 rounded-sm">
        <h3 className="text-xs uppercase tracking-wider font-bold mb-3" style={{ color: 'rgb(var(--c) / 0.53)' }}>
          {t('Notícias em foco')}{' '}{sector !== 'Todos' ? `· ${t(sector)}` : ''} ({list.length})
        </h3>
        {/* Pesquisa rápida (menu ≡ > PESQUISAR) */}
        {(tools.searchOpen || query) && (
          <label className="flex items-center gap-2 px-2 py-1.5 mb-3 rounded-sm" style={{ background: 'rgb(var(--cb) / 0.7)', border: '1px solid rgb(var(--c) / 0.35)' }}>
            <Search size={13} style={{ color: 'rgb(var(--c) / 0.6)' }} />
            <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Empresa, cidade, serviço ou linha…')}
              className="flex-1 min-w-0 bg-transparent outline-none text-xs" style={{ color: 'rgb(var(--c))' }} />
            <button type="button" onClick={() => openSearch(false)} aria-label={t('Fechar pesquisa')}><X size={13} style={{ color: 'rgb(var(--c) / 0.6)' }} /></button>
          </label>
        )}
        {strikesFiltered(tools) && (
          <p className="text-[10px] uppercase tracking-wider mb-2 flex flex-wrap gap-2 items-center" style={{ color: 'rgb(var(--c) / 0.6)' }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#ff0000' }} />
            {onlyActive && <span>{t('Só ativas')}</span>}{sector !== 'Todos' && <span>{t(sector)}</span>}{query.trim() && <span>«{query.trim()}»</span>}
            <button type="button" onClick={() => { setSector('Todos'); setQuery(''); if (onlyActive) toggleOnlyActive(); }} className="ml-auto px-2 py-0.5 rounded-sm" style={{ border: '1px solid #ef444488', color: '#ef4444' }}>{t('Limpar filtros')}</button>
          </p>
        )}
        {list.length === 0 && <p className="text-xs p-3 rounded-sm mb-2" style={{ ...card, color: 'rgb(var(--c) / 0.6)' }}>{onlyActive ? t('Nenhuma notícia ligada a greves em curso ou marcadas.') : t('Sem resultados com estes filtros.')}</p>}
        {list.slice(0, 120).map((a, i) => <NewsItem key={i} a={a} badge={t(a.sector)} />)}
      </div>
      <p className="mt-4 text-[10px] leading-relaxed" style={{ color: 'rgb(var(--c) / 0.4)' }}>
        {t('Índice calculado automaticamente, não é oficial: 1 + 9 × (greves noticiadas no ano ÷')}{' '}{data.reference}{t('), entre 1 e 10. Conta notícias sobre greves e paralisações (sem repetidas) de jornais do país, recolhidas de hora a hora e acumuladas desde')}{' '}{since}{t('. A referência anual muda-se em scripts/fetch-news.mjs (REFERENCIA_ANUAL).')}
      </p>
    </div>
  );
}
