// Contentor do menu ≡: título, linha de estado, itens (sempre via HotBarMenuItem) e teclado.
// Teclado com o menu aberto: ↑/↓/Home/End movem o foco, Esc fecha, e cada item pode ter uma tecla (item.shortcut).
import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { t } from '@/i18n';
import HotBarMenuItem from './HotBarMenuItem';
import { runItem } from './hotbarActions';
import { val } from './config/hotbarSchema';

const isTyping = (el) => el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

export default function HotBarMenu({ open, config, items, ctx, api, title }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); api.close(); document.querySelector('[data-hotbar-fab]')?.focus(); return; }
      if (isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      const box = ref.current; if (!box) return;
      const els = [...box.querySelectorAll('[data-hotbar-item]:not(:disabled)')];
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key) && els.length) {
        e.preventDefault();
        const i = els.indexOf(document.activeElement);
        const n = e.key === 'Home' ? 0 : e.key === 'End' ? els.length - 1 : e.key === 'ArrowDown' ? (i + 1) % els.length : (i - 1 + els.length) % els.length;
        els[n].focus();
        return;
      }
      const hit = items.find((it) => it.shortcut && it.shortcut.toLowerCase() === e.key.toLowerCase() && (!it.visibleWhen || it.visibleWhen(ctx)) && !it.disabledWhen?.(ctx));
      if (hit) { e.preventDefault(); runItem(hit, ctx, api, val(hit.keepOpen, ctx, false)); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, items, ctx, api]);

  const status = config.status?.(ctx);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ duration: 0.18 }}
          data-hotbar-menu=""
          role="group"
          aria-label={t(config.ariaLabel)}
          className="fixed z-50 right-4 flex flex-col gap-1.5 no-scrollbar"
          style={{ bottom: '136px', maxHeight: '62vh', overflowY: 'auto' }}
        >
          {title && <p className="px-1 text-[10px] uppercase tracking-widest text-right font-bold" style={{ color: config.titleColor || 'rgb(var(--c) / 0.6)', textShadow: config.titleColor ? `0 0 8px ${config.titleColor}88` : undefined }}>{title}</p>}
          {status?.text && (
            <p className="px-3 py-1.5 rounded text-[10px] uppercase tracking-wider break-words" role="status"
              style={{ background: 'rgb(var(--cd) / 0.95)', border: '1px solid rgb(var(--c) / 0.2)', color: status.color || 'rgb(var(--c) / 0.7)', maxWidth: 260, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {status.text}
            </p>
          )}
          {items.map((item, i) => <HotBarMenuItem key={item.id} item={item} ctx={ctx} api={api} index={i} minWidth={config.minWidth} />)}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
