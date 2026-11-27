// Diálogo de confirmação do restauro (Fundir / Substituir / Cancelar), partilhado pelas Definições e pela aba IDU.
import React from 'react';
import { t } from '@/i18n';

const btn = { background: 'rgb(var(--cb) / 0.6)', border: '1px solid rgb(var(--c) / 0.3)', color: 'rgb(var(--c))' };

export default function RestoreDialog({ pending, onPick, onCancel }) {
  if (!pending) return null;
  const m = pending.manifest;
  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4" style={{ background: '#000000b3' }} role="dialog" aria-modal="true" aria-labelledby="restore-title" onClick={onCancel}>
      <div className="w-full max-w-sm p-4 rounded-sm text-[11px]" style={{ background: 'rgb(var(--cd))', border: '1px solid rgb(var(--c) / 0.6)', boxShadow: '0 0 18px rgb(var(--c) / 0.3)', color: 'rgb(var(--c))' }} onClick={(e) => e.stopPropagation()}>
        <p id="restore-title" className="text-xs uppercase tracking-wider font-bold mb-2">{t('Restaurar backup')}</p>
        <p className="mb-1">{t('ID: {id}', { id: m.userId })}</p>
        <p className="mb-1">{t('Feito em {d}', { d: new Date(m.created).toLocaleString('pt-PT') })}</p>
        <p className="mb-3 opacity-80">{t('{a} definições · {b} registos · {c} ficheiros{m}', { a: m.counts?.localStorage ?? '?', b: m.counts?.records ?? '?', c: m.blobs, m: m.includeMaps ? ` · ${t('com mapas offline')}` : '' })}</p>
        <p className="mb-3">{t('Como queres restaurar?')}</p>
        <div className="flex flex-col gap-2">
          <button type="button" onClick={() => onPick('merge')} className="py-2 rounded-sm uppercase tracking-wider font-bold" style={{ ...btn, border: '1px solid rgb(var(--c))' }}>{t('Fundir com dados existentes')}</button>
          <button type="button" onClick={() => onPick('replace')} className="py-2 rounded-sm uppercase tracking-wider" style={{ border: '1px solid #ef444488', color: '#ef4444' }}>{t('Substituir dados atuais')}</button>
          <button type="button" onClick={onCancel} className="py-2 rounded-sm uppercase tracking-wider" style={btn}>{t('Cancelar')}</button>
        </div>
      </div>
    </div>
  );
}
