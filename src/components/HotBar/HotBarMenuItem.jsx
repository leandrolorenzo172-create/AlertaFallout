// Componente ÚNICO que desenha qualquer item do menu ≡ (todas as abas): mesmo aspeto, espaçamento, acessibilidade e animação.
// Não conhece abas: só lê o contrato HotBarItemConfig (config/hotbarSchema.js).
import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronsDown, Check } from 'lucide-react';
import { t } from '@/i18n';
import { val } from './config/hotbarSchema';
import { runItem } from './hotbarActions';

const RED = '#ef4444';
const TONES = {
  default: null,
  warn: { color: '#ffaa00', border: '#ffaa0066', glow: '0 0 8px #ffaa0033' },
  danger: { color: RED, border: '#ef444488', glow: '0 0 8px #ef444433' },
  rec: { color: RED, border: RED, glow: '0 0 14px #ef444466', bg: '#ef444418', pulse: true },
};
const Dot = ({ label }) => <span className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ background: '#ff0000', boxShadow: '0 0 8px #ff0000' }} aria-label={label} />;

const optBase = { background: 'rgb(var(--cd) / 0.95)', color: 'rgb(var(--c))' };
const optStyle = (sel) => ({ ...optBase, background: sel ? 'rgb(var(--c) / 0.16)' : optBase.background, border: `1px solid rgb(var(--c) / ${sel ? 0.9 : 0.22})` });

function Submenu({ sub, ctx, api }) {
  if (sub.render) return sub.render(ctx, api);
  const opts = sub.options(ctx) || [];
  const pick = (o) => { api.playSelect(); if (o.run) o.run(ctx, api); else sub.onPick?.(o, ctx, api); };
  const key = (o) => o.key ?? (o.id == null ? 'all' : String(o.id));
  const layout = sub.layout || 'chips';
  if (layout === 'list') {
    return opts.map((o) => {
      const Icon = o.icon || ChevronsDown;
      return (
        <button key={key(o)} type="button" disabled={o.disabled} onClick={() => pick(o)} data-hotbar-item=""
          className="ml-6 flex items-center gap-2 px-3 py-2 rounded text-[11px] uppercase tracking-wider text-left disabled:opacity-40"
          style={{ ...optBase, border: '1px solid rgb(var(--c) / 0.2)', color: 'rgb(var(--c) / 0.85)' }}>
          <Icon size={12} /> {t(o.label)}
        </button>
      );
    });
  }
  const grid = layout === 'grid';
  return (
    <div className={grid ? 'ml-6 grid grid-cols-2 gap-1.5' : 'ml-6 flex flex-wrap gap-1.5 max-w-[260px]'} role="group">
      {opts.map((o) => (
        <button key={key(o)} type="button" disabled={o.disabled} aria-pressed={!!o.selected} onClick={() => pick(o)} data-hotbar-item=""
          className={`flex items-center gap-1 px-2 ${grid ? 'py-1.5 rounded text-[11px]' : 'py-1 rounded-full text-[10px]'} uppercase tracking-wider text-left disabled:opacity-40`}
          style={optStyle(o.selected)}>
          {o.selected && <Check size={10} className="shrink-0" />}{t(o.label)}{o.count != null && <span className="opacity-60">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export default function HotBarMenuItem({ item, ctx, api, index, minWidth = 220 }) {
  if (item.visibleWhen && !item.visibleWhen(ctx)) return null;
  if (item.type === 'separator') return <hr className="my-0.5 border-0 h-px" style={{ background: 'rgb(var(--c) / 0.2)' }} aria-hidden="true" />;

  const subOpen = !!item.submenu?.isOpen(ctx);
  const active = subOpen || !!item.isActive?.(ctx);
  const alert = !!item.alert?.(ctx);
  const dot = alert || !!item.dot?.(ctx);
  const busy = !!item.busy?.(ctx);
  const disabled = !!item.disabledWhen?.(ctx);
  const tone = TONES[val(item.tone, ctx, 'default')] || null;
  const keepOpen = val(item.keepOpen, ctx, false);
  const rawBadge = item.badge?.(ctx);
  const badge = rawBadge && typeof rawBadge === 'object' ? rawBadge : rawBadge ? { text: rawBadge } : null;
  // ícones lucide são objetos (forwardRef); uma função simples é um ícone dinâmico (ctx) => Ícone
  const Icon = typeof item.icon === 'function' ? item.icon(ctx) : item.icon || null;

  const border = tone?.bg ? tone.border : alert ? '#ef444499' : active ? 'rgb(var(--c))' : tone?.border || 'rgb(var(--c) / 0.3)';
  const color = tone?.bg ? tone.color : active ? 'rgb(var(--c))' : tone?.color || 'rgb(var(--c) / 0.85)';
  const label = t(item.label);

  return (
    <>
      <motion.button
        type="button"
        data-hotbar-item=""
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.03 }}
        onClick={() => runItem(item, ctx, api, keepOpen)}
        disabled={disabled}
        aria-pressed={item.toggle ? active : undefined}
        aria-expanded={item.submenu ? subOpen : undefined}
        aria-keyshortcuts={item.shortcut ? item.shortcut.toUpperCase() : undefined}
        title={item.shortcut ? `${label} (${item.shortcut.toUpperCase()})` : undefined}
        className={`flex items-center gap-2.5 px-3 py-2.5 rounded whitespace-nowrap transition-all disabled:opacity-40 ${tone?.pulse ? 'animate-pulse' : ''}`}
        style={{
          background: tone?.bg || (active ? 'rgb(var(--c) / 0.16)' : 'rgb(var(--cd) / 0.95)'),
          border: `1px solid ${border}`,
          color,
          backdropFilter: 'blur(10px)',
          boxShadow: tone?.bg ? tone.glow : active ? '0 0 12px rgb(var(--c) / 0.45)' : tone?.glow || '0 0 8px rgb(var(--c) / 0.12)',
          minWidth: `${minWidth}px`,
        }}
      >
        {item.symbol
          ? <span className="w-8 text-center text-sm font-bold tabular-nums" aria-hidden="true" style={{ color: item.symbolColor, textShadow: tone?.bg ? `0 0 8px ${RED}` : undefined }}>{item.symbol}</span>
          : Icon && <Icon size={16} className={busy ? 'animate-spin' : ''} aria-hidden="true" />}
        <span className="text-xs uppercase tracking-wider flex-1 text-left">{label}</span>
        {badge?.text && (
          <span className="text-[10px] uppercase tracking-wider tabular-nums truncate max-w-[120px]" style={{ color: badge.color || (alert ? RED : undefined), opacity: alert || active || badge.color ? 1 : 0.65 }}>{badge.text}</span>
        )}
        {dot && <Dot label={t('ativo')} />}
        {item.submenu && <ChevronRight size={13} aria-hidden="true" style={{ transform: subOpen ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />}
      </motion.button>
      {subOpen && <Submenu sub={item.submenu} ctx={ctx} api={api} />}
    </>
  );
}
