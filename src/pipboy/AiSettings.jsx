import React, { useState } from 'react';
import { Bot, KeyRound, Trash2, RefreshCw } from 'lucide-react';
import { useAiConfig, setProvider, setProviderConfig } from '@/lib/ai/config';
import { PROVIDERS, ANTHROPIC_MODELS, listModels, streamChat } from '@/lib/ai/providers';
import { IS_ARTIFACT } from '@/lib/ai/aiService';
import { t } from '@/i18n';

const box = { background: 'rgb(var(--cd) / 0.4)', border: '1px solid rgb(var(--c) / 0.2)' };
const btn = { background: 'rgb(var(--cb) / 0.6)', border: '1px solid rgb(var(--c) / 0.3)', color: 'rgb(var(--c))' };
const ERR = {
  auth: t('Chave recusada. Confirma que a copiaste toda.'),
  permission: t('A chave não tem acesso a este serviço ou modelo.'),
  rate: t('Limite de pedidos ou de saldo atingido nesta conta.'),
  network: t('Sem ligação ao serviço.'),
  busy: t('O serviço está sobrecarregado neste momento. Tenta daqui a pouco ou escolhe outro modelo.'),
};

// Definições da IA online: escolher o serviço (Claude, ChatGPT, Gemini ou outro compatível com OpenAI),
// guardar a chave (só neste browser) e escolher o modelo
export default function AiSettings() {
  const cfg = useAiConfig();
  const p = cfg.provider; const pc = cfg.providers[p]; const meta = PROVIDERS[p];
  const [draft, setDraft] = useState('');
  const [msg, setMsg] = useState(null);
  const [testing, setTesting] = useState(false);
  const [models, setModels] = useState({ anthropic: ANTHROPIC_MODELS });

  const test = async (over = {}) => {
    const c = { ...pc, ...over };
    if (p === 'custom' && !c.baseUrl) { setMsg({ c: '#ffaa00', t: t('Indica o endereço do serviço.') }); return; }
    setTesting(true); setMsg({ c: '#ffaa00', t: t('A testar a ligação...') });
    try {
      const list = await listModels(p, c); // valida a chave sem gastar tokens
      setModels((m) => ({ ...m, [p]: list }));
      // se o modelo guardado não existe nesta conta, escolhe o primeiro disponível
      let model = c.model;
      if (list.length && !list.some((x) => x.id === model)) model = list[0].id;
      setProviderConfig(p, { model, models: list.map((x) => x.id) });
      // Pergunta-teste muito curta: confirma que o modelo responde mesmo (listar modelos não chega)
      setMsg({ c: '#ffaa00', t: t('Chave válida. A confirmar que o modelo {m} responde...', { m: model }) });
      const r = await streamChat(p, { ...c, model, models: list.map((x) => x.id) }, {
        system: 'Responde apenas com a palavra OK.', messages: [{ role: 'user', content: 'Teste de ligação. Responde só OK.' }], onText: () => {},
      });
      if (r.model && r.model !== model) { model = r.model; setProviderConfig(p, { model }); }
      setMsg({ c: 'rgb(var(--c))', t: `${t('Ligação válida')}${list.length ? ` · ${t('{n} modelos disponíveis', { n: list.length })}` : ''} · ${t('{m} respondeu', { m: model })}${r.model ? t(' (o modelo anterior estava indisponível e foi trocado)') : ''}. ${t('A IA completa está ligada.')}` });
    } catch (e) {
      setMsg({ c: '#ff6666', t: ERR[e.kind] ? `${ERR[e.kind]}${e.kind === 'network' && p === 'custom' ? t(' Confirma o endereço e se o servidor aceita pedidos do browser (CORS).') : ''}` : t('Não foi possível validar ({e}).', { e: e.message }) });
    } finally { setTesting(false); }
  };
  const saveKey = async () => {
    const k = draft.trim();
    if (!k) return;
    setProviderConfig(p, { key: k }); setDraft('');
    await test({ key: k });
  };
  const list = models[p] || [];

  if (IS_ARTIFACT) {
    return (
      <section className="p-3 rounded-sm mb-4" style={box}>
        <h3 className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold mb-2"><Bot size={14} />{' '}{t('Assistente IA')}</h3>
        <p className="text-[11px]" style={{ color: 'rgb(var(--c) / 0.7)' }}>{t('Dentro do claude.ai o assistente usa a IA do próprio claude.ai. Não é preciso chave.')}</p>
      </section>
    );
  }
  return (
    <section className="p-3 rounded-sm mb-4" style={box}>
      <h3 className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold mb-2"><Bot size={14} />{' '}{t('Assistente IA')}</h3>
      <p className="text-[11px] mb-3 leading-relaxed" style={{ color: 'rgb(var(--c) / 0.7)' }}>
        {t('Sem chave, o assistente responde só com a base local (manual, dados da app e documentos). Com a chave de um destes serviços liga-se a IA completa quando há internet. A chave fica guardada')}{' '}<b>{t('só neste browser')}</b>{t(', só é enviada para o serviço a que pertence e os pedidos são cobrados na tua conta desse serviço. Não a guardes num dispositivo partilhado.')}
      </p>

      <div className="grid grid-cols-2 gap-2 mb-3" role="radiogroup" aria-label={t('Serviço de IA')}>
        {Object.entries(PROVIDERS).map(([id, m]) => {
          const on = id === p; const ready = id === 'custom' ? !!cfg.providers[id].baseUrl : !!cfg.providers[id].key;
          return (
            <button key={id} type="button" role="radio" aria-checked={on} onClick={() => { setProvider(id); setMsg(null); setDraft(''); }}
              className="px-2 py-2 rounded-sm text-[11px] text-left" style={{ ...btn, background: on ? 'rgb(var(--c))' : btn.background, color: on ? 'rgb(var(--cb))' : btn.color }}>
              {m.label}{ready ? ' ✓' : ''}
            </button>
          );
        })}
      </div>

      {p === 'custom' && (
        <label className="flex flex-col gap-1 text-[11px] mb-3" htmlFor="ai-base" style={{ color: 'rgb(var(--c) / 0.8)' }}>
          {t('Endereço da API (compatível com OpenAI)')}
          <input id="ai-base" type="url" autoComplete="off" spellCheck="false" value={pc.baseUrl} onChange={(e) => setProviderConfig(p, { baseUrl: e.target.value.trim() })}
            placeholder={t('https://openrouter.ai/api/v1')} className="px-2 py-2 rounded-sm text-xs" style={{ ...btn, outline: 'none' }} />
          <span style={{ color: 'rgb(var(--c) / 0.55)' }}>{t('Exemplos: OpenRouter, Groq, Mistral, DeepSeek ou um servidor local (Ollama: http://localhost:11434/v1).')}</span>
        </label>
      )}

      {pc.key ? (
        <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
          <KeyRound size={14} />
          <span>{t('Chave')}{' '}{meta.short}: {pc.key.slice(0, 6)}…{pc.key.slice(-4)}</span>
          <button type="button" onClick={() => { setProviderConfig(p, { key: '' }); setMsg({ c: 'rgb(var(--c))', t: t('Chave apagada deste browser.') }); }} className="inline-flex items-center gap-1 px-2 py-1 rounded-sm text-[11px] uppercase" style={{ ...btn, color: '#ff8888', borderColor: '#ff666666' }}>
            <Trash2 size={12} />{' '}{t('Apagar')}
          </button>
        </div>
      ) : (
        <form className="flex gap-2 mb-3" onSubmit={(e) => { e.preventDefault(); saveKey(); }}>
          <input id="ai-key" type="password" autoComplete="off" spellCheck="false" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={meta.keyHint} aria-label={`${t('Chave da API')} ${meta.short}`}
            className="flex-1 min-w-0 px-2 py-2 rounded-sm text-xs" style={{ ...btn, outline: 'none' }} />
          <button type="submit" disabled={!draft.trim() || testing} className="px-3 py-2 rounded-sm text-xs uppercase disabled:opacity-40" style={{ ...btn, background: 'rgb(var(--c))', color: 'rgb(var(--cb))' }}>{t('Guardar')}</button>
        </form>
      )}
      {meta.keyUrl && !pc.key && <p className="text-[10px] -mt-2 mb-3" style={{ color: 'rgb(var(--c) / 0.55)' }}>{t('Cria a chave em')}{' '}{meta.keyUrl}.</p>}

      <label className="flex flex-col gap-1 text-[11px]" htmlFor="ai-model" style={{ color: 'rgb(var(--c) / 0.8)' }}>
        {t('Modelo')}
        <div className="flex gap-2">
          {list.length ? (
            <select id="ai-model" value={pc.model} onChange={(e) => setProviderConfig(p, { model: e.target.value })} className="flex-1 min-w-0 px-2 py-2 rounded-sm text-xs" style={{ ...btn, outline: 'none' }}>
              {!list.some((x) => x.id === pc.model) && pc.model && <option value={pc.model}>{pc.model}</option>}
              {list.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          ) : (
            <input id="ai-model" type="text" autoComplete="off" spellCheck="false" value={pc.model} onChange={(e) => setProviderConfig(p, { model: e.target.value.trim() })}
              placeholder={t('nome do modelo')} className="flex-1 min-w-0 px-2 py-2 rounded-sm text-xs" style={{ ...btn, outline: 'none' }} />
          )}
          <button type="button" disabled={testing} onClick={() => test()} className="inline-flex items-center gap-1 px-2 py-1 rounded-sm text-[11px] uppercase disabled:opacity-40" style={btn}>
            <RefreshCw size={12} />{' '}{t('Testar')}
          </button>
        </div>
        <span style={{ color: 'rgb(var(--c) / 0.55)' }}>{t('“Testar” confirma a chave, mostra os modelos da tua conta e faz uma pergunta-teste de uma palavra (custo ínfimo).')}</span>
      </label>
      {msg && <p className="text-[11px] mt-2" role="status" style={{ color: msg.c }}>{msg.t}</p>}
    </section>
  );
}
