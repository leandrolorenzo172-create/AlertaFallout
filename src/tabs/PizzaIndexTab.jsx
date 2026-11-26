import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Loader2, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import ThreatGauge from '../pipboy/ThreatGauge';
import { alpha } from '../theme';
import { t, locale } from '@/i18n';
import { useQuickTools, showToolToast } from '../tools/quickTools';

const CACHE_KEY = 'pipboy_pizza_index_v1';
const CACHE_TTL_MS = 3 * 60 * 60 * 1000;
// Histórico de leituras (ferramentas "Nova leitura" / "Histórico de dados" / "Alternar período" do menu ≡)
const HISTORY_KEY = 'pipboy_pizza_history_v1';
const PERIODS = [
  { id: '24h', label: 'Últimas 24 horas', ms: 24 * 3600e3 },
  { id: '7d', label: 'Últimos 7 dias', ms: 7 * 24 * 3600e3 },
  { id: '30d', label: 'Últimos 30 dias', ms: 30 * 24 * 3600e3 },
  { id: 'tudo', label: 'Tudo', ms: Infinity },
];
const readHistory = () => { try { const v = JSON.parse(localStorage.getItem(HISTORY_KEY)); return Array.isArray(v) ? v : []; } catch { return []; } };
function addHistory(data) {
  if (!data || typeof data.current_level !== 'number') return readHistory();
  const next = [...readHistory(), { ts: Date.now(), level: data.current_level, trend: data.trend || 'estavel' }].slice(-200);
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* sem espaço */ }
  return next;
}

export default function PizzaIndexTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState(readHistory);
  const [showHistory, setShowHistory] = useState(false);
  const [period, setPeriod] = useState('7d');

  const fetchData = async (force = false) => {
    if (!force) {
      try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
        if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
          setData(cached.data);
          setLoading(false);
          return;
        }
      } catch (err) {
        // cache inválida — segue para o pedido
      }
    }

    setLoading(true);
    setError(null);

    try {
      const result = await base44.integrations.Core.InvokeLLM({
      prompt: `O "Índice Pizza" é um indicador informal que mede a atividade noturna no Pentágono e outras instalações militares dos EUA baseado na quantidade de entregas de pizza durante a noite - quanto mais pizzas entregues, maior a possibilidade de uma crise estar a acontecer.

Fornece uma análise atualizada com data ${new Date().toISOString().split('T')[0]} sobre:
1. Nível atual estimado do Índice Pizza (1-10)
2. Explicação do conceito
3. Indicadores atuais que sugerem atividade anormal
4. Comparação com períodos anteriores de crise
5. Lista de crises históricas onde o índice foi elevado (ex: 11 setembro, invasão Iraque, crise mísseis Cuba)
6. O que este nível significa para cidadãos comuns
7. Atividade recente no Pentágono/bases militares se disponível`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          current_level: { type: "number" },
          trend: { type: "string", enum: ["subindo", "descendo", "estavel"] },
          explanation: { type: "string" },
          current_indicators: { type: "array", items: { type: "string" } },
          historical_events: {
            type: "array",
            items: {
              type: "object",
              properties: {
                event: { type: "string" },
                year: { type: "string" },
                pizza_level: { type: "number" }
              }
            }
          },
          citizen_meaning: { type: "string" },
          recent_activity: { type: "string" }
        }
      }
    });
    
      setData(result);
      setHistory(addHistory(result));
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: result }));
      } catch (err) {
        // sem espaço para cache
      }
    } catch (err) {
      let cached = null;
      try {
        cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      } catch (e) {
        cached = null;
      }

      if (cached && cached.data) {
        setData(cached.data);
        setError(t('Limite de pedidos atingido — a mostrar a última leitura guardada.'));
      } else {
        setError(t('Não foi possível calcular o Índice Pizza: limite de pedidos atingido.'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const trendLabel = (tr) => (tr === 'subindo' ? t('A SUBIR') : tr === 'descendo' ? t('A DESCER') : t('ESTÁVEL'));
  const periodObj = PERIODS.find((p) => p.id === period) || PERIODS[1];
  const shownHistory = history.filter((h) => Date.now() - h.ts <= periodObj.ms);

  // Resumo em texto (partilhar ou copiar)
  const summaryText = () => [
    `🍕 ${t('Índice Pizza')} — ${new Date().toLocaleString(locale())}`,
    data ? `${t('Nível de Atividade')}: ${Number(data.current_level || 0).toFixed(1)}/10 · ${trendLabel(data.trend)}` : t('Sem dados disponíveis.'),
    data?.citizen_meaning ? `${t('O que significa')}: ${data.citizen_meaning}` : '',
    shownHistory.length ? `${t('Histórico')} (${t(periodObj.label)}): ${shownHistory.map((h) => Number(h.level).toFixed(1)).join(' → ')}` : '',
  ].filter(Boolean).join('\n');

  // Ferramentas do menu ≡ (src/tools/toolMenus.js → pizza)
  useQuickTools('pizza', {
    leitura: () => { showToolToast(t('A pedir uma nova leitura…')); fetchData(true); },
    historico: () => {
      setShowHistory((v) => !v);
      setTimeout(() => document.getElementById('pizza-history')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    },
    periodo: () => {
      const next = PERIODS[(PERIODS.findIndex((p) => p.id === period) + 1) % PERIODS.length];
      setPeriod(next.id); setShowHistory(true);
      showToolToast(t('Período: {x}', { x: t(next.label) }));
    },
    exportar: async () => {
      const text = summaryText();
      try {
        if (navigator.share) { await navigator.share({ title: t('Índice Pizza'), text }); return; }
        await navigator.clipboard.writeText(text);
        showToolToast(t('Resumo copiado.'));
      } catch {
        // sem partilha nem área de transferência: descarrega um .txt
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
        a.download = `indice-pizza-${new Date().toISOString().slice(0, 10)}.txt`;
        a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      }
    },
  });

  // Painel do histórico (aparece também quando ainda não há leitura atual)
  const historyPanel = showHistory && (
    <div id="pizza-history" className="p-3 rounded-sm mb-4" style={{ background: 'rgb(var(--cd) / 0.3)', border: '1px solid rgb(var(--c) / 0.2)', scrollMarginTop: 90 }}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs uppercase tracking-wider font-bold" style={{ color: 'rgb(var(--c) / 0.75)' }}>{t('Histórico de dados')}</h3>
        <span className="text-[10px] uppercase tracking-wider" style={{ color: 'rgb(var(--c) / 0.5)' }}>{t(periodObj.label)}</span>
      </div>
      {shownHistory.length === 0 ? (
        <p className="text-[11px]" style={{ color: 'rgb(var(--c) / 0.5)' }}>{t('Ainda não há leituras neste período.')}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {shownHistory.slice().reverse().slice(0, 30).map((h) => (
            <li key={h.ts} className="flex items-center gap-2 text-[11px]">
              <span className="w-28 shrink-0" style={{ color: 'rgb(var(--c) / 0.55)' }}>{new Date(h.ts).toLocaleString(locale(), { dateStyle: 'short', timeStyle: 'short' })}</span>
              <span className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgb(var(--c) / 0.1)' }}>
                <span className="block h-full" style={{ width: `${Math.min(100, h.level * 10)}%`, background: h.level >= 8 ? '#ff0000' : h.level >= 6 ? '#ff6600' : h.level >= 4 ? '#ffaa00' : 'rgb(var(--c))' }} />
              </span>
              <span className="w-10 text-right" style={{ color: 'rgb(var(--c))' }}>{Number(h.level).toFixed(1)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const getTrendIcon = () => {
    if (!data?.trend) return Minus;
    if (data.trend === 'subindo') return TrendingUp;
    if (data.trend === 'descendo') return TrendingDown;
    return Minus;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center py-12">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
          <Loader2 size={24} style={{ color: 'rgb(var(--c))' }} />
        </motion.div>
        <p className="mt-3 text-[10px] uppercase tracking-widest" style={{ color: 'rgb(var(--c) / 0.4)' }}>
          {t('A CALCULAR ÍNDICE PIZZA...')}
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">🍕</span>
          <h2 className="text-sm uppercase tracking-wider font-bold" style={{ color: 'rgb(var(--c))' }}>
            {t('Índice Pizza')}
          </h2>
        </div>
        {historyPanel}
        <div className="p-4 rounded-sm text-center" style={{ background: '#ff000011', border: '1px solid #ff000033' }}>
          <p className="text-xs leading-relaxed mb-3" style={{ color: '#ff5555cc' }}>
            ⚠️ {error || t('Sem dados disponíveis.')}
          </p>
          <button
            onClick={() => fetchData(true)}
            className="px-3 py-2 rounded-sm text-[10px] uppercase tracking-wider inline-flex items-center gap-2"
            style={{ background: 'rgb(var(--c) / 0.13)', border: '1px solid rgb(var(--c) / 0.27)', color: 'rgb(var(--c))' }}
          >
            <RefreshCw size={12} />{' '}{t('Tentar novamente')}
          </button>
        </div>
      </div>
    );
  }

  const TrendIcon = getTrendIcon();
  const level = data?.current_level || 0;
  const levelColor = level >= 8 ? '#ff0000' : level >= 6 ? '#ff6600' : level >= 4 ? '#ffaa00' : 'rgb(var(--c))';

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🍕</span>
          <h2 className="text-sm uppercase tracking-wider font-bold" style={{ color: 'rgb(var(--c))' }}>
            {t('Índice Pizza')}
          </h2>
        </div>
        <button onClick={() => fetchData(true)} className="p-2 rounded-sm hover:bg-white/5" style={{ color: 'rgb(var(--c) / 0.53)' }}>
          <RefreshCw size={14} />
        </button>
      </div>

      {error && (
        <div className="p-2.5 rounded-sm mb-3" style={{ background: '#ffaa0011', border: '1px solid #ffaa0033' }}>
          <p className="text-[10px]" style={{ color: '#ffaa00cc' }}>⚠️ {error}</p>
        </div>
      )}

      {historyPanel}

      {/* Main gauge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-6 rounded-sm mb-4 text-center"
        style={{ background: 'rgb(var(--cd) / 0.4)', border: `1px solid ${alpha(levelColor, '33')}` }}
      >
        <div className="text-6xl font-bold mb-2" style={{ color: levelColor, textShadow: `0 0 20px ${alpha(levelColor, '44')}` }}>
          {level.toFixed(1)}
        </div>
        <div className="flex items-center justify-center gap-2 mb-3">
          <TrendIcon size={16} style={{ color: levelColor }} />
          <span className="text-xs uppercase tracking-wider" style={{ color: `${alpha(levelColor, 'cc')}` }}>
            {trendLabel(data?.trend)}
          </span>
        </div>
        <ThreatGauge label={t('Nível de Atividade')} value={level} />
      </motion.div>

      {/* Explanation */}
      <div className="p-3 rounded-sm mb-4" style={{ background: 'rgb(var(--cd) / 0.2)', border: '1px solid rgb(var(--c) / 0.07)' }}>
        <h3 className="text-xs uppercase tracking-wider font-bold mb-2" style={{ color: 'rgb(var(--c) / 0.53)' }}>
          {t('O que é o Índice Pizza?')}
        </h3>
        <p className="text-xs leading-relaxed" style={{ color: 'rgb(var(--c) / 0.47)' }}>
          {data?.explanation}
        </p>
      </div>

      {/* Current indicators */}
      {data?.current_indicators?.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs uppercase tracking-wider font-bold mb-2" style={{ color: 'rgb(var(--c) / 0.53)' }}>
            {t('Indicadores Atuais')}
          </h3>
          {data.current_indicators.map((ind, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-start gap-2 p-2 mb-1 rounded-sm"
              style={{ background: 'rgb(var(--cd) / 0.13)' }}
            >
              <span style={{ color: 'rgb(var(--c))' }}>›</span>
              <span className="text-xs" style={{ color: 'rgb(var(--c) / 0.6)' }}>{ind}</span>
            </motion.div>
          ))}
        </div>
      )}

      {/* Historical events */}
      {data?.historical_events?.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs uppercase tracking-wider font-bold mb-2" style={{ color: 'rgb(var(--c) / 0.53)' }}>
            {t('Histórico de Crises')}
          </h3>
          {data.historical_events.map((evt, i) => (
            <div key={i} className="flex items-center justify-between p-2 mb-1 rounded-sm"
              style={{ background: 'rgb(var(--cd) / 0.13)', borderLeft: `2px solid ${alpha(evt.pizza_level >= 8 ? '#ff0000' : evt.pizza_level >= 5 ? '#ff6600' : 'rgb(var(--c))', '33')}` }}>
              <div>
                <span className="text-xs font-bold" style={{ color: 'rgb(var(--c) / 0.8)' }}>{evt.event}</span>
                <span className="text-[10px] ml-2" style={{ color: 'rgb(var(--c) / 0.33)' }}>{evt.year}</span>
              </div>
              <span className="text-xs font-bold" style={{ color: evt.pizza_level >= 8 ? '#ff0000' : evt.pizza_level >= 5 ? '#ff6600' : 'rgb(var(--c))' }}>
                🍕 {evt.pizza_level}/10
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Citizen meaning */}
      {data?.citizen_meaning && (
        <div className="p-3 rounded-sm" style={{ background: '#ffaa0011', border: '1px solid #ffaa0033' }}>
          <h3 className="text-xs uppercase tracking-wider font-bold mb-2" style={{ color: '#ffaa00cc' }}>
            {t('⚠️ O Que Significa Para Si')}
          </h3>
          <p className="text-xs leading-relaxed" style={{ color: '#ffaa0099' }}>
            {data.citizen_meaning}
          </p>
        </div>
      )}
    </div>
  );
}
