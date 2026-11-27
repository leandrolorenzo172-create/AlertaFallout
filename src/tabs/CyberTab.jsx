// Separador Ciberataques & Ameaças Cibernéticas: risco 0–100, ocorrências das 13 fontes, filtro por tipo e gravidade.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ShieldAlert, ExternalLink, CheckCircle2, XCircle } from 'lucide-react';
import ThreatGauge from '../pipboy/ThreatGauge';
import { fetchCyber } from '../api/liveData';
import { card, fmtDate, Loading, Header, ErrorBox, Stat } from './IndicatorParts';
import { plainText } from '@/lib/plainText';
import { THREAT_TYPES, computeCyberRisk } from '@/lib/cyberRisk';
import { useCyberTools, reportCyber, setThreatType, toggleCritical, onCyberRefresh, onCyberRecalc } from '@/cyber/cyberTools';
import { t } from '@/i18n';

const SEV_COLOR = { 'Crítico': '#ff0000', Alto: '#ff6600', 'Médio': '#ffaa00', Baixo: 'rgb(var(--c))' };
const LEVEL_COLOR = { 'Crítico': '#ff0000', Elevado: '#ff6600', Moderado: '#ffaa00', Baixo: 'rgb(var(--c))' };
const GROUPS = [['int', 'Referências internacionais'], ['pt', 'Fontes em português (PT/BR)'], ['oficial', 'Alertas técnicos oficiais']];
const chip = (on, color) => ({
  background: on ? 'rgb(var(--c) / 0.16)' : 'rgb(var(--cb) / 0.6)',
  border: `1px solid ${on ? (color || 'rgb(var(--c))') : 'rgb(var(--c) / 0.25)'}`,
  color: on ? (color || 'rgb(var(--c))') : 'rgb(var(--c) / 0.75)',
});

function CyberCard({ a }) {
  const color = SEV_COLOR[a.severity] || 'rgb(var(--c))';
  return (
    <div className="mb-2 p-3 rounded-sm" style={{ background: 'rgb(var(--cd) / 0.45)', border: '1px solid rgb(var(--c) / 0.12)', borderLeft: `3px solid ${color}` }}>
      <div className="flex items-start gap-2">
        <h4 className="text-xs font-bold flex-1 leading-snug" style={{ color: 'rgb(var(--c) / 0.9)' }}>{plainText(a.title)}</h4>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm shrink-0 uppercase" style={{ color, border: `1px solid ${color}` }}>{t(a.severity)}</span>
      </div>
      {a.summary && <p className="text-[11px] mt-1 leading-snug" style={{ color: 'rgb(var(--c) / 0.6)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{plainText(a.summary)}</p>}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-[10px] uppercase tracking-wider" style={{ color: 'rgb(var(--c) / 0.5)' }}>
        {(a.types || []).map((id) => <span key={id} className="px-1 rounded-sm" style={{ border: '1px solid rgb(var(--c) / 0.3)', color: 'rgb(var(--c) / 0.8)' }}>{t(THREAT_TYPES.find((x) => x.id === id)?.label)}</span>)}
        <span>{t('Setor:')} {t(a.sector)}</span>
        <span>{a.official ? '🛡 ' : ''}{a.source}</span>
        <span>{fmtDate(a.date)}</span>
        {a.url && <a href={a.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 underline" style={{ color: 'rgb(var(--c))' }}>{t('Fonte')} <ExternalLink size={10} /></a>}
      </div>
    </div>
  );
}

export default function CyberTab() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [risk, setRisk] = useState(null);
  const tools = useCyberTools();

  const load = useCallback(async (fresh = false) => {
    setLoading(true); setError(null); reportCyber({ loading: true });
    try { const d = await fetchCyber({ fresh }); setData(d); setRisk(d.risk); reportCyber({ lastSync: Date.now(), risk: d.risk }); }
    catch (e) { setError(e.message); } finally { setLoading(false); reportCyber({ loading: false }); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => onCyberRefresh(() => load(true)), [load]); // menu ≡ > ATUALIZAR FEED
  // menu ≡ > RECALCULAR RISCO: refaz a pontuação com a hora atual (o que tem mais de 24 h pesa metade, mais de 7 dias sai)
  useEffect(() => onCyberRecalc(() => { if (!data) return; const r = computeCyberRisk(data.items); setRisk(r); reportCyber({ risk: r }); }), [data]);

  const items = data?.items || [];
  useEffect(() => { reportCyber({ criticalCount: items.filter((a) => a.severity === 'Crítico').length }); }, [items]);
  const shown = useMemo(() => items.filter((a) => (!tools.type || (a.types || []).includes(tools.type)) && (!tools.criticalOnly || a.severity === 'Crítico' || a.severity === 'Alto')), [items, tools.type, tools.criticalOnly]);
  const typeCount = (id) => items.filter((a) => (a.types || []).includes(id)).length;

  if (loading && !data) return <div className="p-4"><Header icon={ShieldAlert} title={t('Ciberataques & Ameaças')} /><Loading text={t('A recolher alertas de cibersegurança...')} /></div>;
  if (!data) return <div className="p-4"><Header icon={ShieldAlert} title={t('Ciberataques & Ameaças')} onRefresh={() => load(true)} /><ErrorBox text={error} /></div>;

  const r = risk || data.risk;
  const lvlColor = LEVEL_COLOR[r.level];
  return (
    <div className="p-4 max-w-3xl mx-auto">
      <Header icon={ShieldAlert} title={`${t('Ciberataques & Ameaças')}${loading ? ` · ${t('A atualizar…')}` : ''}`} onRefresh={() => load(true)} />

      {/* Risco cibernético 0–100 (gravidade + volume) */}
      <div id="ciber-risco" className="p-4 rounded-sm mb-4 scroll-mt-20" style={card}>
        <ThreatGauge label={t('🛡 Risco cibernético')} value={Math.max(1, r.score / 10)} />
        <p className="text-sm font-bold uppercase tracking-wider" style={{ color: lvlColor, textShadow: `0 0 8px ${lvlColor}55` }}>
          {r.score}/100 · {t(r.level)}
        </p>
        <p className="text-[11px] mt-1" style={{ color: 'rgb(var(--c) / 0.65)' }}>
          {t('Gravidade {g}/60 + volume {v}/40 · calculado às {h}', { g: r.gravity, v: r.volume, h: new Date(r.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <Stat label={t('Últimas 24 h')} value={r.n24} sub={t('ocorrências')} />
        <Stat label={t('7 dias')} value={r.n7} sub={t('ocorrências')} />
        <Stat label={t('Críticas')} value={r.critical} sub={t('em 7 dias')} />
      </div>

      {/* Filtro por tipo de ameaça e gravidade (também no menu ≡) */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <button type="button" onClick={() => setThreatType(null)} aria-pressed={!tools.type} className="px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider" style={chip(!tools.type)}>{t('Todas')} {items.length}</button>
        {THREAT_TYPES.map((tp) => (
          <button key={tp.id} type="button" onClick={() => setThreatType(tools.type === tp.id ? null : tp.id)} aria-pressed={tools.type === tp.id} className="px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider" style={chip(tools.type === tp.id)}>
            {t(tp.label)} <span className="opacity-60">{typeCount(tp.id)}</span>
          </button>
        ))}
        <button type="button" onClick={toggleCritical} aria-pressed={tools.criticalOnly} className="px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider" style={chip(tools.criticalOnly, '#ef4444')}>{t('Crítico / Alto')}</button>
      </div>

      <div id="ciber-lista" className="scroll-mt-20 rounded-sm">
        <h3 className="text-xs uppercase tracking-wider font-bold mb-3" style={{ color: 'rgb(var(--c) / 0.53)' }}>
          {t('Ocorrências e alertas')} ({shown.length})
        </h3>
        {shown.length === 0 && <p className="text-xs p-3 rounded-sm mb-2" style={{ ...card, color: 'rgb(var(--c) / 0.6)' }}>{t('Sem ocorrências com estes filtros.')}</p>}
        {shown.slice(0, 120).map((a, i) => <CyberCard key={`${a.url || a.title}-${i}`} a={a} />)}
      </div>

      {/* Estado das fontes */}
      <div className="p-3 rounded-sm mt-4" style={card}>
        <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'rgb(var(--c) / 0.45)' }}>{t('Fontes monitorizadas')} ({data.sources.filter((s) => s.ok).length}/{data.sources.length} {t('a responder')})</p>
        {GROUPS.map(([g, label]) => (
          <div key={g} className="mb-2">
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: '#ffaa00' }}>{t(label)}</p>
            <div className="flex flex-wrap gap-1.5">
              {data.sources.filter((s) => s.group === g).map((s) => (
                <span key={s.name} title={s.ok ? `${s.n} ${t('itens')}` : t('Não respondeu na última recolha')} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px]" style={{ border: `1px solid ${s.ok ? 'rgb(var(--c) / 0.3)' : '#ef444466'}`, color: s.ok ? 'rgb(var(--c) / 0.8)' : '#ef4444aa' }}>
                  {s.ok ? <CheckCircle2 size={10} /> : <XCircle size={10} />}{s.name} <span className="opacity-60">{s.domain}</span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[10px] leading-relaxed" style={{ color: 'rgb(var(--c) / 0.4)' }}>
        {t('Risco calculado automaticamente, não é uma avaliação oficial. Gravidade (0–60): cada ocorrência dos últimos 7 dias soma Crítico 10, Alto 6, Médio 3, Baixo 1 (×1,5 se for alerta oficial da CISA, CERT-EU ou CNCS; metade se tiver mais de 24 h), G = 60 × (1 − e^(−soma/900)). Volume (0–40): 25 × (ocorrências em 24 h ÷ 80) + 15 × (ocorrências em 7 dias ÷ 400), cada parte no máximo 1. Nível: Baixo < 25, Moderado < 50, Elevado < 75, Crítico ≥ 75. Gravidade, tipo e setor são deduzidos das palavras de cada notícia. Recolhido de hora a hora em {d}.', { d: fmtDate(data.generated) })}
      </p>
    </div>
  );
}
