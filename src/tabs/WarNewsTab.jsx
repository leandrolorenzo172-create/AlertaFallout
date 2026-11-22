import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Skull, RefreshCw, Loader2, AlertTriangle } from 'lucide-react';
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

      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      
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
        <div>
          {articles.map((article, i) => (
            <NewsCard key={i} article={article} index={i} />
          ))}
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
