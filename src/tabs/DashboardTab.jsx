import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Loader2, Shield, Skull, AlertTriangle, Globe, TrendingUp } from 'lucide-react';
import PipBoyHero from '../pipboy/PipBoyHero';
import { alpha } from '../theme';
import { t, locale } from '@/i18n';

export default function DashboardTab({ onThreatLevelChange }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const fetchOverview = async () => {
    try {
      // Try to load from cache first
      const cached = localStorage.getItem('dashboard_cache');
      if (cached && !navigator.onLine) {
        const cachedData = JSON.parse(cached);
        setData(cachedData.data);
        if (onThreatLevelChange) onThreatLevelChange(cachedData.data.global_threat_level || 0);
        setLoading(false);
        setIsOffline(true);
        return;
      }

      setLoading(true);
      setError(null);
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analisa a situação global atual e fornece indicadores de ameaça. Data: ${new Date().toISOString().split('T')[0]}.

Avalia de 1-10:
1. Risco de guerra global (conflitos ativos, escaladas, ameaças nucleares)
2. Tensão geopolítica (relações EUA-China-Rússia, NATO, alianças)  
3. Ameaça de catástrofes naturais ativas ou iminentes
4. Instabilidade económica global
5. Risco cibernético/infraestrutura
6. Ameaça global composta (média ponderada)

Inclui também os 5 eventos/ameaças mais críticos no momento.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            war_risk: { type: "number" },
            geopolitical_tension: { type: "number" },
            natural_disaster_risk: { type: "number" },
            economic_instability: { type: "number" },
            cyber_risk: { type: "number" },
            global_threat_level: { type: "number" },
            critical_events: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  severity: { type: "number" },
                  type: { type: "string" },
                  region: { type: "string" }
                }
              }
            },
            summary: { type: "string" }
          }
        }
      });
      
      setData(result);
      if (onThreatLevelChange) onThreatLevelChange(result.global_threat_level || 0);
      
      // Cache the data
      localStorage.setItem('dashboard_cache', JSON.stringify({
        data: result,
        timestamp: Date.now()
      }));
      
      setLoading(false);
      setIsOffline(false);
    } catch (err) {
      // Try to load from cache on error
      const cached = localStorage.getItem('dashboard_cache');
      if (cached) {
        const cachedData = JSON.parse(cached);
        setData(cachedData.data);
        if (onThreatLevelChange) onThreatLevelChange(cachedData.data.global_threat_level || 0);
        setIsOffline(true);
      } else {
        setError(err.message || t('Erro ao carregar dados'));
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    
    // Listen for online/offline events
    const handleOnline = () => {
      setIsOffline(false);
      fetchOverview();
    };
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Auto-refresh every hour (only if online and no error)
    const interval = setInterval(() => {
      if (!error && navigator.onLine) {
        fetchOverview();
      }
    }, 3600000);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [error]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center py-16">
        <motion.div
          className="relative"
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        >
          <Shield size={40} style={{ color: 'rgb(var(--c))' }} />
        </motion.div>
        <motion.p
          className="mt-4 text-xs uppercase tracking-[0.3em]"
          style={{ color: 'rgb(var(--c) / 0.53)' }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {t('A ANALISAR AMEAÇAS GLOBAIS...')}
        </motion.p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center py-16 px-4">
        <AlertTriangle size={40} style={{ color: '#ff6600' }} />
        <p className="mt-4 text-xs uppercase tracking-wider text-center" style={{ color: '#ff6600' }}>
          {t('ERRO AO CARREGAR DADOS')}
        </p>
        <p className="mt-2 text-xs text-center leading-relaxed" style={{ color: 'rgb(var(--c) / 0.53)' }}>
          {error}
        </p>
        <button
          onClick={fetchOverview}
          className="mt-4 px-4 py-2 rounded-sm text-xs uppercase tracking-wider"
          style={{ background: 'rgb(var(--c) / 0.13)', border: '1px solid rgb(var(--c) / 0.2)', color: 'rgb(var(--c))' }}
        >
          {t('Tentar Novamente')}
        </button>
      </div>
    );
  }

  const getSeverityIcon = (type) => {
    if (type?.includes('guerra') || type?.includes('war') || type?.includes('militar')) return Skull;
    if (type?.includes('catastrofe') || type?.includes('disaster') || type?.includes('natural')) return AlertTriangle;
    if (type?.includes('geo') || type?.includes('tensao') || type?.includes('politic')) return Globe;
    return TrendingUp;
  };

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
            {t('Modo Offline - Dados em cache do')}{' '}{data && localStorage.getItem('dashboard_cache') ? 
              new Date(JSON.parse(localStorage.getItem('dashboard_cache')).timestamp).toLocaleString(locale()) : t('último carregamento')}
          </span>
        </div>
      )}
      
      <PipBoyHero data={data} />

      {/* A Instabilidade Económica passou para o seu próprio separador; aqui fica só o resumo */}
      <div id="painel-resumo" className="p-4 rounded-sm mb-6" style={{ background: 'rgb(var(--cd) / 0.2)', border: '1px solid rgb(var(--c) / 0.07)' }}>
        <div className="p-3 rounded-sm" style={{ background: 'rgb(var(--cd) / 0.13)' }}>
          <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'rgb(var(--c) / 0.33)' }}>{t('Resumo')}</p>
          <p className="text-xs leading-relaxed" style={{ color: 'rgb(var(--c) / 0.6)' }}>{data?.summary}</p>
        </div>
      </div>

      {/* Critical Events */}
      {data?.critical_events?.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-wider font-bold mb-3" style={{ color: 'rgb(var(--c) / 0.53)' }}>
            {t('⚠️ Eventos Críticos Ativos')}
          </h3>
          {data.critical_events.map((event, i) => {
            const Icon = getSeverityIcon(event.type);
            const color = event.severity >= 8 ? '#ff0000' : event.severity >= 6 ? '#ff6600' : event.severity >= 4 ? '#ffaa00' : 'rgb(var(--c))';
            
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-3 p-3 mb-2 rounded-sm"
                style={{ background: `${alpha(color, '08')}`, border: `1px solid ${alpha(color, '22')}`, borderLeft: `3px solid ${color}` }}
              >
                <Icon size={16} style={{ color }} />
                <div className="flex-1">
                  <h4 className="text-xs font-bold" style={{ color: 'rgb(var(--c) / 0.8)' }}>{event.title}</h4>
                  {event.region && <span className="text-[10px]" style={{ color: 'rgb(var(--c) / 0.33)' }}>{event.region}</span>}
                </div>
                <span className="text-sm font-bold" style={{ color }}>{event.severity}/10</span>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
