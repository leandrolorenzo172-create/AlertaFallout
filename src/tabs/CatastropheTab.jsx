import React, { useState, useEffect, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Loader2, Search, X } from 'lucide-react';
import { invalidateNews } from '@/api/liveData';
import { plainText } from '@/lib/plainText';
import { useCatTools, reportCat, onCatRefresh, ACTIVE_SEV, CAT_FILTERS, setCatQuery, openCatSearch, catFiltered, clearCatFilters } from '@/catastrophe/catTools';
import EmergencyProtocol from '@/catastrophe/EmergencyProtocol';
import NewsCard from '../pipboy/NewsCard';
import { t, locale } from '@/i18n';

export default function CatastropheTab() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

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

      if (isRefresh) { setRefreshing(true); invalidateNews(); }
      else setLoading(true);
      setError(null);
      reportCat({ loading: true });
      
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
      reportCat({ loading: false, lastSync: Date.now() });
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
      reportCat({ loading: false });
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

  // ---------- Menu ≡: alertas ativos, gravidade/tipo, pesquisa e protocolo ----------
  const tools = useCatTools();
  const refreshRef = useRef(fetchData); refreshRef.current = fetchData;
  useEffect(() => onCatRefresh(() => refreshRef.current(true)), []);
  const norm = (x) => String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // texto limpo (sem <p>, <br>…) antes de mostrar ou filtrar
  const clean = useMemo(() => articles.map((a) => {
    const title = plainText(a.title); const summary = plainText(a.summary);
    return { ...a, title, summary, sev: Math.round(Number(a.severity) || 0), txt: norm(`${title} ${summary} ${a.region || ''} ${a.source || ''}`) };
  }), [articles]);
  useEffect(() => { reportCat({ activeCount: clean.filter((a) => a.sev >= ACTIVE_SEV).length }); }, [clean]);
  const shown = useMemo(() => {
    const f = CAT_FILTERS.find((x) => x.id === tools.filter);
    const words = norm(tools.query).split(/\s+/).filter(Boolean);
    return clean.filter((a) => (!tools.activeOnly || a.sev >= ACTIVE_SEV) && (!f?.test || f.test(a)) && words.every((w) => a.txt.includes(w)));
  }, [clean, tools.activeOnly, tools.filter, tools.query]);
  const searchRef = useRef(null);
  useEffect(() => { if (tools.searchOpen) setTimeout(() => searchRef.current?.focus(), 200); }, [tools.searchOpen]);

  return (
    <div className="p-4">
      {tools.protocol && <EmergencyProtocol />}
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
        <div id="cat-lista" className="scroll-mt-20 rounded-sm">
          {(tools.searchOpen || tools.query) && (
            <label className="flex items-center gap-2 px-2 py-1.5 mb-3 rounded-sm" style={{ background: 'rgb(var(--cb) / 0.7)', border: '1px solid rgb(var(--c) / 0.35)' }}>
              <Search size={13} style={{ color: 'rgb(var(--c) / 0.6)' }} />
              <input ref={searchRef} value={tools.query} onChange={(e) => setCatQuery(e.target.value)} placeholder={t('Região, distrito, país ou palavra (sismo, incêndio, IPMA…)')}
                className="flex-1 min-w-0 bg-transparent outline-none text-xs" style={{ color: 'rgb(var(--c))' }} />
              <button type="button" onClick={() => openCatSearch(false)} aria-label={t('Fechar pesquisa')}><X size={13} style={{ color: 'rgb(var(--c) / 0.6)' }} /></button>
            </label>
          )}
          {catFiltered(tools) && (
            <p className="text-[10px] uppercase tracking-wider mb-2 flex flex-wrap gap-2 items-center" style={{ color: 'rgb(var(--c) / 0.6)' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#ff0000' }} />
              {tools.activeOnly && <span style={{ color: '#ef4444' }}>{t('Só alertas ativos')}</span>}
              {tools.filter && <span>{t(CAT_FILTERS.find((x) => x.id === tools.filter).label)}</span>}
              {tools.query.trim() && <span>«{tools.query.trim()}»</span>}
              <span>· {shown.length}/{clean.length}</span>
              <button type="button" onClick={clearCatFilters} className="ml-auto px-2 py-0.5 rounded-sm" style={{ border: '1px solid #ef444488', color: '#ef4444' }}>{t('Limpar filtros')}</button>
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
