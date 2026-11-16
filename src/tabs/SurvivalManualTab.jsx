import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Shield } from 'lucide-react';
import { manualSections } from '@/data/survivalManual';

function ManualSection({ section }) {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = section.icon;

  return (
    <div className="mb-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 p-3 rounded-sm transition-all text-left"
        style={{
          background: isOpen ? '#00ff4110' : '#001a0033',
          border: `1px solid ${isOpen ? '#00ff4133' : '#00ff4111'}`,
        }}
      >
        <Icon size={16} style={{ color: '#00ff41' }} />
        <span className="text-xs uppercase tracking-wider font-bold flex-1" style={{ color: '#00ff41cc' }}>
          {section.title}
        </span>
        {isOpen ? (
          <ChevronDown size={14} style={{ color: '#00ff4188' }} />
        ) : (
          <ChevronRight size={14} style={{ color: '#00ff4188' }} />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-4 text-xs leading-relaxed whitespace-pre-line"
              style={{ color: '#00ff4199', borderLeft: '2px solid #00ff4122', marginLeft: '8px' }}>
              {section.image && (
                <div className="mb-3 rounded-sm overflow-hidden" style={{ border: '1px solid #00ff4133', background: '#0a0a0a' }}>
                  <img
                    src={section.image}
                    alt={`Diagrama ilustrativo: ${section.title}`}
                    loading="lazy"
                    className="w-full h-auto"
                    style={{ display: 'block', filter: 'brightness(0.95)' }}
                  />
                  <p className="text-[9px] uppercase tracking-wider p-1.5 text-center" style={{ color: '#00ff4166' }}>
                    📐 Diagrama Técnico — {section.title}
                  </p>
                </div>
              )}
              {section.content.split('**').map((part, i) =>
                i % 2 === 0 ? part : <strong key={i} style={{ color: '#00ff41' }}>{part}</strong>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SurvivalManualTab() {
  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Shield size={16} style={{ color: '#00ff41' }} />
        <h2 className="text-sm uppercase tracking-wider font-bold" style={{ color: '#00ff41' }}>
          Manual de Sobrevivência Tático
        </h2>
      </div>

      <div className="p-3 rounded-sm mb-4" style={{ background: '#ffaa0011', border: '1px solid #ffaa0033' }}>
        <p className="text-[10px] uppercase tracking-wider" style={{ color: '#ffaa0099' }}>
          ⚠️ Manual tático avançado — FM 21-76 / SAS Handbook. Em emergência real, contacte 112.
        </p>
      </div>

      <div className="p-2 rounded-sm mb-4" style={{ background: '#00ff4110', border: '1px solid #00ff4133' }}>
        <p className="text-[10px]" style={{ color: '#00ff4199' }}>
          📚 {manualSections.length} secções táticas | 📐 Diagramas ilustrativos em secções-chave
        </p>
      </div>

      {manualSections.map(section => (
        <ManualSection key={section.id} section={section} />
      ))}
    </div>
  );
}
