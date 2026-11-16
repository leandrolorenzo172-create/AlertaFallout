import React from 'react';
import { motion } from 'framer-motion';
import { usePipBoySound } from './usePipBoySound';

export default function TabBar({ tabs, activeTab, onTabChange }) {
  const { playTabSound } = usePipBoySound();
  
  const handleTabClick = (tabId) => {
    playTabSound();
    onTabChange(tabId);
  };
  
  return (
    <div 
      className="fixed bottom-0 left-0 right-0 flex overflow-x-auto no-scrollbar z-50" 
      style={{ 
        borderTop: '1px solid #00ff4133',
        background: '#001a0099',
        backdropFilter: 'blur(10px)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => handleTabClick(tab.id)}
          className="relative px-3 py-3 text-xs uppercase tracking-wider whitespace-nowrap transition-all flex flex-col items-center gap-1 flex-1 shrink-0 min-w-[68px]"
          style={{
            color: activeTab === tab.id ? '#00ff41' : '#00ff4155',
            background: activeTab === tab.id ? '#00ff4110' : 'transparent',
            fontSize: '10px',
          }}
        >
          {tab.icon && <tab.icon size={16} />}
          <span className="truncate w-full text-center">{tab.label}</span>
          
          {activeTab === tab.id && (
            <motion.div
              layoutId="activeTab"
              className="absolute top-0 left-0 right-0 h-[2px]"
              style={{ background: '#00ff41' }}
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
