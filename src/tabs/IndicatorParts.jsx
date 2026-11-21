// Peças partilhadas pelos separadores Instabilidade Económica e Greves (mesmo estilo do Painel).
import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, RefreshCw, ExternalLink } from 'lucide-react';

export const card = { background: 'rgb(var(--cd) / 0.2)', border: '1px solid rgb(var(--c) / 0.07)' };
export const fmtDate = (t) => new Date(t).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export function Loading({ text }) {
  return (
    <div className="flex flex-col items-center py-12">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
        <Loader2 size={24} style={{ color: 'rgb(var(--c))' }} />
      </motion.div>
      <p className="mt-3 text-[10px] uppercase tracking-widest" style={{ color: 'rgb(var(--c) / 0.4)' }}>{text}</p>
    </div>
  );
}

export function Header({ icon: Icon, title, onRefresh }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon size={16} />
      <h2 className="text-sm uppercase tracking-wider font-bold flex-1">{title}</h2>
      {onRefresh && (
        <button type="button" onClick={onRefresh} aria-label="Atualizar" className="p-1.5 rounded-sm" style={{ border: '1px solid rgb(var(--c) / 0.2)' }}>
          <RefreshCw size={13} />
        </button>
      )}
    </div>
  );
}

export function ErrorBox({ text }) {
  return <p className="p-3 rounded-sm text-xs" style={{ background: '#ff660014', border: '1px solid #ff660044', color: '#ff9944' }}>{text}</p>;
}

export function Stat({ label, value, sub }) {
  return (
    <div className="p-3 rounded-sm" style={{ background: 'rgb(var(--cd) / 0.13)', border: '1px solid rgb(var(--c) / 0.07)' }}>
      <p className="text-[10px] uppercase tracking-wider" style={{ color: 'rgb(var(--c) / 0.45)' }}>{label}</p>
      <p className="text-lg font-bold tabular-nums">{value}</p>
      {sub && <p className="text-[10px]" style={{ color: 'rgb(var(--c) / 0.45)' }}>{sub}</p>}
    </div>
  );
}

// barras simples (histórico diário ou contagem por setor)
export function Bars({ items, max, height = 64 }) {
  const m = max || Math.max(1, ...items.map((x) => x.v));
  return (
    <div className="flex items-end gap-[3px]" style={{ height }}>
      {items.map((x, i) => (
        <div key={i} title={`${x.label}: ${x.v}`} className="flex-1 rounded-t-sm" style={{ height: `${Math.max(4, (x.v / m) * 100)}%`, background: x.v >= 8 ? '#ff0000' : x.v >= 6 ? '#ff6600' : x.v >= 4 ? '#ffaa00' : 'rgb(var(--c) / 0.7)', minWidth: 3 }} />
      ))}
    </div>
  );
}

export function NewsItem({ a, badge, badgeColor }) {
  return (
    <a href={a.url || undefined} target="_blank" rel="noreferrer" className="block p-3 mb-2 rounded-sm"
      style={{ background: 'rgb(var(--cd) / 0.13)', border: '1px solid rgb(var(--c) / 0.07)', borderLeft: `3px solid ${badgeColor || 'rgb(var(--c) / 0.4)'}` }}>
      <div className="flex items-start gap-2">
        <h4 className="text-xs font-bold flex-1 leading-snug" style={{ color: 'rgb(var(--c) / 0.85)' }}>{a.title}</h4>
        {a.url && <ExternalLink size={12} className="shrink-0 mt-0.5" style={{ color: 'rgb(var(--c) / 0.4)' }} />}
      </div>
      <p className="text-[10px] mt-1" style={{ color: 'rgb(var(--c) / 0.45)' }}>
        {badge && <span className="mr-2 px-1 rounded-sm" style={{ border: `1px solid ${badgeColor || 'rgb(var(--c) / 0.3)'}`, color: badgeColor || 'rgb(var(--c) / 0.7)' }}>{badge}</span>}
        {a.source} · {fmtDate(a.date)}
      </p>
    </a>
  );
}
