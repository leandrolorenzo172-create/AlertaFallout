import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderPlus, FilePlus, Trash2, Power, FileText, BrainCircuit, Search, BookOpen, Bot, ScrollText, RotateCcw } from 'lucide-react';
import { ACCEPT, importFile, listDocs, updateDoc, deleteDoc, searchDocs, requestOpen, refOf, onKbChange, getFile } from '@/lib/kb';
import { manualSections } from '@/data/survivalManual';
import { DEFAULT_INSTRUCTIONS, getState, getCustomText, parseInstructionFile, findRisks, diffLines, applyVersion, activate } from '@/lib/aiInstructions';
import { t, locale } from '@/i18n';
import { isGuide } from '@/lib/guide';
import { useFilesView, viewDocs, onImportRequest, filesFiltered, FILE_TYPES } from '@/files/filesTools';
import { NotePanel, TypeFilterPanel, SortPanel, ResetLibraryDialog } from '@/files/FilesPanels';

const box = { background: 'rgb(var(--cd) / 0.4)', border: '1px solid rgb(var(--c) / 0.2)' };
const btn = { background: 'rgb(var(--c) / 0.13)', border: '1px solid rgb(var(--c) / 0.35)', color: 'rgb(var(--c))' };
const norm = (t) => (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const sizeLabel = (kb) => (kb < 1024 ? `${Math.round(kb)} KB` : `${(kb / 1024).toFixed(1)} MB`);

// Gravações (aba RÁDIO > REC): leitor de áudio que só carrega o ficheiro quando se toca em ▶
function AudioDoc({ id }) {
  const [url, setUrl] = useState(null);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  if (!url) return <button type="button" onClick={async () => { const f = await getFile(id); if (f) setUrl(URL.createObjectURL(f)); }} className="mt-2 px-2 py-1 rounded-sm text-[10px] uppercase tracking-wider" style={btn}>▶ {t('Ouvir gravação')}</button>;
  return <audio src={url} controls autoPlay className="w-full mt-2" style={{ height: 32 }} />;
}

export default function KnowledgeFilesTab() {
  const navigate = useNavigate();
  const [docs, setDocs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [proposal, setProposal] = useState(null); // { name, text, diff, risks }
  const [ai, setAi] = useState(getState());
  const fileRef = useRef(null); const folderRef = useRef(null); const promptRef = useRef(null);

  const view = useFilesView();
  // IMPORTAR FICHEIRO (menu ≡): abre o mesmo seletor do botão "Ficheiros" (fluxo de importação existente)
  useEffect(() => onImportRequest(() => fileRef.current?.click()), []);

  const load = useCallback(() => listDocs().then(setDocs).catch(() => setStatus({ type: 'error', text: t('Não foi possível abrir o armazenamento local.') })), []);
  useEffect(() => {
    if (folderRef.current) folderRef.current.setAttribute('webkitdirectory', '');
    load();
    return onKbChange(load);
  }, [load]);

  const handleUpload = async (fileList) => {
    const arr = Array.from(fileList || []);
    if (!arr.length) return;
    setBusy(true);
    const n = { ok: 0, dup: 0, bad: 0, notext: 0 };
    for (let i = 0; i < arr.length; i++) {
      const f = arr[i];
      setStatus({ type: 'info', text: `IMPORTAR ➔ ${f.name} (${i + 1}/${arr.length})` });
      const r = await importFile(f, (step) => setStatus({ type: 'info', text: `${step} ➔ ${f.name} (${i + 1}/${arr.length})` }));
      if (r.status === 'ok') { n.ok++; if (!r.doc.chars) n.notext++; } else if (r.status === 'duplicado') n.dup++; else n.bad++;
    }
    setBusy(false);
    setStatus({
      type: n.bad ? 'error' : 'ok',
      text: [t('{n} indexado(s)', { n: n.ok }), n.dup && t('{n} já existia(m)', { n: n.dup }), n.bad && t('{n} falharam ou não são suportados', { n: n.bad }), n.notext && t('{n} sem texto (imagens ou PDF digitalizado: não há OCR)', { n: n.notext })].filter(Boolean).join(' · '),
    });
    if (fileRef.current) fileRef.current.value = '';
    if (folderRef.current) folderRef.current.value = '';
  };

  // Pesquisa unificada: documentos importados + manual incluído
  useEffect(() => {
    const words = norm(q).split(/[^a-z0-9]+/).filter((w) => w.length > 2);
    if (!words.length) { setResults(null); return undefined; }
    let alive = true;
    const t = setTimeout(async () => {
      const docHits = await searchDocs(q, { limit: 8, onlyEnabled: false }).catch(() => []);
      const manual = manualSections.filter((s) => words.every((w) => norm(`${s.title} ${s.content}`).includes(w))).slice(0, 5)
        .map((s) => { const i = norm(s.content).indexOf(words[0]); return { id: s.id, title: s.title, excerpt: `…${s.content.slice(Math.max(0, i - 60), i + 200).replace(/\s+/g, ' ')}…` }; });
      if (alive) setResults({ docHits, manual });
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [q, docs]);

  const askAi = (text) => { try { sessionStorage.setItem('ai_prefill', text); } catch (e) { /* sem armazenamento */ } navigate('/assistente'); };
  const openDoc = (id, page) => { requestOpen(id, page); navigate('/manual'); };

  const onPromptFile = async (file) => {
    if (!file) return;
    const text = parseInstructionFile(file.name, await file.text());
    setProposal({ name: file.name, text, diff: diffLines(getCustomText(), text), risks: findRisks(text) });
    if (promptRef.current) promptRef.current.value = '';
  };
  const activeCount = docs.filter((d) => d.enabled !== false).length;
  const shownDocs = viewDocs(docs, view); // filtro por tipo + ordenação (menu ≡)
  const typeCounts = Object.fromEntries(FILE_TYPES.map((ty) => [ty, docs.filter((d) => d.type === ty).length]));
  const removable = docs.filter((d) => !isGuide(d)).length;
  const statusColor = status?.type === 'error' ? '#ff6600' : status?.type === 'ok' ? 'rgb(var(--c))' : '#ffaa00';

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-1">
        <BrainCircuit size={16} />
        <h2 className="text-sm uppercase tracking-wider font-bold">{t('Base de Conhecimento')}</h2>
      </div>
      <p className="text-[10px] uppercase tracking-wider mb-3" style={{ color: 'rgb(var(--c) / 0.6)' }}>{activeCount}{' '}{t('ativo(s) ·')}{' '}{docs.length}{' '}{t('total')}</p>
      <p className="text-[11px] mb-3" style={{ color: 'rgb(var(--c) / 0.65)' }}>
        {t('PDF, DOCX, TXT, MD, JSON, CSV e XML são lidos e indexados neste dispositivo. A IA pesquisa neles e cita o documento e a página. Os documentos aparecem também no Manual, para leitura offline.')}
      </p>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className="flex items-center justify-center gap-2 py-3 rounded-sm text-xs uppercase tracking-wider disabled:opacity-50" style={btn}><FilePlus size={14} />{' '}{t('Ficheiros')}</button>
        <button type="button" disabled={busy} onClick={() => folderRef.current?.click()} className="flex items-center justify-center gap-2 py-3 rounded-sm text-xs uppercase tracking-wider disabled:opacity-50" style={btn}><FolderPlus size={14} />{' '}{t('Pasta')}</button>
      </div>
      <input id="kb-files" ref={fileRef} type="file" multiple accept={ACCEPT} hidden onChange={(e) => handleUpload(e.target.files)} />
      <input id="kb-folder" ref={folderRef} type="file" multiple hidden onChange={(e) => handleUpload(e.target.files)} />
      <p className="text-xs mb-3" role="status" style={{ color: statusColor, minHeight: '1.2em' }}>{status?.text}</p>

      {/* Painéis das ferramentas rápidas (menu ≡) */}
      {view.panel === 'note' && <NotePanel onSaved={(text) => setStatus({ type: 'ok', text })} />}
      {view.panel === 'filter' && <TypeFilterPanel counts={typeCounts} />}
      {view.panel === 'sort' && <SortPanel />}
      {view.confirmReset && <ResetLibraryDialog total={removable} onDone={(text, err) => setStatus({ type: err ? 'error' : 'ok', text })} />}

      {/* Pesquisa unificada */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-sm mb-2" style={box}>
        <Search size={14} />
        <input id="kb-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Procurar em documentos e no manual...')} className="flex-1 min-w-0 bg-transparent text-xs" style={{ outline: 'none', color: 'rgb(var(--c))' }} />
      </div>
      {results && (
        <div className="mb-4 flex flex-col gap-1.5">
          {results.docHits.length + results.manual.length === 0 && <p className="text-xs" style={{ color: 'rgb(var(--c) / 0.6)' }}>{t('Sem resultados.')}</p>}
          {results.docHits.map((h, i) => (
            <div key={`d${i}`} className="p-2 rounded-sm" style={box}>
              <p className="text-xs font-bold">📄 {refOf(h)}</p>
              <p className="text-[11px] my-1" style={{ color: 'rgb(var(--c) / 0.7)', overflowWrap: 'anywhere' }}>{h.excerpt}</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => openDoc(h.docId, h.page)} className="flex items-center gap-1 px-2 py-1 rounded-sm text-[10px] uppercase" style={btn}><BookOpen size={11} />{' '}{t('Abrir')}</button>
                <button type="button" onClick={() => askAi(q)} className="flex items-center gap-1 px-2 py-1 rounded-sm text-[10px] uppercase" style={btn}><Bot size={11} />{' '}{t('Perguntar à IA')}</button>
              </div>
            </div>
          ))}
          {results.manual.map((m) => (
            <div key={`m${m.id}`} className="p-2 rounded-sm" style={box}>
              <p className="text-xs font-bold">{t('📚 Manual incluído —')}{' '}{m.title}</p>
              <p className="text-[11px] my-1" style={{ color: 'rgb(var(--c) / 0.7)', overflowWrap: 'anywhere' }}>{m.excerpt}</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => navigate('/manual')} className="flex items-center gap-1 px-2 py-1 rounded-sm text-[10px] uppercase" style={btn}><BookOpen size={11} />{' '}{t('Abrir manual')}</button>
                <button type="button" onClick={() => askAi(q)} className="flex items-center gap-1 px-2 py-1 rounded-sm text-[10px] uppercase" style={btn}><Bot size={11} />{' '}{t('Perguntar à IA')}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Documentos */}
      <div className="flex flex-col gap-1.5 mb-6">
        {docs.length === 0 && <p className="text-center text-xs py-6 rounded-sm" style={{ ...box, color: 'rgb(var(--c) / 0.5)' }}>{t('> Sem documentos importados_')}</p>}
        {filesFiltered(view) && docs.length > 0 && (
          <p className="text-[10px] uppercase tracking-wider" style={{ color: 'rgb(var(--c) / 0.6)' }}>
            {view.types.length > 0 && <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle" style={{ background: '#ff0000' }} />}
            {view.types.length ? t('Filtro: {f} · {a} de {b}', { f: view.types.map((x) => x.toUpperCase()).join(', '), a: shownDocs.length, b: docs.length }) : t('{a} documento(s)', { a: shownDocs.length })}
          </p>
        )}
        {docs.length > 0 && shownDocs.length === 0 && <p className="text-center text-xs py-4 rounded-sm" style={{ ...box, color: 'rgb(var(--c) / 0.5)' }}>{t('Nenhum documento deste tipo. Abre o menu ≡ para mudar o filtro.')}</p>}
        {shownDocs.map((d) => (
          <div key={d.id} className="p-2.5 rounded-sm" style={{ ...box, opacity: d.enabled === false ? 0.55 : 1 }}>
            <div className="flex items-center gap-2">
              <FileText size={15} className="shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs truncate">{d.title}</p>
                <p className="text-[10px]" style={{ color: 'rgb(var(--c) / 0.55)' }}>
                  {t(d.category)} · {d.type.toUpperCase()} · {sizeLabel(d.size_kb)} · {new Date(d.created_date).toLocaleDateString(locale())} · {d.chars ? `${d.pages.length} ${d.unit}` : t('sem texto')}
                </p>
              </div>
              <button type="button" onClick={() => openDoc(d.id)} aria-label={`Abrir ${d.title}`} className="p-1.5 rounded-sm" style={btn}><BookOpen size={13} /></button>
              <button type="button" onClick={() => updateDoc(d.id, { enabled: d.enabled === false })} aria-pressed={d.enabled !== false} aria-label={`${d.enabled === false ? t('Ativar') : t('Desativar')} ${d.title}`} className="p-1.5 rounded-sm" style={btn}><Power size={13} /></button>
              <button type="button" onClick={() => setConfirmDel(d.id)} aria-label={`Remover ${d.title}`} className="p-1.5 rounded-sm" style={{ ...btn, color: '#ff6666', borderColor: '#ff666666' }}><Trash2 size={13} /></button>
            </div>
            {d.category === 'Áudio' && <AudioDoc id={d.id} />}
            {confirmDel === d.id && (
              <div className="mt-2 p-2 rounded-sm text-[11px]" style={{ background: '#ff000011', border: '1px solid #ff666666', color: '#ff8888' }}>
                {t('Remover apaga o ficheiro, o índice de pesquisa, os marcadores e o histórico de leitura deste documento.')}
                <div className="flex gap-2 mt-2">
                  <button type="button" onClick={() => { deleteDoc(d.id); setConfirmDel(null); }} className="px-2 py-1 rounded-sm uppercase" style={{ background: '#ff000033', border: '1px solid #ff6666', color: '#ff8888' }}>{t('Remover')}</button>
                  <button type="button" onClick={() => setConfirmDel(null)} className="px-2 py-1 rounded-sm uppercase" style={btn}>{t('Cancelar')}</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Instruções da IA */}
      <section className="p-3 rounded-sm" style={box}>
        <h3 className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold mb-2"><ScrollText size={14} />{' '}{t('Instruções da IA')}</h3>
        <p className="text-[11px] mb-2" style={{ color: 'rgb(var(--c) / 0.65)' }}>
          {t('Guião ativo:')}{' '}<b>{ai.versions.find((v) => v.id === ai.active)?.name || t('original da app')}</b>{t('. As regras de segurança são fixas e nenhum ficheiro as substitui. O guião só tem efeito quando a IA online está disponível; offline, as respostas vêm do manual e dos teus documentos.')}
        </p>
        <button type="button" onClick={() => promptRef.current?.click()} className="px-3 py-2 rounded-sm text-xs uppercase tracking-wider" style={btn}>{t('Importar instruções (.txt, .md, .json)')}</button>
        <input id="kb-prompt" ref={promptRef} type="file" accept=".txt,.md,.json" hidden onChange={(e) => onPromptFile(e.target.files?.[0])} />
        {proposal && (
          <div className="mt-3">
            <p className="text-xs mb-1">{t('Alterações propostas por')}{' '}<b>{proposal.name}</b>:</p>
            {proposal.risks.length > 0 && (
              <p className="text-[11px] mb-1 p-2 rounded-sm" style={{ background: '#ff660022', border: '1px solid #ff660066', color: '#ffaa00' }}>
                ⚠️ {proposal.risks.length}{' '}{t('linha(s) parecem tentar alterar as regras de segurança. Essas regras continuam ativas mesmo que apliques: "')}{proposal.risks[0].slice(0, 90)}"
              </p>
            )}
            <pre className="text-[10px] p-2 rounded-sm overflow-auto" style={{ maxHeight: 220, background: 'rgb(var(--cb) / 0.7)', border: '1px solid rgb(var(--c) / 0.2)', fontFamily: 'inherit' }}>
              {proposal.diff.filter((l) => l.t !== '=').length === 0 ? t('Sem diferenças em relação ao guião ativo.') : proposal.diff.map((l, i) => (
                <div key={i} style={{ color: l.t === '+' ? 'rgb(var(--c))' : l.t === '-' ? '#ff6666' : 'rgb(var(--c) / 0.35)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{l.t === '=' ? ' ' : l.t} {l.l}</div>
              ))}
            </pre>
            <div className="flex gap-2 mt-2">
              <button type="button" onClick={() => { applyVersion(proposal.name, proposal.text); setAi(getState()); setProposal(null); }} className="px-3 py-2 rounded-sm text-xs uppercase" style={{ ...btn, background: 'rgb(var(--c))', color: 'rgb(var(--cb))' }}>{t('Aprovar e aplicar')}</button>
              <button type="button" onClick={() => setProposal(null)} className="px-3 py-2 rounded-sm text-xs uppercase" style={btn}>{t('Cancelar')}</button>
            </div>
          </div>
        )}
        <p className="text-[10px] uppercase tracking-wider mt-3 mb-1" style={{ color: 'rgb(var(--c) / 0.6)' }}>{t('Histórico de versões')}</p>
        <ul className="flex flex-col gap-1 text-[11px]">
          <li className="flex items-center gap-2">
            <span className="flex-1 min-w-0 truncate">{t('Original da app (')}{DEFAULT_INSTRUCTIONS.length}{' '}{t('caracteres)')}</span>
            {ai.active ? <button type="button" onClick={() => { activate(null); setAi(getState()); }} className="flex items-center gap-1 px-2 py-1 rounded-sm uppercase" style={btn}><RotateCcw size={11} />{' '}{t('Repor')}</button> : <span>{t('ativo ✓')}</span>}
          </li>
          {ai.versions.map((v) => (
            <li key={v.id} className="flex items-center gap-2">
              <span className="flex-1 min-w-0 truncate">{v.name} · {new Date(v.date).toLocaleString(locale())}</span>
              {ai.active === v.id ? <span>{t('ativo ✓')}</span> : <button type="button" onClick={() => { activate(v.id); setAi(getState()); }} className="px-2 py-1 rounded-sm uppercase" style={btn}>{t('Reverter para esta')}</button>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
