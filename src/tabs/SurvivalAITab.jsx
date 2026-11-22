import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUp, Square, Trash2, Copy, Check, FileText, BookOpen, LayoutGrid, Settings } from 'lucide-react';
import { ask, onlineProvider, providerName } from '@/lib/ai/aiService';
import { useNetwork } from '@/lib/ai/net';
import { useAiConfig } from '@/lib/ai/config';
import { topics } from '@/lib/ai/localEngine';
import { renderMarkdown } from '@/lib/ai/markdown';
import { requestOpen } from '@/lib/kb';
import { aiSuggestions } from '@/data/survivalKnowledge';
import Mascot from '../pipboy/Mascot';
import { t } from '@/i18n';

// Histórico guardado no dispositivo, para consulta mesmo sem rede
const STORE = 'pb_ai_chat_v2';
const loadChat = () => { try { const v = JSON.parse(localStorage.getItem(STORE)); return Array.isArray(v) ? v : []; } catch { return []; } };
const saveChat = (msgs) => { try { localStorage.setItem(STORE, JSON.stringify(msgs.slice(-200))); } catch { /* sem armazenamento */ } };
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const SOURCE_PILL = {
  online: { label: t('IA online'), color: 'rgb(var(--c))' },
  local: { label: t('Base local'), color: '#ffaa00' },
  offline: { label: t('Offline · base local'), color: '#ffaa00' },
};

function StatusBadge({ net, provider }) {
  const navigate = useNavigate();
  let dot = '#22cc55'; let text = t('Online (IA Completa · {p})', { p: providerName(provider) }); let action = null;
  if (net !== 'online') { dot = '#ff9900'; text = t('Offline (Base de Conhecimento Local)'); } else if (!provider) {
    dot = '#e6c200'; text = t('Online · IA não configurada (respostas locais)');
    action = <button type="button" onClick={() => navigate('/definicoes')} className="underline ml-1" style={{ color: 'rgb(var(--c))' }}>{t('Configurar')}</button>;
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] tracking-wide" role="status" aria-live="polite"
      style={{ border: '1px solid rgb(var(--c) / 0.25)', background: 'rgb(var(--cd) / 0.5)', color: 'rgb(var(--c) / 0.9)' }}>
      <i className="w-2 h-2 rounded-full shrink-0" style={{ background: dot, boxShadow: `0 0 6px ${dot}` }} />
      {text}{action}
    </span>
  );
}

function RefChip({ r }) {
  const navigate = useNavigate();
  const Icon = r.source === 'kb' ? FileText : r.source === 'app' ? LayoutGrid : BookOpen;
  const open = () => {
    if (r.source === 'kb' && r.docId) { requestOpen(r.docId, r.page || 1); navigate('/manual'); } else if (r.route) navigate(r.route);
  };
  const clickable = (r.source === 'kb' && r.docId) || r.route;
  return (
    <button type="button" onClick={open} disabled={!clickable} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-left max-w-full"
      style={{ border: '1px solid rgb(var(--c) / 0.2)', color: 'rgb(var(--c) / 0.8)', background: 'transparent' }}>
      <Icon size={11} className="shrink-0" /><span className="truncate">{r.label}</span>
    </button>
  );
}

function AiMessage({ m, streaming }) {
  const [copied, setCopied] = useState(false);
  const html = useMemo(() => renderMarkdown(m.text || ''), [m.text]);
  const pill = SOURCE_PILL[m.source];
  const copy = async () => {
    try { await navigator.clipboard.writeText(m.text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* sem acesso */ }
  };
  return (
    <div className="ai-msg">
      <div className="flex items-center gap-2 mb-1.5 text-[10px] uppercase tracking-wider" style={{ color: 'rgb(var(--c) / 0.55)' }}>
        <span style={{ color: 'rgb(var(--c))' }}>{t('◆ Assistente')}</span>
        {pill && <span style={{ color: pill.color }}>· {pill.label}{m.source === 'online' && m.provider ? ` · ${m.provider}` : ''}</span>}
      </div>
      {m.notice && <p className="text-[11px] mb-2" style={{ color: '#ffaa00' }}>{m.notice}</p>}
      {m.text ? (
        <div className={`md ${streaming ? 'md-streaming' : ''}`} dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <div className="ai-typing" aria-label={t('A escrever')}><i /><i /><i /><span>{m.source === 'online' ? t('A pensar…') : t('A consultar a base local…')}</span></div>
      )}
      {!streaming && m.refs?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">{m.refs.map((r, i) => <RefChip key={i} r={r} />)}</div>
      )}
      {!streaming && m.text && (
        <button type="button" onClick={copy} className="mt-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider" style={{ color: 'rgb(var(--c) / 0.5)' }} aria-label={t('Copiar resposta')}>
          {copied ? <Check size={12} /> : <Copy size={12} />}{copied ? t('Copiado') : t('Copiar')}
        </button>
      )}
    </div>
  );
}

export default function SurvivalAITab() {
  const navigate = useNavigate();
  const net = useNetwork();
  const cfg = useAiConfig(); // volta a desenhar quando a chave muda
  const provider = useMemo(() => onlineProvider(), [cfg]); // eslint-disable-line react-hooks/exhaustive-deps
  const [messages, setMessages] = useState(loadChat);
  const [input, setInput] = useState(() => { try { const q = sessionStorage.getItem('ai_prefill') || ''; sessionStorage.removeItem('ai_prefill'); return q; } catch { return ''; } });
  const [busyId, setBusyId] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [starters, setStarters] = useState([]);
  const ctrlRef = useRef(null);
  const endRef = useRef(null);
  const taRef = useRef(null);

  // Sugestões iniciais: documentos da aba Conhecimento primeiro, depois temas do núcleo do assistente
  useEffect(() => {
    let alive = true;
    topics(6, true).then((t) => {
      if (!alive) return;
      const fromDocs = t.slice(0, 2).map((x) => (x.source === 'kb'
        ? { q: t('O que diz "{x}"?', { x: x.title }), sub: t('Da tua base de conhecimento') }
        : { q: `Resume: ${x.title}`, sub: t('Do manual incluído') }));
      const fixed = aiSuggestions.slice(0, 4 - Math.min(2, fromDocs.length)).map((q) => ({ q, sub: t('Sobrevivência') }));
      setStarters([...fromDocs, ...fixed].slice(0, 4));
    }).catch(() => setStarters(aiSuggestions.slice(0, 4).map((q) => ({ q, sub: t('Sobrevivência') }))));
    return () => { alive = false; };
  }, []);

  useEffect(() => { if (!busyId) saveChat(messages); }, [messages, busyId]);
  // Ao enviar, a pergunta sobe para o topo e a resposta lê-se desde o início (como no Gemini/Claude)
  const scrollToMsg = useRef(null);
  useEffect(() => {
    if (!scrollToMsg.current) return;
    const el = document.querySelector(`[data-msg="${scrollToMsg.current}"]`);
    scrollToMsg.current = null;
    if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [messages]);
  useEffect(() => { // ao abrir a aba com conversa guardada, mostrar o fim
    endRef.current?.scrollIntoView({ block: 'end' });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => ctrlRef.current?.abort(), []);
  // a caixa de texto cresce com o conteúdo
  useEffect(() => { const t = taRef.current; if (t) { t.style.height = 'auto'; t.style.height = `${Math.min(t.scrollHeight, 160)}px`; } }, [input]);

  const patch = (id, p) => setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...p } : m)));

  async function send(text) {
    const q = (text ?? input).trim();
    if (!q || busyId) return;
    const history = messages;
    const userMsg = { id: uid(), role: 'user', text: q, ts: Date.now() };
    const aiId = uid();
    const willBeOnline = net === 'online' && !!provider;
    scrollToMsg.current = userMsg.id;
    setMessages((prev) => [...prev, userMsg, { id: aiId, role: 'assistant', text: '', source: willBeOnline ? 'online' : (net === 'online' ? 'local' : 'offline'), ts: Date.now() }]);
    setInput('');
    setBusyId(aiId);
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    const started = Date.now();
    try {
      const r = await ask({ question: q, history, signal: ctrl.signal, onText: (t) => patch(aiId, { text: t }) });
      if (r.source !== 'online') { const wait = 450 - (Date.now() - started); if (wait > 0) await new Promise((res) => setTimeout(res, wait)); } // indicador de leitura breve
      patch(aiId, { text: r.text, followups: r.followups || [], refs: r.refs || [], source: r.source, notice: r.notice, provider: r.provider });
    } catch (e) {
      setMessages((prev) => prev.map((m) => (m.id === aiId ? { ...m, text: m.text ? `${m.text}\n\n_Interrompido._` : '_Interrompido._', followups: [] } : m)));
    } finally {
      setBusyId(null);
      ctrlRef.current = null;
    }
  }

  const lastAi = [...messages].reverse().find((m) => m.role === 'assistant');
  const empty = messages.length === 0;

  return (
    <div className="ai-tab px-4 pt-3 flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm uppercase tracking-wider font-bold">{t('Assistente')}</h2>
          <StatusBadge net={net} provider={provider} />
        </div>
        {!empty && (confirmClear ? (
          <span className="flex items-center gap-2 text-[11px]">
            {t('Apagar a conversa?')}
            <button type="button" onClick={() => { ctrlRef.current?.abort(); setMessages([]); saveChat([]); setConfirmClear(false); }} className="px-2 py-1 rounded-sm" style={{ border: '1px solid #ff6666', color: '#ff8888' }}>{t('Apagar')}</button>
            <button type="button" onClick={() => setConfirmClear(false)} className="px-2 py-1 rounded-sm" style={{ border: '1px solid rgb(var(--c) / 0.3)' }}>{t('Cancelar')}</button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirmClear(true)} className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider" style={{ color: 'rgb(var(--c) / 0.55)' }}>
            <Trash2 size={12} />{' '}{t('Nova conversa')}
          </button>
        ))}
      </div>

      <div className="ai-thread flex-1">
        {empty ? (
          <div className="ai-empty">
            <Mascot mode="base" style={{ width: 64 }} />
            <p className="text-lg mt-2">{t('Em que posso ajudar?')}</p>
            <p className="text-[11px] mt-1 mb-4" style={{ color: 'rgb(var(--c) / 0.6)' }}>
              {net !== 'online' ? t('Sem internet: respondo com o manual, os dados da app e os documentos da aba Conhecimento.')
                : provider ? t('Pergunta o que quiseres. Uso também os teus documentos e os dados da app.')
                  : t('Sem chave de IA configurada respondo com a base local. Podes ligar a IA completa nas Definições.')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
              {starters.map((s) => (
                <button key={s.q} type="button" onClick={() => send(s.q)} className="ai-card text-left">
                  <span className="block text-sm">{s.q}</span>
                  <span className="block text-[10px] mt-1 uppercase tracking-wider" style={{ color: 'rgb(var(--c) / 0.5)' }}>{s.sub}</span>
                </button>
              ))}
            </div>
            {net === 'online' && !provider && (
              <button type="button" onClick={() => navigate('/definicoes')} className="mt-4 inline-flex items-center gap-1.5 text-[11px] underline" style={{ color: 'rgb(var(--c) / 0.8)' }}>
                <Settings size={12} />{' '}{t('Ligar a IA completa nas Definições')}
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-5 pb-4">
            {messages.map((m) => (m.role === 'user' ? (
              <div key={m.id} data-msg={m.id} className="user-msg">{m.text}</div>
            ) : (
              <div key={m.id} data-msg={m.id}>
                <AiMessage m={m} streaming={busyId === m.id} />
                {m.id === lastAi?.id && busyId !== m.id && m.followups?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3" aria-label={t('Sugestões de seguimento')}>
                    {m.followups.map((f) => <button key={f} type="button" className="ai-chip" onClick={() => send(f)}>{f}</button>)}
                  </div>
                )}
              </div>
            )))}
          </div>
        )}
        <div ref={endRef} style={{ scrollMarginBottom: 170 }} />
      </div>

      <form className="ai-composer" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <textarea
          id="ai-input"
          ref={taRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={net !== 'online' ? t('Pergunta à base local...') : t('Escreve a tua pergunta...')}
          aria-label={t('Mensagem para o assistente')}
        />
        {busyId ? (
          <button type="button" onClick={() => ctrlRef.current?.abort()} className="ai-send" aria-label={t('Parar a resposta')}><Square size={14} fill="currentColor" /></button>
        ) : (
          <button type="submit" disabled={!input.trim()} className="ai-send" aria-label={t('Enviar')}><ArrowUp size={18} /></button>
        )}
      </form>
    </div>
  );
}
