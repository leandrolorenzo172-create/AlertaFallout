// Painéis da aba FICHEIROS abertos pelo menu ≡: NOTAS, FILTRAR POR TIPO, ORDENAR e confirmação de ELIMINAR BIBLIOTECA.
import React, { useState } from 'react';
import { StickyNote, Filter, ArrowDownUp, X, Check, Save, AlertTriangle } from 'lucide-react';
import { useFilesView, closeFilesPanel, FILE_TYPES, FILE_SORTS, toggleFileType, clearFileTypes, setFileSort, saveNote, askReset, resetLibrary } from './filesTools';
import { t } from '@/i18n';

const panel = { background: 'rgb(var(--cd) / 0.55)', border: '1px solid rgb(var(--c) / 0.35)', boxShadow: '0 0 14px rgb(var(--c) / 0.12)' };
const field = { background: 'rgb(var(--cb) / 0.8)', border: '1px solid rgb(var(--c) / 0.25)', color: 'rgb(var(--c))', outline: 'none' };
const chip = (on) => ({
  background: on ? 'rgb(var(--c) / 0.16)' : 'rgb(var(--cb) / 0.6)',
  border: `1px solid ${on ? 'rgb(var(--c))' : 'rgb(var(--c) / 0.25)'}`,
  color: on ? 'rgb(var(--c))' : 'rgb(var(--c) / 0.8)',
  boxShadow: on ? '0 0 8px rgb(var(--c) / 0.35)' : 'none',
});
const red = { border: '1px solid #ef444488', color: '#ef4444' };

function Header({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon size={14} />
      <h3 className="flex-1 text-xs uppercase tracking-wider font-bold">{title}</h3>
      <button type="button" onClick={closeFilesPanel} aria-label={t('Fechar')} className="p-1 rounded-sm" style={chip(false)}><X size={13} /></button>
    </div>
  );
}

// ---------- NOTAS: título, conteúdo, etiquetas -> gravação imediata na base de conhecimento ----------
export function NotePanel({ onSaved }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const ok = title.trim() && content.trim();
  const save = async () => {
    if (!ok || busy) return;
    setBusy(true); setErr('');
    const r = await saveNote({ title, content, tags }).catch(() => ({ status: 'erro' }));
    setBusy(false);
    if (r.status === 'ok') { setTitle(''); setContent(''); setTags(''); closeFilesPanel(); onSaved?.(t('✔ Nota «{n}» guardada na base de conhecimento. A IA já a pode usar.', { n: title.trim() })); }
    else setErr(r.status === 'duplicado' ? t('Já existe uma nota igual.') : t('Não foi possível guardar a nota.'));
  };
  return (
    <section id="files-panel" className="p-3 rounded-md mb-3 scroll-mt-16" style={panel} aria-label={t('Nova nota')}>
      <Header icon={StickyNote} title={t('Nova nota')} />
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('Título')} maxLength={80} className="w-full p-2 mb-2 rounded-sm text-xs" style={field} autoFocus />
      <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder={t('Conteúdo da nota (a IA pesquisa neste texto)…')} rows={6} className="w-full p-2 mb-2 rounded-sm text-xs resize-y" style={field} />
      <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder={t('Etiquetas, separadas por vírgulas (ex.: água, casa, família)')} className="w-full p-2 mb-3 rounded-sm text-xs" style={field} />
      {err && <p className="text-[11px] mb-2" style={{ color: '#ef4444' }}>{err}</p>}
      <button type="button" onClick={save} disabled={!ok || busy} className="w-full flex items-center justify-center gap-2 py-2 rounded-sm text-xs uppercase tracking-wider font-bold disabled:opacity-40" style={chip(true)}>
        <Save size={13} /> {busy ? t('A guardar…') : t('Guardar na base de conhecimento')}
      </button>
    </section>
  );
}

// ---------- FILTRAR POR TIPO ----------
export function TypeFilterPanel({ counts }) {
  const v = useFilesView();
  return (
    <section id="files-panel" className="p-3 rounded-md mb-3 scroll-mt-16" style={panel} aria-label={t('Filtrar por tipo')}>
      <Header icon={Filter} title={t('Filtrar por tipo')} />
      <div className="flex flex-wrap gap-1.5 mb-3">
        <button type="button" onClick={clearFileTypes} aria-pressed={!v.types.length} className="px-2.5 py-1 rounded-full text-[11px] uppercase tracking-wider" style={chip(!v.types.length)}>{t('Todos')}</button>
        {FILE_TYPES.map((ty) => (
          <button key={ty} type="button" onClick={() => toggleFileType(ty)} aria-pressed={v.types.includes(ty)} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] uppercase tracking-wider" style={chip(v.types.includes(ty))}>
            {v.types.includes(ty) && <Check size={11} />}{ty} <span className="opacity-60">{counts[ty] || 0}</span>
          </button>
        ))}
      </div>
      {v.types.length > 0 && <button type="button" onClick={clearFileTypes} className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-sm" style={red}>{t('Limpar filtro (mostrar todos)')}</button>}
    </section>
  );
}

// ---------- ORDENAR ----------
export function SortPanel() {
  const v = useFilesView();
  return (
    <section id="files-panel" className="p-3 rounded-md mb-3 scroll-mt-16" style={panel} aria-label={t('Ordenar')}>
      <Header icon={ArrowDownUp} title={t('Ordenar')} />
      <div className="grid gap-1.5 sm:grid-cols-2">
        {FILE_SORTS.map((s) => (
          <button key={s.id} type="button" onClick={() => setFileSort(s.id)} aria-pressed={v.sort === s.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-sm text-[11px] text-left" style={chip(v.sort === s.id)}>
            <span className="w-3 shrink-0">{v.sort === s.id && <Check size={11} />}</span>{t(s.label)}
          </button>
        ))}
      </div>
    </section>
  );
}

// ---------- ELIMINAR BIBLIOTECA: confirmação explícita (SIM / NÃO) ----------
export function ResetLibraryDialog({ total, onDone }) {
  const [busy, setBusy] = useState(false);
  const cancel = () => { if (!busy) askReset(false); }; // NÃO: nada é alterado
  const confirm = async () => {                          // SIM: fica só o Guia de Sobrevivência SteelDeck
    setBusy(true);
    const n = await resetLibrary().catch(() => -1);
    setBusy(false); askReset(false);
    onDone?.(n < 0 ? t('Não foi possível eliminar a biblioteca.') : t('✔ Biblioteca eliminada: {n} documento(s) apagado(s). Fica só o Guia de Sobrevivência SteelDeck.', { n }), n < 0);
  };
  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4" style={{ background: '#000000b3' }} role="alertdialog" aria-modal="true" aria-labelledby="reset-lib-title" onClick={cancel}>
      <div className="w-full max-w-sm p-4 rounded-sm" style={{ background: 'rgb(var(--cd))', border: '1px solid #ef4444aa', boxShadow: '0 0 20px #ef444455' }} onClick={(e) => e.stopPropagation()}>
        <p id="reset-lib-title" className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold mb-2" style={{ color: '#ef4444' }}><AlertTriangle size={15} /> {t('Eliminar biblioteca')}</p>
        <p className="text-[12px] mb-2" style={{ color: 'rgb(var(--c))' }}>{t('Tens a certeza? Esta operação não se pode desfazer.')}</p>
        <p className="text-[11px] mb-4" style={{ color: 'rgb(var(--c) / 0.7)' }}>
          {t('Vão ser apagados {n} documento(s) e nota(s), com os índices, marcadores e histórico de leitura. A base de conhecimento fica apenas com o Guia de Sobrevivência SteelDeck.', { n: total })}
        </p>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={cancel} disabled={busy} autoFocus className="px-4 py-2 rounded-sm text-xs uppercase tracking-wider" style={chip(false)}>{t('Não')}</button>
          <button type="button" onClick={confirm} disabled={busy || !total} className="px-4 py-2 rounded-sm text-xs uppercase tracking-wider font-bold disabled:opacity-40" style={{ background: '#ef444422', ...red }}>{busy ? t('A eliminar…') : t('Sim, eliminar')}</button>
        </div>
      </div>
    </div>
  );
}
