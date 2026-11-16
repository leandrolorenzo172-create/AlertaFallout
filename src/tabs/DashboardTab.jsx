import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Loader2, Shield, Skull, AlertTriangle, Globe, TrendingUp } from 'lucide-react';
import ThreatGauge from '../pipboy/ThreatGauge';

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
        setError(err.message || 'Erro ao carregar dados');
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
          <Shield size={40} style={{ color: '#00ff41' }} />
        </motion.div>
        <motion.p
          className="mt-4 text-xs uppercase tracking-[0.3em]"
          style={{ color: '#00ff4188' }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          A ANALISAR AMEAÇAS GLOBAIS...
        </motion.p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center py-16 px-4">
        <AlertTriangle size={40} style={{ color: '#ff6600' }} />
        <p className="mt-4 text-xs uppercase tracking-wider text-center" style={{ color: '#ff6600' }}>
          ERRO AO CARREGAR DADOS
        </p>
        <p className="mt-2 text-xs text-center leading-relaxed" style={{ color: '#00ff4188' }}>
          {error}
        </p>
        <button
          onClick={fetchOverview}
          className="mt-4 px-4 py-2 rounded-sm text-xs uppercase tracking-wider"
          style={{ background: '#00ff4122', border: '1px solid #00ff4133', color: '#00ff41' }}
        >
          Tentar Novamente
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
            Modo Offline - Dados em cache do {data && localStorage.getItem('dashboard_cache') ? 
              new Date(JSON.parse(localStorage.getItem('dashboard_cache')).timestamp).toLocaleString('pt-PT') : 'último carregamento'}
          </span>
        </div>
      )}
      
      {/* Global Threat Level */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center mb-6 p-6 rounded-sm"
        style={{ background: '#001a0044', border: '1px solid #00ff4122' }}
      >
        <p className="text-[10px] uppercase tracking-[0.3em] mb-2" style={{ color: '#00ff4166' }}>
          NÍVEL DE AMEAÇA GLOBAL
        </p>
        <div className="text-6xl md:text-7xl font-bold mb-3" style={{ 
          color: data?.global_threat_level >= 8 ? '#ff0000' : data?.global_threat_level >= 6 ? '#ff6600' : data?.global_threat_level >= 4 ? '#ffaa00' : '#00ff41',
          textShadow: `0 0 30px ${data?.global_threat_level >= 8 ? '#ff000044' : data?.global_threat_level >= 6 ? '#ff660044' : '#00ff4144'}`,
        }}>
          {(data?.global_threat_level || 0).toFixed(1)}
        </div>
        <ThreatGauge label="Composto Global" value={data?.global_threat_level || 0} />
      </motion.div>

      {/* Individual Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="p-4 rounded-sm" style={{ background: '#001a0033', border: '1px solid #00ff4111' }}>
          <ThreatGauge label="⚔️ Risco de Guerra" value={data?.war_risk || 0} />
          <ThreatGauge label="🌍 Tensão Geopolítica" value={data?.geopolitical_tension || 0} />
          <ThreatGauge label="🌋 Catástrofes Naturais" value={data?.natural_disaster_risk || 0} />
        </div>
        <div className="p-4 rounded-sm" style={{ background: '#001a0033', border: '1px solid #00ff4111' }}>
          <ThreatGauge label="📉 Instab. Económica" value={data?.economic_instability || 0} />
          <ThreatGauge label="💻 Risco Cibernético" value={data?.cyber_risk || 0} />
          <div className="mt-4 p-3 rounded-sm" style={{ background: '#001a0022' }}>
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: '#00ff4155' }}>Resumo</p>
            <p className="text-xs leading-relaxed" style={{ color: '#00ff4199' }}>{data?.summary}</p>
          </div>
        </div>
      </div>

      {/* Critical Events */}
      {data?.critical_events?.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-wider font-bold mb-3" style={{ color: '#00ff4188' }}>
            ⚠️ Eventos Críticos Ativos
          </h3>
          {data.critical_events.map((event, i) => {
            const Icon = getSeverityIcon(event.type);
            const color = event.severity >= 8 ? '#ff0000' : event.severity >= 6 ? '#ff6600' : event.severity >= 4 ? '#ffaa00' : '#00ff41';
            
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-3 p-3 mb-2 rounded-sm"
                style={{ background: `${color}08`, border: `1px solid ${color}22`, borderLeft: `3px solid ${color}` }}
              >
                <Icon size={16} style={{ color }} />
                <div className="flex-1">
                  <h4 className="text-xs font-bold" style={{ color: '#00ff41cc' }}>{event.title}</h4>
                  {event.region && <span className="text-[10px]" style={{ color: '#00ff4155' }}>{event.region}</span>}
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
