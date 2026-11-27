// Botão ≡ flutuante: só orquestra (aberto/fechado, aba ativa, sons) e delega o desenho ao HotBarMenu.
// O conteúdo de cada aba vive em ./config/tabs/<aba>.config.js(x) — ver o guia em ./config/tabs/index.js.
import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, Menu } from 'lucide-react';
import { usePipBoySound } from '@/usePipBoySound';
import { useRadioRemote } from '@/audio/radioRemote';
import { t } from '@/i18n';
import HotBarMenu from './HotBarMenu';
import { createHotbarApi } from './hotbarActions';
import { TABS, useVisibleTabs, getTabByPath } from './config/tabs';

export { TABS, useVisibleTabs };

const noContext = () => null;

// Abas sem ferramentas (ex.: Painel): o menu ≡ navega entre os separadores visíveis
const navItems = (tabs, activeId) => tabs.map((tab) => ({
  id: tab.id, label: tab.label, icon: tab.icon,
  isActive: () => tab.id === activeId,
  dot: () => !!tab.alert,
  run: (_c, api) => api.navigate(tab.path),
}));

// Montado de novo em cada aba (key = id): o hook de estado da aba corre só enquanto ela está ativa
function TabScope({ config, open, onToggle, api, tabs, globalAlert }) {
  const ctx = (config.useContext || noContext)();
  useEffect(() => { config.onEnter?.(ctx); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const items = useMemo(() => config.items || navItems(tabs, config.tab.id), [config, tabs]);
  const title = !config.items ? null : config.title ? t(config.title) : `${t('Ferramentas')} · ${t(config.tab.label)}`;
  const alert = globalAlert || !!config.fabAlert?.(ctx);

  return (
    <>
      <HotBarMenu open={open} config={config} items={items} ctx={ctx} api={api} title={title} />
      <motion.button
        type="button"
        data-hotbar-fab=""
        onClick={onToggle}
        whileTap={{ scale: 0.9 }}
        aria-label={t(config.ariaLabel)}
        aria-expanded={open}
        className="fixed z-50 flex items-center justify-center"
        style={{ right: '16px', bottom: '80px', width: '48px', height: '48px', borderRadius: '50%', background: 'rgb(var(--cd) / 0.87)', border: '1px solid rgb(var(--c) / 0.4)', color: 'rgb(var(--c))', backdropFilter: 'blur(10px)', boxShadow: '0 0 14px rgb(var(--c) / 0.27)' }}
      >
        {alert && !open && <span className="absolute top-1 right-1 w-2 h-2 rounded-full animate-pulse" style={{ background: '#ff0000' }} />}
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}><X size={20} /></motion.span>
          ) : (
            <motion.span key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}><Menu size={20} /></motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  );
}

export default function HotBar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { playTabSound, playSelectSound } = usePipBoySound();
  const tabs = useVisibleTabs();
  const radio = useRadioRemote(); // uma gravação em curso acende o ponto do ≡ em qualquer aba
  const config = getTabByPath(pathname);
  const api = useMemo(() => createHotbarApi({ setOpen, navigate, playSelect: playSelectSound }), [navigate, playSelectSound]);
  const onToggle = () => { playTabSound(); setOpen((o) => !o); };

  return (
    <>
      <AnimatePresence>
        {open && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} className="fixed inset-0 z-40" style={{ background: '#00000088' }} />}
      </AnimatePresence>
      <TabScope key={config.tab.id} config={config} open={open} onToggle={onToggle} api={api} tabs={tabs} globalAlert={!!radio.isRecording} />
    </>
  );
}
