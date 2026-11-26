import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, Menu, Shield, Skull, AlertTriangle, Cloud, TrendingUp, Bot, Book, MapPin, Radio as RadioIcon, BrainCircuit, Disc3, Settings, Gamepad2, TrendingDown, Megaphone } from 'lucide-react';
import { usePipBoySound } from './usePipBoySound';
import { useSettings, orderTabs } from './theme';
import { t } from '@/i18n';
import { toolsFor } from './tools/toolMenus';
import { runTool, useToolBadges, hasToolBadge, showToolToast, useToolToast } from './tools/quickTools';

// Separadores visíveis, pela ordem escolhida nas Definições
export function useVisibleTabs() {
  const s = useSettings();
  return orderTabs(TABS, s.order).filter((t) => !s.hidden.includes(t.id));
}

export const TABS = [
  { id: 'dashboard', path: '/dashboard', label: 'Painel', icon: Shield, alert: true },
  { id: 'guerra', path: '/guerra', label: 'Guerra', icon: Skull, alert: true },
  { id: 'economia', path: '/economia', label: 'Economia', icon: TrendingDown },
  { id: 'greves', path: '/greves', label: 'Greves', icon: Megaphone },
  { id: 'catastrofes', path: '/catastrofes', label: 'Catástrofes', icon: AlertTriangle },
  { id: 'meteo', path: '/meteo', label: 'Meteo', icon: Cloud },
  { id: 'radio', path: '/radio', label: 'Rádio FM', icon: RadioIcon },
  { id: 'musica', path: '/musica', label: 'Música', icon: Disc3 },
  { id: 'minijogo', path: '/minijogo', label: 'Mini Jogo', icon: Gamepad2 },
  { id: 'pizza', path: '/pizza', label: 'Pizza', icon: TrendingUp },
  { id: 'assistente', path: '/assistente', label: 'IA', icon: Bot },
  { id: 'conhecimento', path: '/conhecimento', label: 'Ficheiros IA', icon: BrainCircuit },
  { id: 'manual', path: '/manual', label: 'Manual', icon: Book },
  { id: 'mapa', path: '/mapa', label: 'Mapa', icon: MapPin },
  { id: 'definicoes', path: '/definicoes', label: 'Definições', icon: Settings },
];

// Comportamento por omissão quando o separador ativo não trata a ação (ou para o conjunto DEFAULT_TOOLS).
// Cada função recebe { tabId, navigate }.
const DEFAULT_ACTIONS = {
  atualizar: () => window.location.reload(),
  topo: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
  partilhar: async () => {
    const url = window.location.href;
    try {
      if (navigator.share) { await navigator.share({ title: document.title, url }); return; }
      await navigator.clipboard.writeText(url);
      showToolToast(t('Ligação copiada.'));
    } catch { /* partilha cancelada pelo utilizador */ }
  },
  definicoes: ({ navigate }) => navigate('/definicoes'),
};

export default function HotBar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { playTabSound, playSelectSound } = usePipBoySound();
  const badges = useToolBadges();
  const toast = useToolToast();

  const activeTab = TABS.find((tab) => location.pathname === tab.path)?.id || 'dashboard';
  const activeLabel = TABS.find((tab) => tab.id === activeTab)?.label || '';
  // As ferramentas dependem SEMPRE da aba ativa: ao mudar de aba (com o menu aberto ou não) a lista atualiza logo.
  const tools = toolsFor(activeTab);

  // Fecha com a tecla Esc (teclado / comando)
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const handleToggle = () => {
    playTabSound();
    setOpen(!open);
  };

  const handleSelect = (tool) => {
    playSelectSound();
    setOpen(false);
    // 1.º o separador ativo (useQuickTools); 2.º o comportamento por omissão; 3.º aviso de que ainda não está ligada
    const handled = runTool(activeTab, tool.id);
    if (handled) return;
    const fallback = DEFAULT_ACTIONS[tool.id];
    if (fallback) fallback({ tabId: activeTab, navigate });
    else showToolToast(t('Ferramenta ainda não disponível nesta vista.'));
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

      {/* Menu de ferramentas da aba ativa, alinhado na vertical por cima do botão.
          A altura máxima respeita a barra de estado, a barra de baixo e as margens seguras do telemóvel. */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="tools"
            role="menu"
            aria-label={t('Ferramentas de {x}', { x: t(activeLabel) })}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.18 }}
            className="fixed z-50 right-4 flex flex-col gap-1.5 no-scrollbar"
            style={{
              bottom: 'calc(136px + env(safe-area-inset-bottom, 0px))',
              maxHeight: 'calc(100dvh - 136px - 96px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))',
              maxWidth: 'calc(100vw - 32px)',
              overflowY: 'auto',
            }}
          >
            <div className="px-3 pb-0.5 text-[10px] uppercase tracking-[0.2em] text-right" style={{ color: 'rgb(var(--c) / 0.55)' }}>
              {t('Ferramentas')} · {t(activeLabel)}
            </div>
            {/* key = aba ativa: ao mudar de aba os itens voltam a entrar com a animação */}
            {tools.map((tool, index) => {
              const Icon = tool.icon;
              const alert = tool.badge && hasToolBadge(badges, activeTab, tool.id);
              return (
                <motion.button
                  key={`${activeTab}-${tool.id}`}
                  type="button"
                  role="menuitem"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => handleSelect(tool)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded transition-all"
                  style={{
                    background: 'rgb(var(--cd) / 0.93)',
                    border: '1px solid rgb(var(--c) / 0.2)',
                    color: 'rgb(var(--c) / 0.85)',
                    backdropFilter: 'blur(10px)',
                    minWidth: '200px',
                  }}
                >
                  {Icon && <Icon size={16} className="shrink-0" />}
                  <span className="text-xs uppercase tracking-wider flex-1 text-left truncate">{t(tool.label)}</span>
                  {alert && (
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ background: '#ff0000', boxShadow: '0 0 6px #ff0000' }} aria-label={t('com alertas')} />
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Aviso curto de confirmação (ex.: "Modo IA: base local") */}
      <AnimatePresence>
        {toast && !open && (
          <motion.div
            key={toast.id}
            role="status"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="fixed z-50 right-4 px-3 py-2 rounded text-[11px] uppercase tracking-wider"
            style={{
              bottom: 'calc(136px + env(safe-area-inset-bottom, 0px))',
              maxWidth: 'calc(100vw - 32px)',
              background: 'rgb(var(--cd) / 0.95)',
              border: '1px solid rgb(var(--c) / 0.4)',
              color: 'rgb(var(--c))',
              boxShadow: '0 0 12px rgb(var(--c) / 0.25)',
            }}
          >
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating toggle button */}
      <motion.button
        onClick={handleToggle}
        whileTap={{ scale: 0.9 }}
        aria-label={open ? t('Fechar ferramentas') : t('Ferramentas rápidas')}
        aria-expanded={open}
        aria-haspopup="menu"
        className="fixed z-50 flex items-center justify-center"
        style={{
          right: '16px',
          bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: 'rgb(var(--cd) / 0.87)',
          border: '1px solid rgb(var(--c) / 0.4)',
          color: 'rgb(var(--c))',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 0 14px rgb(var(--c) / 0.27)',
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
