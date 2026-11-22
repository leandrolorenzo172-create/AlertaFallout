import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Radio, Shield, Wifi, WifiOff } from 'lucide-react';
import { t, locale } from '@/i18n';

export default function StatusBar({ threatLevel = 0 }) {
  const [time, setTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      clearInterval(timer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  const getStatusColor = () => {
    if (threatLevel >= 8) return '#ff0000';
    if (threatLevel >= 6) return '#ff6600';
    if (threatLevel >= 4) return '#ffaa00';
    return 'rgb(var(--c))';
  };
  
  const getStatusText = () => {
    if (threatLevel >= 8) return t('PERIGO EXTREMO');
    if (threatLevel >= 6) return t('ALERTA ELEVADO');
    if (threatLevel >= 4) return t('VIGILÂNCIA');
    return t('ESTÁVEL');
  };
  
  const color = getStatusColor();
  
  return (
    <div className="flex items-center justify-between px-4 py-2" style={{
      background: 'rgb(var(--cd))',
      borderBottom: '1px solid rgb(var(--c) / 0.13)',
    }}>
      <div className="flex items-center gap-3">
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Radio size={12} style={{ color }} />
        </motion.div>
        <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color }}>
          {getStatusText()}
        </span>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Shield size={10} style={{ color: 'rgb(var(--c) / 0.53)' }} />
          <span className="text-[10px]" style={{ color: 'rgb(var(--c) / 0.53)' }}>
            {t('NÍVEL')}{' '}{Math.round(threatLevel)}
          </span>
        </div>
        
        <div className="flex items-center gap-1.5">
          {isOnline ? (
            <Wifi size={10} style={{ color: 'rgb(var(--c))' }} />
          ) : (
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <WifiOff size={10} style={{ color: '#ff6600' }} />
            </motion.div>
          )}
          <span className="text-[10px] tabular-nums" style={{ color: isOnline ? 'rgb(var(--c) / 0.67)' : '#ff6600aa' }}>
            {time.toLocaleTimeString(locale())}
          </span>
        </div>
      </div>
    </div>
  );
}
