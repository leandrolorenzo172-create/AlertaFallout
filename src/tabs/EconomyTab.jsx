// Separador Instabilidade Económica: índice 1-10, tendência, histórico diário e notícias de economia.
import React, { useEffect, useState, useCallback } from 'react';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import ThreatGauge from '../pipboy/ThreatGauge';
import { fetchEconomy } from '../api/liveData';
import { card, fmtDate, Loading, Header, ErrorBox, Stat, Bars, NewsItem } from './IndicatorParts';
import { t } from '@/i18n';

export default function EconomyTab() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(await fetchEconomy()); } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading && !data) return <div className="p-4"><Header icon={TrendingDown} title={t('Instabilidade Económica')} /><Loading text={t("A analisar notícias de economia...")} /></div>;
  if (!data) return <div className="p-4"><Header icon={TrendingDown} title={t('Instabilidade Económica')} onRefresh={load} /><ErrorBox text={error} /></div>;

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
      <Header icon={TrendingDown} title={t('Instabilidade Económica')} onRefresh={load} />
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
      <h3 className="text-xs uppercase tracking-wider font-bold mb-3" style={{ color: 'rgb(var(--c) / 0.53)' }}>{t('Notícias de economia')}</h3>
      {(data.articles || []).map((a, i) => <NewsItem key={i} a={a} badge={a.negative ? 'negativa' : null} badgeColor={a.negative ? '#ff6600' : null} />)}
      <p className="mt-4 text-[10px] leading-relaxed" style={{ color: 'rgb(var(--c) / 0.4)' }}>
        {t('Índice calculado automaticamente, não é uma avaliação oficial: 1 + 18 × (notícias económicas negativas ÷ notícias económicas dos últimos 3 dias), entre 1 e 10. Fontes: RTP, Notícias ao Minuto, ECO e Jornal de Negócios, recolhidas de hora a hora.')}
      </p>
    </div>
  );
}
