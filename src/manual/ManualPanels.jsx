// Painéis da aba MANUAL abertos pelo menu ≡: FILTRAR POR TIPO (temáticas) e ORGANIZAR DOCUMENTOS.
import React, { useMemo, useState } from 'react';
import { Search, Info, X, BookOpen, Filter, ArrowDownUp, Layers, Check } from 'lucide-react';
import { GRUPOS, TEMAS, temaById, LIVROS_EXEMPLO, temasDoDoc } from './temas';
import { useManualView, toggleTheme, clearThemes, closePanel, SORTS, DOC_TYPES, setSort, toggleType, setGroup, clearOrganize } from './manualTools';
import { t } from '@/i18n';

const panel = { background: 'rgb(var(--cd) / 0.55)', border: '1px solid rgb(var(--c) / 0.35)', boxShadow: '0 0 14px rgb(var(--c) / 0.12)' };
const soft = { color: 'rgb(var(--c) / 0.6)' };
const chip = (on) => ({
  background: on ? 'rgb(var(--c) / 0.16)' : 'rgb(var(--cb) / 0.6)',
  border: `1px solid ${on ? 'rgb(var(--c))' : 'rgb(var(--c) / 0.25)'}`,
  color: on ? 'rgb(var(--c))' : 'rgb(var(--c) / 0.8)',
  boxShadow: on ? '0 0 8px rgb(var(--c) / 0.35)' : 'none',
});
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function Header({ icon: Icon, title, onClose }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon size={14} style={{ color: 'rgb(var(--c))' }} />
      <h3 className="flex-1 text-xs uppercase tracking-wider font-bold" style={{ color: 'rgb(var(--c))' }}>{title}</h3>
      <button type="button" onClick={onClose} aria-label={t('Fechar')} className="p-1 rounded-sm" style={chip(false)}><X size={13} /></button>
    </div>
  );
}

// ---------- Filtro por temática ----------
export function ThemeFilterPanel({ docs }) {
  const v = useManualView();
  const [tab, setTab] = useState('todos'); // 'todos' | 'ficcao' | 'nao-ficcao'
  const [q, setQ] = useState('');
  const [info, setInfo] = useState(null); // temática com o cartão informativo aberto

  const grupos = useMemo(() => {
    const nq = norm(q.trim());
    return GRUPOS.filter((g) => tab === 'todos' || g.id === tab)
      .map((g) => ({ ...g, temas: g.temas.filter((tm) => !nq || norm(`${tm.nome} ${tm.desc}`).includes(nq)) }))
      .filter((g) => g.temas.length);
  }, [tab, q]);

  const sel = v.themes;
  const match = (temas) => !sel.length || temas.some((x) => sel.includes(x));
  const exemplos = LIVROS_EXEMPLO.filter((l) => match(l.temas));
  const reais = (docs || []).map((d) => ({ d, temas: temasDoDoc(d) })).filter((x) => sel.length && match(x.temas));

  return (
    <section id="manual-panel" className="p-3 rounded-md mb-4 scroll-mt-16" style={panel} aria-label={t('Filtrar por temática')}>
      <Header icon={Filter} title={t('Filtrar por temática')} onClose={closePanel} />

      {/* Separadores principais */}
      <div role="tablist" className="grid grid-cols-3 gap-1 p-1 rounded-sm mb-3" style={{ background: 'rgb(var(--cb) / 0.6)', border: '1px solid rgb(var(--c) / 0.15)' }}>
        {[['todos', t('Todos')], ['ficcao', t('Ficção')], ['nao-ficcao', t('Não-Ficção')]].map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className="py-1.5 rounded-sm text-[11px] uppercase tracking-wider"
            style={tab === id ? { background: 'rgb(var(--c) / 0.16)', color: 'rgb(var(--c))', boxShadow: 'inset 0 0 0 1px rgb(var(--c) / 0.6)' } : { color: 'rgb(var(--c) / 0.6)' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Pesquisa rápida */}
      <label className="flex items-center gap-2 px-2 py-1.5 rounded-sm mb-3" style={{ background: 'rgb(var(--cb) / 0.7)', border: '1px solid rgb(var(--c) / 0.25)' }}>
        <Search size={13} style={soft} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Pesquisar temáticas (nome ou descrição)…')}
          className="flex-1 min-w-0 bg-transparent outline-none text-xs" style={{ color: 'rgb(var(--c))' }} />
        {q && <button type="button" onClick={() => setQ('')} aria-label={t('Limpar pesquisa')}><X size={12} style={soft} /></button>}
      </label>

      {/* Seleção múltipla */}
      <div className="flex items-center justify-between mb-2 min-h-[22px]">
        <span className="text-[10px] uppercase tracking-wider" style={soft}>{sel.length ? t('{n} selecionada(s)', { n: sel.length }) : t('Nenhuma selecionada: mostra tudo')}</span>
        {sel.length > 0 && <button type="button" onClick={clearThemes} className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm" style={{ border: '1px solid #ef444488', color: '#ef4444' }}>{t('Limpar filtros')}</button>}
      </div>
      {grupos.length === 0 && <p className="text-[11px] mb-2" style={soft}>{t('Nenhuma temática com essa palavra.')}</p>}
      {grupos.map((g) => (
        <div key={g.id} className="mb-3">
          <p className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: 'rgb(var(--c) / 0.5)' }}>{t(g.nome)}</p>
          <div className="flex flex-wrap gap-1.5">
            {g.temas.map((tm) => {
              const on = sel.includes(tm.id);
              return (
                <span key={tm.id} className="inline-flex items-stretch rounded-full overflow-hidden" style={chip(on)} title={tm.desc}>
                  <button type="button" onClick={() => toggleTheme(tm.id)} aria-pressed={on} className="flex items-center gap-1 pl-2.5 pr-1.5 py-1 text-[11px] text-left">
                    {on && <Check size={11} />}{tm.nome}
                  </button>
                  <button type="button" onClick={() => setInfo(info === tm.id ? null : tm.id)} aria-label={t('Descrição de {x}', { x: tm.nome })} aria-expanded={info === tm.id}
                    className="px-1.5" style={{ borderLeft: '1px solid rgb(var(--c) / 0.2)' }}>
                    <Info size={11} />
                  </button>
                </span>
              );
            })}
          </div>
          {info && g.temas.some((tm) => tm.id === info) && (
            <div className="mt-2 p-2.5 rounded-sm text-[11px] leading-relaxed" style={{ background: 'rgb(var(--cb) / 0.85)', border: '1px solid rgb(var(--c) / 0.4)', color: 'rgb(var(--c) / 0.85)' }}>
              <b style={{ color: 'rgb(var(--c))' }}>{temaById[info].nome}.</b> {temaById[info].desc}
            </div>
          )}
        </div>
      ))}

      {/* Pré-visualização em tempo real */}
      <div className="pt-3 mt-1" style={{ borderTop: '1px solid rgb(var(--c) / 0.15)' }}>
        <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'rgb(var(--c) / 0.5)' }}>{t('Pré-visualização · livros de exemplo')} ({exemplos.length}/{LIVROS_EXEMPLO.length})</p>
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {exemplos.map((l) => (
            <li key={l.titulo} className="flex items-start gap-2 p-2 rounded-sm" style={{ background: 'rgb(var(--cb) / 0.55)', border: '1px solid rgb(var(--c) / 0.15)' }}>
              <BookOpen size={14} className="shrink-0 mt-0.5" style={soft} />
              <span className="min-w-0">
                <span className="block text-xs font-bold truncate" style={{ color: 'rgb(var(--c))' }}>{l.titulo}</span>
                <span className="block text-[10px]" style={soft}>{l.autor} · {l.temas.map((x) => temaById[x]?.nome).join(', ')}</span>
              </span>
            </li>
          ))}
          {!exemplos.length && <li className="text-[11px]" style={soft}>{t('Nenhum livro de exemplo nestas temáticas.')}</li>}
        </ul>
        {sel.length > 0 && (
          <p className="text-[10px] mt-2" style={soft}>
            {t('Na tua estante: {n} documento(s) nestas temáticas (deteção automática pelo título e pelo texto).', { n: reais.length })}
          </p>
        )}
      </div>
    </section>
  );
}

// ---------- Organizar documentos ----------
export function OrganizePanel() {
  const v = useManualView();
  const dirty = v.sort !== 'default' || v.types.length || v.group;
  return (
    <section id="manual-panel" className="p-3 rounded-md mb-4 scroll-mt-16" style={panel} aria-label={t('Organizar documentos')}>
      <Header icon={ArrowDownUp} title={t('Organizar documentos')} onClose={closePanel} />
      <p className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: 'rgb(var(--c) / 0.5)' }}>{t('Ordenar por')}</p>
      <div className="grid gap-1.5 sm:grid-cols-2 mb-3">
        {SORTS.map((s) => (
          <button key={s.id} type="button" onClick={() => setSort(s.id)} aria-pressed={v.sort === s.id}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-sm text-[11px] text-left" style={chip(v.sort === s.id)}>
            <span className="w-3 shrink-0">{v.sort === s.id && <Check size={11} />}</span>{t(s.label)}
          </button>
        ))}
      </div>
      <p className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: 'rgb(var(--c) / 0.5)' }}>{t('Tipo de documento')} <span className="normal-case tracking-normal">({v.types.length ? t('só os escolhidos') : t('todos')})</span></p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {DOC_TYPES.map((ty) => (
          <button key={ty} type="button" onClick={() => toggleType(ty)} aria-pressed={v.types.includes(ty)} className="px-2.5 py-1 rounded-full text-[11px] uppercase tracking-wider" style={chip(v.types.includes(ty))}>{ty}</button>
        ))}
      </div>
      <label className="flex items-center gap-2 text-[11px] mb-3 cursor-pointer" style={{ color: 'rgb(var(--c) / 0.85)' }}>
        <input type="checkbox" checked={v.group} onChange={(e) => setGroup(e.target.checked)} style={{ accentColor: 'rgb(var(--c))' }} />
        <Layers size={12} /> {t('Agrupar por tipo de documento')}
      </label>
      {dirty ? <button type="button" onClick={clearOrganize} className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-sm" style={{ border: '1px solid #ef444488', color: '#ef4444' }}>{t('Repor organização')}</button> : null}
    </section>
  );
}

// ---------- Aplicar filtros e ordenação à estante ----------
export const typeOf = (d) => String(d?.type || (d?.name || '').split('.').pop() || '').toLowerCase();
export function organize(docs, v, isGuide) {
  let list = docs.filter((d) => (!v.types.length || v.types.includes(typeOf(d))) && (!v.themes.length || temasDoDoc(d).some((x) => v.themes.includes(x))));
  const by = {
    default: (a, b) => (isGuide(b) - isGuide(a)) || String(b.created_date).localeCompare(String(a.created_date)),
    new: (a, b) => String(b.created_date).localeCompare(String(a.created_date)),
    old: (a, b) => String(a.created_date).localeCompare(String(b.created_date)),
    az: (a, b) => String(a.title).localeCompare(String(b.title), 'pt', { sensitivity: 'base' }),
    za: (a, b) => String(b.title).localeCompare(String(a.title), 'pt', { sensitivity: 'base' }),
    small: (a, b) => (a.size_kb || 0) - (b.size_kb || 0),
    big: (a, b) => (b.size_kb || 0) - (a.size_kb || 0),
  }[v.sort] || (() => 0);
  list = [...list].sort(by);
  if (!v.group) return [{ key: 'all', label: null, docs: list }];
  const order = [...DOC_TYPES, 'outro'];
  const groups = new Map();
  for (const d of list) { const k = order.includes(typeOf(d)) ? typeOf(d) : 'outro'; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(d); }
  return order.filter((k) => groups.has(k)).map((k) => ({ key: k, label: k.toUpperCase(), docs: groups.get(k) }));
}
export { TEMAS };
