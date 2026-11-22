// Faixa de aviso de greve no topo do ecrã (mesmo estilo do resto da app). Toque abre o separador Greves.
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone, X } from 'lucide-react';
import { startStrikeAlerts } from './strikeAlerts';
import { t } from '@/i18n';

export default function StrikeBanner() {
  const [list, setList] = useState([]);
  const navigate = useNavigate();
  useEffect(() => {
    const on = (e) => setList((l) => [...l.filter((x) => x.title !== e.detail.title), e.detail].slice(-3));
    window.addEventListener('pb-strike-alert', on);
    startStrikeAlerts();
    return () => window.removeEventListener('pb-strike-alert', on);
  }, []);
  if (!list.length) return null;
  const close = (t) => setList((l) => l.filter((x) => x.title !== t));
  return (
    <div className="px-3 pt-2 space-y-1.5" role="alert">
      {list.map((a) => (
        <div key={a.title} className="flex items-start gap-2 p-2.5 rounded-sm max-w-2xl mx-auto"
          style={{ background: 'rgb(var(--cb) / 0.96)', border: '1px solid #ffaa00', boxShadow: '0 0 14px #ffaa0044' }}>
          {a.icon
            ? <img src={a.icon} alt="" className="shrink-0 w-12 h-12 rounded-sm" style={{ border: '1px solid rgb(var(--c) / 0.3)' }} />
            : <Megaphone size={16} className="shrink-0 mt-0.5" style={{ color: '#ffaa00' }} />}
          <button type="button" className="flex-1 text-left min-w-0" onClick={() => { close(a.title); navigate((a.url || './#/greves').replace('./#', '')); }}>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#ffaa00' }}>{a.title}</p>
            <p className="text-[11px] leading-snug mt-0.5" style={{ color: 'rgb(var(--c) / 0.8)' }}>{a.body}</p>
          </button>
          <button type="button" aria-label={t('Fechar aviso')} onClick={() => close(a.title)} className="p-1 shrink-0" style={{ color: 'rgb(var(--c) / 0.6)' }}><X size={14} /></button>
        </div>
      ))}
    </div>
  );
}
