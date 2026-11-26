import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Loader2, ShieldAlert, X } from 'lucide-react';
import NewsCard from '../pipboy/NewsCard';
import { t, locale } from '@/i18n';
import { useQuickTools, setToolBadge, showToolToast } from '../tools/quickTools';

// Gravidade a partir da qual um evento conta como "alerta ativo" (indicador vermelho no menu ≡)
const ALERT_MIN = 7;
// Filtro de gravidade (ferramenta "Filtrar gravidade")
const SEVERITY_FILTERS = [
  { min: 0, label: 'Todas as gravidades' },
  { min: 4, label: 'Gravidade 4 ou mais' },
  { min: 7, label: 'Gravidade 7 ou mais' },
];
// Protocolo de emergência resumido (ferramenta "Protocolo de emergência")
const PROTOCOL = [
  'Se houver risco de vida, liga 112.',
  'Afasta-te do perigo imediato e ajuda quem estiver ferido sem te pores em risco.',
  'Segue as indicações da Proteção Civil e ouve a rádio (Antena 1 e rádios locais).',
  'Leva a mochila de emergência: água, comida, lanterna, rádio, medicamentos e documentos.',
  'Avisa a família pelo contacto combinado e dirige-te ao ponto de encontro.',
  'Não voltes à zona afetada até as autoridades dizerem que é seguro.',
];

export default function CatastropheTab() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [minSeverity, setMinSeverity] = useState(0);
  const [showProtocol, setShowProtocol] = useState(false);
  const activeAlerts = articles.filter((a) => Number(a.severity) >= ALERT_MIN);
  const shown = articles.filter((a) => Number(a.severity || 0) >= minSeverity);

  // o menu ≡ mostra o ponto vermelho em "Alertas ativos" quando há eventos graves
  useEffect(() => { setToolBadge('catastrofes', 'alertas', activeAlerts.length > 0); }, [activeAlerts.length]);

  // Ferramentas do menu ≡ (src/tools/toolMenus.js → catastrofes)
  useQuickTools('catastrofes', {
    alertas: () => {
      if (!activeAlerts.length) { setMinSeverity(0); showToolToast(t('Sem alertas ativos de gravidade {n} ou mais.', { n: ALERT_MIN })); return; }
      setMinSeverity(ALERT_MIN);
      showToolToast(t('{n} alerta(s) ativo(s).', { n: activeAlerts.length }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    protocolo: () => { setShowProtocol(true); window.scrollTo({ top: 0, behavior: 'smooth' }); },
    gravidade: () => {
      const i = SEVERITY_FILTERS.findIndex((f) => f.min === minSeverity);
      const next = SEVERITY_FILTERS[(i + 1) % SEVERITY_FILTERS.length];
      setMinSeverity(next.min);
      showToolToast(t(next.label));
    },
    atualizar: () => { showToolToast(t('A atualizar…')); fetchData(true); },
  });

  const fetchData = async (isRefresh = false) => {
    try {
      // Try to load from cache first
      const cached = localStorage.getItem('catastrophe_cache');
      if (cached && !navigator.onLine) {
        const cachedData = JSON.parse(cached);
        setArticles(cachedData.articles);
        setLoading(false);
        setIsOffline(true);
        return;
      }

      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      
      const data = await base44.integrations.Core.InvokeLLM({
      prompt: `Fornece as 8 catástrofes naturais e desastres mais recentes a nível global. Data atual: ${new Date().toISOString().split('T')[0]}. Inclui terramotos, tsunamis, erupções vulcânicas, furacões, inundações, incêndios florestais, etc. Para cada dá severidade de 1-10.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          articles: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                summary: { type: "string" },
                severity: { type: "number" },
                region: { type: "string" },
                source: { type: "string" },
                category: { type: "string" }
              }
            }
          }
        }
      }
    });
    
      const processedArticles = (data.articles || []).map(a => ({ ...a, category: 'catastrofe' }));
      setArticles(processedArticles);
      
      // Cache the data
      localStorage.setItem('catastrophe_cache', JSON.stringify({
        articles: processedArticles,
        timestamp: Date.now()
      }));
      
      setLoading(false);
      setRefreshing(false);
      setIsOffline(false);
    } catch (err) {
      // Try to load from cache on error
      const cached = localStorage.getItem('catastrophe_cache');
      if (cached) {
        const cachedData = JSON.parse(cached);
        setArticles(cachedData.articles);
        setIsOffline(true);
      } else {
        setError(err.message || t('Erro ao carregar dados'));
      }
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { 
    fetchData();
    
    // Listen for online/offline events
    const handleOnline = () => {
      setIsOffline(false);
      fetchData(false);
    };
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Auto-refresh every hour (only if online and no error)
    const interval = setInterval(() => {
      if (!error && navigator.onLine) {
        fetchData(false);
      }
    }, 3600000);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [error]);

  return (
    <div className="p-4">
      {/* Offline Indicator */}
      {isOffline && (
        <div className="mb-4 p-3 rounded-sm flex items-center gap-2" style={{ 
          background: '#ff660022', 
          border: '1px solid #ff660044' 
        }}>
          <AlertTriangle size={14} style={{ color: '#ff6600' }} />
          <span className="text-xs" style={{ color: '#ff6600cc' }}>
            {t('Modo Offline - Dados em cache do')}{' '}{localStorage.getItem('catastrophe_cache') ? 
              new Date(JSON.parse(localStorage.getItem('catastrophe_cache')).timestamp).toLocaleString(locale()) : t('último carregamento')}
          </span>
        </div>
      )}
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} style={{ color: '#ff6600' }} />
          <h2 className="text-sm uppercase tracking-wider font-bold" style={{ color: 'rgb(var(--c))' }}>
            {t('Catástrofes & Desastres')}
          </h2>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="p-2 rounded-sm transition-all hover:bg-white/5"
          style={{ color: 'rgb(var(--c) / 0.53)' }}
        >
          {refreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        </button>
      </div>

      {/* Protocolo de emergência (ferramenta do menu ≡) */}
      {showProtocol && (
        <div className="mb-4 p-3 rounded-sm" style={{ background: '#ff000011', border: '1px solid #ff444466' }}>
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert size={14} style={{ color: '#ff5555' }} />
            <h3 className="flex-1 text-xs uppercase tracking-wider font-bold" style={{ color: '#ff7777' }}>{t('Protocolo de emergência')}</h3>
            <button type="button" onClick={() => setShowProtocol(false)} aria-label={t('Fechar')} className="p-1"><X size={14} style={{ color: '#ff7777' }} /></button>
          </div>
          <ol className="list-decimal pl-5 flex flex-col gap-1 text-xs" style={{ color: 'rgb(var(--c) / 0.85)' }}>
            {PROTOCOL.map((p) => <li key={p}>{t(p)}</li>)}
          </ol>
        </div>
      )}

      {minSeverity > 0 && articles.length > 0 && (
        <div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-wider" style={{ color: 'rgb(var(--c) / 0.7)' }}>
          <span>{t((SEVERITY_FILTERS.find((f) => f.min === minSeverity) || SEVERITY_FILTERS[0]).label)} · {shown.length}/{articles.length}</span>
          <button type="button" onClick={() => setMinSeverity(0)} className="underline">{t('Mostrar todas')}</button>
        </div>
      )}

      {loading && articles.length === 0 ? (
        <div className="flex flex-col items-center py-12">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
            <Loader2 size={24} style={{ color: 'rgb(var(--c))' }} />
          </motion.div>
          <p className="mt-3 text-[10px] uppercase tracking-widest" style={{ color: 'rgb(var(--c) / 0.4)' }}>
            {t('A MONITORIZAR EVENTOS...')}
          </p>
        </div>
      ) : error && articles.length === 0 ? (
        <div className="flex flex-col items-center py-12 px-4">
          <AlertTriangle size={32} style={{ color: '#ff6600' }} />
          <p className="mt-3 text-xs uppercase tracking-wider text-center" style={{ color: '#ff6600' }}>
            {t('ERRO AO CARREGAR DADOS')}
          </p>
          <p className="mt-2 text-xs text-center leading-relaxed" style={{ color: 'rgb(var(--c) / 0.53)' }}>
            {error}
          </p>
          <button
            onClick={() => fetchData()}
            className="mt-4 px-4 py-2 rounded-sm text-xs uppercase tracking-wider"
            style={{ background: 'rgb(var(--c) / 0.13)', border: '1px solid rgb(var(--c) / 0.2)', color: 'rgb(var(--c))' }}
          >
            {t('Tentar Novamente')}
          </button>
        </div>
      ) : (
        <div>
          {shown.map((article, i) => (
            <NewsCard key={i} article={article} index={i} />
          ))}
          {articles.length > 0 && shown.length === 0 && (
            <p className="text-center text-xs py-8" style={{ color: 'rgb(var(--c) / 0.45)' }}>{t('Nenhum evento com esta gravidade.')}</p>
          )}
          {articles.length === 0 && (
            <p className="text-center text-xs py-8" style={{ color: 'rgb(var(--c) / 0.33)' }}>
              {t('Sem dados disponíveis')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
