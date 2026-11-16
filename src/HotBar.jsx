import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, Menu, Shield, Skull, AlertTriangle, Cloud, TrendingUp, Bot, Book, MapPin, Bell, Radio as RadioIcon, BrainCircuit } from 'lucide-react';
import { usePipBoySound } from './usePipBoySound';

export const TABS = [
  { id: 'dashboard', path: '/dashboard', label: 'Painel', icon: Shield, alert: true },
  { id: 'guerra', path: '/guerra', label: 'Guerra', icon: Skull, alert: true },
  { id: 'catastrofes', path: '/catastrofes', label: 'Catástrofes', icon: AlertTriangle },
  { id: 'meteo', path: '/meteo', label: 'Meteo', icon: Cloud },
  { id: 'radio', path: '/radio', label: 'Rádio FM', icon: RadioIcon },
  { id: 'pizza', path: '/pizza', label: 'Pizza', icon: TrendingUp },
  { id: 'assistente', path: '/assistente', label: 'IA', icon: Bot },
  { id: 'conhecimento', path: '/conhecimento', label: 'Ficheiros IA', icon: BrainCircuit },
  { id: 'manual', path: '/manual', label: 'Manual', icon: Book },
  { id: 'mapa', path: '/mapa', label: 'Mapa', icon: MapPin },
  { id: 'alertas', path: '/alertas', label: 'Alertas', icon: Bell },
];

export default function HotBar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { playTabSound, playSelectSound } = usePipBoySound();

  const activeTab = TABS.find(tab => location.pathname === tab.path)?.id || 'dashboard';

  const handleToggle = () => {
    playTabSound();
    setOpen(!open);
  };

  const handleSelect = (tab) => {
    playSelectSound();
    navigate(tab.path);
    setOpen(false);
  };

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40"
            style={{ background: '#00000088' }}
          />
        )}
      </AnimatePresence>

      {/* Expanded menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.18 }}
            className="fixed z-50 right-4 flex flex-col gap-1.5 no-scrollbar"
            style={{ bottom: '136px', maxHeight: '62vh', overflowY: 'auto' }}
          >
            {TABS.map((tab, index) => (
              <motion.button
                key={tab.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => handleSelect(tab)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded whitespace-nowrap transition-all"
                style={{
                  background: activeTab === tab.id ? '#00ff4122' : '#001a00ee',
                  border: `1px solid ${activeTab === tab.id ? '#00ff41' : '#00ff4133'}`,
                  color: activeTab === tab.id ? '#00ff41' : '#00ff41aa',
                  backdropFilter: 'blur(10px)',
                  minWidth: '140px',
                }}
              >
                {tab.icon && <tab.icon size={16} />}
                <span className="text-xs uppercase tracking-wider flex-1 text-left">{tab.label}</span>
                {tab.alert && (
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#ff0000' }} />
                )}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating toggle button */}
      <motion.button
        onClick={handleToggle}
        whileTap={{ scale: 0.9 }}
        aria-label="Menu de navegação rápida"
        className="fixed z-50 flex items-center justify-center"
        style={{
          right: '16px',
          bottom: '80px',
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: '#001a00dd',
          border: '1px solid #00ff4166',
          color: '#00ff41',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 0 14px #00ff4144',
        }}
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X size={20} />
            </motion.span>
          ) : (
            <motion.span key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <Menu size={20} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  );
}
