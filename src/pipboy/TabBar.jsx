import React from 'react';
import { motion } from 'framer-motion';
import { usePipBoySound } from './usePipBoySound';

export default function TabBar({ tabs, activeTab, onTabChange, compact = false }) {
  const { playTabSound } = usePipBoySound();
  
  const handleTabClick = (tabId) => {
    playTabSound();
    onTabChange(tabId);
  };
  
  return (
    <div 
      className="fixed bottom-0 left-0 right-0 flex overflow-x-auto no-scrollbar z-50" 
      style={{ 
        borderTop: '1px solid rgb(var(--c) / 0.2)',
        background: 'rgb(var(--cd) / 0.6)',
        backdropFilter: 'blur(10px)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => handleTabClick(tab.id)}
          className="relative px-3 py-3 text-xs uppercase tracking-wider whitespace-nowrap transition-all flex flex-col items-center gap-1 flex-1 shrink-0"
          aria-label={tab.label}
          style={{
            color: activeTab === tab.id ? 'rgb(var(--c))' : 'rgb(var(--c) / 0.33)',
            background: activeTab === tab.id ? 'rgb(var(--c) / 0.06)' : 'transparent',
            fontSize: '10px',
            minWidth: compact ? 44 : 68,
          }}
        >
          {tab.icon && <tab.icon size={16} />}
          {!compact && <span className="truncate w-full text-center">{tab.label}</span>}
          
          {activeTab === tab.id && (
            <motion.div
              layoutId="activeTab"
              className="absolute top-0 left-0 right-0 h-[2px]"
              style={{ background: 'rgb(var(--c))' }}
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
          
          {tab.alert && (
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#ff0000' }} />
          )}
        </button>
      ))}
    </div>
  );
}
