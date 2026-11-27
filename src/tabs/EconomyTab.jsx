// Separador Instabilidade Económica: índice 1-10, tendência, histórico diário e notícias de economia.
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { TrendingDown, TrendingUp, Minus, Search, X } from 'lucide-react';
import Watchlist from '../economy/Watchlist';
import { useEconomyTools, reportEconomy, onEconomyRefresh, themesOf, isUrgent, isCritical, normTxt, ECO_THEMES, setEcoQuery, openEcoSearch, ecoFiltered, setEcoTheme, toggleUrgent } from '../economy/economyTools';
import ThreatGauge from '../pipboy/ThreatGauge';
import { fetchEconomy } from '../api/liveData';
import { card, fmtDate, Loading, Header, ErrorBox, Stat, Bars, NewsItem } from './IndicatorParts';
import { t } from '@/i18n';

export default function EconomyTab() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const tools = useEconomyTools();
  const load = useCallback(async (fresh = false) => {
    setLoading(true); setError(null); reportEconomy({ loading: true });
    try { setData(await fetchEconomy({ fresh })); reportEconomy({ lastSync: Date.now() }); } catch (e) { setError(e.message); } finally { setLoading(false); reportEconomy({ loading: false }); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => onEconomyRefresh(() => load(true)), [load]); // menu ≡ > ATUALIZAR DADOS (índice e notícias, sem cache)

  // notícias com temas e marca de urgente; filtros do menu ≡ (urgentes, tema, palavra-chave)
  const articles = useMemo(() => (data?.articles || []).map((a) => ({ ...a, themes: themesOf(a), urgent: isUrgent(a), critical: isCritical(a) })), [data]);
  useEffect(() => { reportEconomy({ urgentCount: articles.filter((a) => a.urgent).length }); }, [articles]);
  const shown = useMemo(() => {
    const words = normTxt(tools.query).split(/\s+/).filter(Boolean);
    return articles.filter((a) => (!tools.urgentOnly || a.urgent) && (!tools.theme || a.themes.includes(tools.theme))
      && (!words.length || words.every((w) => normTxt(`${a.title} ${a.summary || ''} ${a.source}`).includes(w))));
  }, [articles, tools.urgentOnly, tools.theme, tools.query]);
  const searchRef = useRef(null);
  useEffect(() => { if (tools.searchOpen) setTimeout(() => searchRef.current?.focus(), 200); }, [tools.searchOpen]);

  if (loading && !data) return <div className="p-4"><Header icon={TrendingDown} title={t('Instabilidade Económica')} /><Loading text={t("A analisar notícias de economia...")} /></div>;
  if (!data) return <div className="p-4"><Header icon={TrendingDown} title={t('Instabilidade Económica')} onRefresh={() => load(true)} /><ErrorBox text={error} /></div>;

  // tendência: compara com a média dos 7 dias anteriores do histórico
  const hist = data.history || [];
  const prev = hist.slice(0, -1).slice(-7);
  const avgPrev = prev.length ? prev.reduce((s, h) => s + h.v, 0) / prev.length : data.level;
  const diff = Math.round((data.level - avgPrev) * 10) / 10;
  const Trend = diff > 0.2 ? TrendingUp : diff < -0.2 ? TrendingDown : Minus;
  const trendText = diff > 0.2 ? t('a subir (+{d})', { d: diff }) : diff < -0.2 ? t('a descer ({d})', { d: diff }) : t('estável');
  const negShare = data.total ? Math.round((data.negative / data.total) * 100) : 0;

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <Header icon={TrendingDown} title={`${t('Instabilidade Económica')}${loading ? ` · ${t('A atualizar…')}` : ''}`} onRefresh={() => load(true)} />
      <div className="p-4 rounded-sm mb-4" style={card}>
        <ThreatGauge label={t('📉 Instab. Económica')} value={data.level || 0} />
        <div className="flex items-center gap-2 text-xs" style={{ color: 'rgb(var(--c) / 0.75)' }}>
          <Trend size={14} />{' '}{t('Tendência:')}{' '}<b>{trendText}</b> <span style={{ color: 'rgb(var(--c) / 0.45)' }}>{t('face à média dos últimos dias')}</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <Stat label={t('Notícias')} value={data.total} sub={t("últimos 3 dias")} />
        <Stat label={t('Negativas')} value={data.negative} sub={t('{p}% do total', { p: negShare })} />
        <Stat label={t('Atualizado')} value={fmtDate(data.generated).split(', ')[1] || '—'} sub={fmtDate(data.generated).split(', ')[0]} />
      </div>
      {hist.length > 1 && (
        <div className="p-4 rounded-sm mb-4" style={card}>
          <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'rgb(var(--c) / 0.45)' }}>{t('Histórico diário do índice')}</p>
          <Bars items={hist.map((h) => ({ label: h.d, v: h.v }))} max={10} />
          <div className="flex justify-between text-[9px] mt-1" style={{ color: 'rgb(var(--c) / 0.4)' }}><span>{hist[0].d}</span><span>{hist[hist.length - 1].d}</span></div>
        </div>
      )}
      {/* 6 espaços de ativos / indicadores de investimento (logo abaixo do histórico diário) */}
      <Watchlist />

      <div id="eco-noticias" className="scroll-mt-20 rounded-sm">
        <h3 className="text-xs uppercase tracking-wider font-bold mb-3" style={{ color: 'rgb(var(--c) / 0.53)' }}>
          {t('Notícias em destaque')}{tools.theme ? ` · ${t(ECO_THEMES.find((x) => x.id === tools.theme)?.label)}` : ''} ({shown.length})
        </h3>
        {(tools.searchOpen || tools.query) && (
          <label className="flex items-center gap-2 px-2 py-1.5 mb-3 rounded-sm" style={{ background: 'rgb(var(--cb) / 0.7)', border: '1px solid rgb(var(--c) / 0.35)' }}>
            <Search size={13} style={{ color: 'rgb(var(--c) / 0.6)' }} />
            <input ref={searchRef} value={tools.query} onChange={(e) => setEcoQuery(e.target.value)} placeholder={t('BCE, inflação, juros, Bitcoin, S&P 500…')}
              className="flex-1 min-w-0 bg-transparent outline-none text-xs" style={{ color: 'rgb(var(--c))' }} />
            <button type="button" onClick={() => openEcoSearch(false)} aria-label={t('Fechar pesquisa')}><X size={13} style={{ color: 'rgb(var(--c) / 0.6)' }} /></button>
          </label>
        )}
        {ecoFiltered(tools) && (
          <p className="text-[10px] uppercase tracking-wider mb-2 flex flex-wrap gap-2 items-center" style={{ color: 'rgb(var(--c) / 0.6)' }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#ff0000' }} />
            {tools.urgentOnly && <span style={{ color: '#ef4444' }}>{t('Só urgentes')}</span>}
            {tools.theme && <span>{t(ECO_THEMES.find((x) => x.id === tools.theme)?.label)}</span>}
            {tools.query.trim() && <span>«{tools.query.trim()}»</span>}
            <button type="button" onClick={() => { setEcoTheme(null); setEcoQuery(''); if (tools.urgentOnly) toggleUrgent(); }} className="ml-auto px-2 py-0.5 rounded-sm" style={{ border: '1px solid #ef444488', color: '#ef4444' }}>{t('Limpar filtros')}</button>
          </p>
        )}
        {shown.length === 0 && <p className="text-xs p-3 rounded-sm mb-2" style={{ ...card, color: 'rgb(var(--c) / 0.6)' }}>{t('Sem resultados com estes filtros.')}</p>}
        {shown.map((a, i) => <NewsItem key={i} a={a} badge={a.critical ? t('urgente') : a.negative ? t('negativa') : (a.themes[0] ? t(ECO_THEMES.find((x) => x.id === a.themes[0]).label) : null)} badgeColor={a.critical ? '#ef4444' : a.negative ? '#ff6600' : null} />)}
      </div>
      <p className="mt-4 text-[10px] leading-relaxed" style={{ color: 'rgb(var(--c) / 0.4)' }}>
        {t('Índice calculado automaticamente, não é uma avaliação oficial: 1 + 18 × (notícias económicas negativas ÷ notícias económicas dos últimos 3 dias), entre 1 e 10. Fontes: RTP, Notícias ao Minuto, ECO, Jornal de Negócios e Investing.com (pt.investing.com/news), recolhidas de hora a hora.')}
      </p>
    </div>
  );
}
