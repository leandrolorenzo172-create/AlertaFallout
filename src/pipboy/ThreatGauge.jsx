import React from 'react';
import { motion } from 'framer-motion';

export default function ThreatGauge({ label, value, maxValue = 10, color = '#00ff41' }) {
  const percentage = Math.min((value / maxValue) * 100, 100);
  
  const getColor = () => {
    if (value >= 8) return '#ff0000';
    if (value >= 6) return '#ff6600';
    if (value >= 4) return '#ffaa00';
    return '#00ff41';
  };
  
  const gaugeColor = getColor();
  
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs uppercase tracking-wider" style={{ color: '#00ff41cc' }}>
          {label}
        </span>
        <span className="text-xs font-bold" style={{ color: gaugeColor }}>
          {value.toFixed(1)}/{maxValue}
        </span>
      </div>
      
      <div className="relative h-4 rounded-sm overflow-hidden" style={{ 
        background: '#001a00',
        border: '1px solid #00ff4133',
      }}>
        {/* Grid lines */}
        <div className="absolute inset-0 flex">
          {Array.from({ length: 10 }).map((_, i) => (
            <div 
              key={i} 
              className="flex-1 border-r" 
              style={{ borderColor: '#00ff4115' }}
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
            background: `linear-gradient(90deg, ${gaugeColor}44, ${gaugeColor})`,
            boxShadow: `0 0 10px ${gaugeColor}66, inset 0 0 5px ${gaugeColor}33`,
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
