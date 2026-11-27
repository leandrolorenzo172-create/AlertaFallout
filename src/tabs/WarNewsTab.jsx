import React, { useState, useEffect, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Skull, RefreshCw, Loader2, AlertTriangle, Search, X } from 'lucide-react';
import { invalidateNews } from '@/api/liveData';
import { plainText } from '@/lib/plainText';
import { useWarTools, reportWar, onWarRefresh, ALERT_SEV, setWarQuery, openWarSearch, warFiltered, clearWarFilters } from '@/war/warTools';
import NewsCard from '../pipboy/NewsCard';
import { t, locale } from '@/i18n';

export default function WarNewsTab() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const fetchNews = async (isRefresh = false) => {
    try {
      // Try to load from cache first
      const cached = localStorage.getItem('war_news_cache');
      if (cached && !navigator.onLine) {
        const cachedData = JSON.parse(cached);
        setArticles(cachedData.articles);
        setLoading(false);
        setIsOffline(true);
        return;
      }

      if (isRefresh) { setRefreshing(true); invalidateNews(); } // atualizar: ignora a cópia em memória
      else setLoading(true);
      setError(null);
      reportWar({ loading: true });
      
      const data = await base44.integrations.Core.InvokeLLM({
      prompt: `Fornece as 8 notícias mais recentes e relevantes sobre guerras ativas, conflitos armados, preparação militar, e tensões bélicas globais. Data atual: ${new Date().toISOString().split('T')[0]}. Inclui conflitos como Ucrânia-Rússia, Médio Oriente, e qualquer novo conflito. Para cada notícia dá severidade de 1-10.`,
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
                category: { type: "string", enum: ["guerra", "preparacao_guerra"] }
              }
            }
          }
        }
      }
    });
    
      setArticles(data.articles || []);
      
      // Cache the data
      localStorage.setItem('war_news_cache', JSON.stringify({
        articles: data.articles || [],
        timestamp: Date.now()
      }));
      
      setLoading(false);
      setRefreshing(false);
      setIsOffline(false);
      reportWar({ loading: false, lastSync: Date.now() });
    } catch (err) {
      // Try to load from cache on error
      const cached = localStorage.getItem('war_news_cache');
      if (cached) {
        const cachedData = JSON.parse(cached);
        setArticles(cachedData.articles);
        setIsOffline(true);
      } else {
        setError(err.message || t('Erro ao carregar notícias'));
      }
      setLoading(false);
      setRefreshing(false);
      reportWar({ loading: false });
    }
  };

  useEffect(() => { 
    fetchNews();
    
    // Listen for online/offline events
    const handleOnline = () => {
      setIsOffline(false);
      fetchNews(false);
    };
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Auto-refresh every hour (only if online and no error)
    const interval = setInterval(() => {
      if (!error && navigator.onLine) {
        fetchNews(false);
      }
    }, 3600000);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [error]);

  // ---------- Filtros do menu ≡ (alertas, gravidade, região, palavra-chave) ----------
  const tools = useWarTools();
  const refreshRef = useRef(fetchNews); refreshRef.current = fetchNews;
  useEffect(() => onWarRefresh(() => refreshRef.current(true)), []);
  const clean = useMemo(() => articles.map((a) => ({ ...a, title: plainText(a.title), summary: plainText(a.summary), sev: Math.round(Number(a.severity) || 0) })), [articles]);
  useEffect(() => {
    const counts = {}; clean.forEach((a) => { const r = a.region || 'Global'; counts[r] = (counts[r] || 0) + 1; });
    reportWar({ alertCount: clean.filter((a) => a.sev >= ALERT_SEV).length, regions: Object.entries(counts).sort((x, y) => y[1] - x[1]) });
  }, [clean]);
  const norm = (x) => String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const shown = useMemo(() => {
    const words = norm(tools.query).split(/\s+/).filter(Boolean);
    return clean.filter((a) => (!tools.alertsOnly || a.sev >= ALERT_SEV) && a.sev >= tools.minSev && (!tools.region || (a.region || 'Global') === tools.region)
      && (!words.length || words.every((w) => norm(`${a.title} ${a.summary} ${a.source} ${a.region}`).includes(w))));
  }, [clean, tools.alertsOnly, tools.minSev, tools.region, tools.query]);
  const searchRef = useRef(null);
  useEffect(() => { if (tools.searchOpen) setTimeout(() => searchRef.current?.focus(), 200); }, [tools.searchOpen]);

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
            {t('Modo Offline - Dados em cache do')}{' '}{localStorage.getItem('war_news_cache') ? 
              new Date(JSON.parse(localStorage.getItem('war_news_cache')).timestamp).toLocaleString(locale()) : t('último carregamento')}
          </span>
        </div>
      )}
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Skull size={16} style={{ color: '#ff0000' }} />
          <h2 className="text-sm uppercase tracking-wider font-bold" style={{ color: 'rgb(var(--c))' }}>
            {t('Notícias de Guerra & Conflitos')}
          </h2>
        </div>
        <button
          onClick={() => fetchNews(true)}
          disabled={refreshing}
          className="p-2 rounded-sm transition-all hover:bg-white/5"
          style={{ color: 'rgb(var(--c) / 0.53)' }}
        >
          {refreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        </button>
      </div>

      {loading && articles.length === 0 ? (
        <div className="flex flex-col items-center py-12">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
            <Loader2 size={24} style={{ color: 'rgb(var(--c))' }} />
          </motion.div>
          <p className="mt-3 text-[10px] uppercase tracking-widest" style={{ color: 'rgb(var(--c) / 0.4)' }}>
            {t('A ANALISAR TRANSMISSÕES...')}
          </p>
        </div>
      ) : error && articles.length === 0 ? (
        <div className="flex flex-col items-center py-12 px-4">
          <Skull size={32} style={{ color: '#ff0000' }} />
          <p className="mt-3 text-xs uppercase tracking-wider text-center" style={{ color: '#ff0000' }}>
            {t('ERRO AO CARREGAR NOTÍCIAS')}
          </p>
          <p className="mt-2 text-xs text-center leading-relaxed" style={{ color: 'rgb(var(--c) / 0.53)' }}>
            {error}
          </p>
          <button
            onClick={() => fetchNews()}
            className="mt-4 px-4 py-2 rounded-sm text-xs uppercase tracking-wider"
            style={{ background: 'rgb(var(--c) / 0.13)', border: '1px solid rgb(var(--c) / 0.2)', color: 'rgb(var(--c))' }}
          >
            {t('Tentar Novamente')}
          </button>
        </div>
      ) : (
        <div id="guerra-lista" className="scroll-mt-20 rounded-sm">
          {(tools.searchOpen || tools.query) && (
            <label className="flex items-center gap-2 px-2 py-1.5 mb-3 rounded-sm" style={{ background: 'rgb(var(--cb) / 0.7)', border: '1px solid rgb(var(--c) / 0.35)' }}>
              <Search size={13} style={{ color: 'rgb(var(--c) / 0.6)' }} />
              <input ref={searchRef} value={tools.query} onChange={(e) => setWarQuery(e.target.value)} placeholder={t('País, líder, rota marítima, ataque, cessar-fogo, fonte…')}
                className="flex-1 min-w-0 bg-transparent outline-none text-xs" style={{ color: 'rgb(var(--c))' }} />
              <button type="button" onClick={() => openWarSearch(false)} aria-label={t('Fechar pesquisa')}><X size={13} style={{ color: 'rgb(var(--c) / 0.6)' }} /></button>
            </label>
          )}
          {warFiltered(tools) && (
            <p className="text-[10px] uppercase tracking-wider mb-2 flex flex-wrap gap-2 items-center" style={{ color: 'rgb(var(--c) / 0.6)' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#ff0000' }} />
              {tools.alertsOnly && <span style={{ color: '#ef4444' }}>{t('Só alertas ativos')}</span>}
              {tools.minSev > 0 && <span>≥ {tools.minSev}/10</span>}
              {tools.region && <span>{t(tools.region)}</span>}
              {tools.query.trim() && <span>«{tools.query.trim()}»</span>}
              <span>· {shown.length}/{clean.length}</span>
              <button type="button" onClick={clearWarFilters} className="ml-auto px-2 py-0.5 rounded-sm" style={{ border: '1px solid #ef444488', color: '#ef4444' }}>{t('Limpar filtros')}</button>
            </p>
          )}
          {shown.map((article, i) => (
            <NewsCard key={`${article.title}-${i}`} article={article} index={i} />
          ))}
          {clean.length > 0 && shown.length === 0 && <p className="text-center text-xs py-6" style={{ color: 'rgb(var(--c) / 0.4)' }}>{t('Sem resultados com estes filtros.')}</p>}
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
