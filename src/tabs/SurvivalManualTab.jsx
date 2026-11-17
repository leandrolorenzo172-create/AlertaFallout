import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Shield } from 'lucide-react';
import { manualSections } from '@/data/survivalManual';
import DocLibrary from '../pipboy/DocLibrary';

function ManualSection({ section }) {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = section.icon;

  return (
    <div className="mb-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 p-3 rounded-sm transition-all text-left"
        style={{
          background: isOpen ? 'rgb(var(--c) / 0.06)' : 'rgb(var(--cd) / 0.2)',
          border: `1px solid ${isOpen ? 'rgb(var(--c) / 0.2)' : 'rgb(var(--c) / 0.07)'}`,
        }}
      >
        <Icon size={16} style={{ color: 'rgb(var(--c))' }} />
        <span className="text-xs uppercase tracking-wider font-bold flex-1" style={{ color: 'rgb(var(--c) / 0.8)' }}>
          {section.title}
        </span>
        {isOpen ? (
          <ChevronDown size={14} style={{ color: 'rgb(var(--c) / 0.53)' }} />
        ) : (
          <ChevronRight size={14} style={{ color: 'rgb(var(--c) / 0.53)' }} />
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
              style={{ color: 'rgb(var(--c) / 0.6)', borderLeft: '2px solid rgb(var(--c) / 0.13)', marginLeft: '8px' }}>
              {section.image && (
                <div className="mb-3 rounded-sm overflow-hidden" style={{ border: '1px solid rgb(var(--c) / 0.2)', background: '#0a0a0a' }}>
                  <img
                    src={section.image}
                    alt={`Diagrama ilustrativo: ${section.title}`}
                    loading="lazy"
                    className="w-full h-auto"
                    style={{ display: 'block', filter: 'brightness(0.95)' }}
                  />
                  <p className="text-[9px] uppercase tracking-wider p-1.5 text-center" style={{ color: 'rgb(var(--c) / 0.4)' }}>
                    📐 Diagrama Técnico — {section.title}
                  </p>
                </div>
              )}
              {section.content.split('**').map((part, i) =>
                i % 2 === 0 ? part : <strong key={i} style={{ color: 'rgb(var(--c))' }}>{part}</strong>
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
        <Shield size={16} style={{ color: 'rgb(var(--c))' }} />
        <h2 className="text-sm uppercase tracking-wider font-bold" style={{ color: 'rgb(var(--c))' }}>
          Manual de Sobrevivência Tático
        </h2>
      </div>

      <div className="p-3 rounded-sm mb-4" style={{ background: '#ffaa0011', border: '1px solid #ffaa0033' }}>
        <p className="text-[10px] uppercase tracking-wider" style={{ color: '#ffaa0099' }}>
          ⚠️ Manual tático avançado — FM 21-76 / SAS Handbook. Em emergência real, contacte 112.
        </p>
      </div>

      <div className="p-2 rounded-sm mb-4" style={{ background: 'rgb(var(--c) / 0.06)', border: '1px solid rgb(var(--c) / 0.2)' }}>
        <p className="text-[10px]" style={{ color: 'rgb(var(--c) / 0.6)' }}>
          📚 {manualSections.length} secções táticas | 📐 Diagramas ilustrativos em secções-chave
        </p>
      </div>

      <DocLibrary />

      {manualSections.map(section => (
        <ManualSection key={section.id} section={section} />
      ))}
    </div>
  );
}
