import React from 'react';
import { motion } from 'framer-motion';
import { alpha } from '../theme';

export default function ThreatGauge({ label, value, maxValue = 10, color = 'rgb(var(--c))' }) {
  const percentage = Math.min((value / maxValue) * 100, 100);
  
  const getColor = () => {
    if (value >= 8) return '#ff0000';
    if (value >= 6) return '#ff6600';
    if (value >= 4) return '#ffaa00';
    return 'rgb(var(--c))';
  };
  
  const gaugeColor = getColor();
  
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs uppercase tracking-wider" style={{ color: 'rgb(var(--c) / 0.8)' }}>
          {label}
        </span>
        <span className="text-xs font-bold" style={{ color: gaugeColor }}>
          {value.toFixed(1)}/{maxValue}
        </span>
      </div>
      
      <div className="relative h-4 rounded-sm overflow-hidden" style={{ 
        background: 'rgb(var(--cd))',
        border: '1px solid rgb(var(--c) / 0.2)',
      }}>
        {/* Grid lines */}
        <div className="absolute inset-0 flex">
          {Array.from({ length: 10 }).map((_, i) => (
            <div 
              key={i} 
              className="flex-1 border-r" 
              style={{ borderColor: 'rgb(var(--c) / 0.08)' }}
            />
          ))}
        </div>
        
        {/* Fill bar */}
        <motion.div
          className="h-full relative"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          style={{
            background: `linear-gradient(90deg, ${alpha(gaugeColor, '44')}, ${gaugeColor})`,
            boxShadow: `0 0 10px ${alpha(gaugeColor, '66')}, inset 0 0 5px ${alpha(gaugeColor, '33')}`,
          }}
        >
          {/* Glow pulse */}
          <motion.div
            className="absolute right-0 top-0 bottom-0 w-2"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{ background: gaugeColor, filter: `blur(3px)` }}
          />
        </motion.div>
      </div>
    </div>
  );
}
