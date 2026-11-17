import React, { useState } from 'react';
import Anthropic from '@anthropic-ai/sdk';
import { Bot, KeyRound, Trash2 } from 'lucide-react';
import { MODELS, useAiConfig, setAiConfig } from '@/lib/ai/config';
import { IS_ARTIFACT } from '@/lib/ai/aiService';

const box = { background: 'rgb(var(--cd) / 0.4)', border: '1px solid rgb(var(--c) / 0.2)' };
const btn = { background: 'rgb(var(--cb) / 0.6)', border: '1px solid rgb(var(--c) / 0.3)', color: 'rgb(var(--c))' };

// Definições da IA online: chave da API da Anthropic (guardada só neste browser) e modelo
export default function AiSettings() {
  const cfg = useAiConfig();
  const [draft, setDraft] = useState('');
  const [msg, setMsg] = useState(null);
  const [testing, setTesting] = useState(false);

  const test = async (key = cfg.apiKey) => {
    setTesting(true); setMsg({ c: '#ffaa00', t: 'A testar a chave...' });
    try {
      const client = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true });
      await client.models.retrieve(cfg.model); // não gasta tokens
      setMsg({ c: 'rgb(var(--c))', t: 'Chave válida. A IA completa está ligada.' });
      return true;
    } catch (e) {
      const t = e instanceof Anthropic.AuthenticationError ? 'Chave recusada. Confirma que a copiaste toda.'
        : e instanceof Anthropic.PermissionDeniedError ? 'A chave não tem acesso a este modelo.'
          : e instanceof Anthropic.APIConnectionError ? 'Sem ligação ao serviço. Tenta com internet.'
            : `Não foi possível validar (${e?.status || 'erro'}).`;
      setMsg({ c: '#ff6666', t });
      return false;
    } finally { setTesting(false); }
  };
  const saveKey = async () => {
    const k = draft.trim();
    if (!k) return;
    setAiConfig({ apiKey: k }); setDraft('');
    await test(k);
  };

  return (
    <section className="p-3 rounded-sm mb-4" style={box}>
      <h3 className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold mb-2"><Bot size={14} /> Assistente IA</h3>
      {IS_ARTIFACT ? (
        <p className="text-[11px]" style={{ color: 'rgb(var(--c) / 0.7)' }}>Dentro do claude.ai o assistente usa a IA do próprio claude.ai. Não é preciso chave.</p>
      ) : (
        <>
          <p className="text-[11px] mb-3 leading-relaxed" style={{ color: 'rgb(var(--c) / 0.7)' }}>
            Sem chave, o assistente responde só com a base local (manual, dados da app e documentos). Com uma chave da API da Anthropic
            (console.anthropic.com) liga-se a IA completa quando há internet. A chave fica guardada <b>só neste browser</b> e só é enviada
            para api.anthropic.com. Os pedidos são cobrados na tua conta Anthropic. Não a guardes num dispositivo partilhado.
          </p>
          {cfg.apiKey ? (
            <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
              <KeyRound size={14} />
              <span>Chave guardada: {cfg.apiKey.slice(0, 7)}…{cfg.apiKey.slice(-4)}</span>
              <button type="button" disabled={testing} onClick={() => test()} className="px-2 py-1 rounded-sm text-[11px] uppercase" style={btn}>Testar</button>
              <button type="button" onClick={() => { setAiConfig({ apiKey: '' }); setMsg({ c: 'rgb(var(--c))', t: 'Chave apagada deste browser.' }); }} className="inline-flex items-center gap-1 px-2 py-1 rounded-sm text-[11px] uppercase" style={{ ...btn, color: '#ff8888', borderColor: '#ff666666' }}>
                <Trash2 size={12} /> Apagar
              </button>
            </div>
          ) : (
            <form className="flex gap-2 mb-3" onSubmit={(e) => { e.preventDefault(); saveKey(); }}>
              <input id="ai-key" type="password" autoComplete="off" spellCheck="false" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="sk-ant-..." aria-label="Chave da API da Anthropic"
                className="flex-1 min-w-0 px-2 py-2 rounded-sm text-xs" style={{ ...btn, outline: 'none' }} />
              <button type="submit" disabled={!draft.trim() || testing} className="px-3 py-2 rounded-sm text-xs uppercase disabled:opacity-40" style={{ ...btn, background: 'rgb(var(--c))', color: 'rgb(var(--cb))' }}>Guardar</button>
            </form>
          )}
          <label className="flex flex-col gap-1 text-[11px]" htmlFor="ai-model" style={{ color: 'rgb(var(--c) / 0.8)' }}>
            Modelo
            <select id="ai-model" value={cfg.model} onChange={(e) => setAiConfig({ model: e.target.value })} className="px-2 py-2 rounded-sm text-xs" style={{ ...btn, outline: 'none' }}>
              {MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </label>
          {msg && <p className="text-[11px] mt-2" role="status" style={{ color: msg.c }}>{msg.t}</p>}
        </>
      )}
    </section>
  );
}
