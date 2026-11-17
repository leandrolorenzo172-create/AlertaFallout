// Fornecedores de IA online. Cada um usa o SDK oficial, carregado só quando é preciso.
//  - anthropic: Claude (@anthropic-ai/sdk)
//  - openai:    ChatGPT (openai)
//  - gemini:    Google Gemini (@google/genai)
//  - custom:    qualquer serviço compatível com a API da OpenAI (OpenRouter, Groq, Mistral, DeepSeek, Ollama...),
//               com o SDK da OpenAI e o endereço indicado pelo utilizador
// As chaves são do próprio utilizador, ficam no browser dele e só vão para o serviço escolhido.

export const PROVIDERS = {
  anthropic: { label: 'Claude (Anthropic)', short: 'Claude', keyHint: 'sk-ant-...', keyUrl: 'console.anthropic.com', defaultModel: 'claude-opus-5-5' },
  openai: { label: 'ChatGPT (OpenAI)', short: 'ChatGPT', keyHint: 'sk-...', keyUrl: 'platform.openai.com', defaultModel: 'gpt-5.5' },
  gemini: { label: 'Gemini (Google)', short: 'Gemini', keyHint: 'AIza...', keyUrl: 'aistudio.google.com', defaultModel: 'gemini-3.8-flash' },
  custom: { label: 'Outro (compatível com OpenAI)', short: 'IA personalizada', keyHint: 'chave (opcional em servidores locais)', keyUrl: '', defaultModel: '' },
};
export const ANTHROPIC_MODELS = [
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5 (mais capaz)' },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5 (equilibrado)' },
  { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5 (mais rápido e barato)' },
];

// ---------- Erros: o mesmo formato para todos ----------
export class AiError extends Error {
  constructor(kind, message, status) { super(message); this.kind = kind; this.status = status; } // kind: auth | permission | rate | busy | network | abort | other
}
async function normalize(provider, e) {
  if (e instanceof AiError) return e;
  if (e?.name === 'AbortError') return new AiError('abort', 'cancelado');
  if (provider === 'anthropic') {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    if (e instanceof Anthropic.APIUserAbortError) return new AiError('abort', 'cancelado');
    if (e instanceof Anthropic.AuthenticationError) return new AiError('auth', 'chave recusada', 401);
    if (e instanceof Anthropic.PermissionDeniedError) return new AiError('permission', 'sem permissão para este modelo', 403);
    if (e instanceof Anthropic.RateLimitError) return new AiError('rate', 'limite de pedidos atingido', 429);
    if (e instanceof Anthropic.APIConnectionError) return new AiError('network', 'sem ligação ao serviço');
    if (e instanceof Anthropic.APIError) return new AiError('other', `erro ${e.status || ''}`.trim(), e.status);
  } else if (provider === 'openai' || provider === 'custom') {
    const { default: OpenAI } = await import('openai');
    if (e instanceof OpenAI.APIUserAbortError) return new AiError('abort', 'cancelado');
    if (e instanceof OpenAI.AuthenticationError) return new AiError('auth', 'chave recusada', 401);
    if (e instanceof OpenAI.PermissionDeniedError) return new AiError('permission', 'sem permissão para este modelo', 403);
    if (e instanceof OpenAI.RateLimitError) return new AiError('rate', 'limite de pedidos ou de saldo atingido', 429);
    if (e instanceof OpenAI.NotFoundError) return new AiError('other', 'modelo ou endereço não encontrado', 404);
    if (e instanceof OpenAI.APIConnectionError) return new AiError('network', provider === 'custom' ? 'sem ligação ao serviço (confirma o endereço e se o servidor aceita pedidos do browser)' : 'sem ligação ao serviço');
    if (e instanceof OpenAI.APIError) return new AiError('other', `erro ${e.status || ''}`.trim(), e.status);
  } else if (provider === 'gemini') {
    const { ApiError } = await import('@google/genai');
    if (e instanceof ApiError) {
      if (e.status === 400 && /api key/i.test(e.message)) return new AiError('auth', 'chave recusada', 400);
      if (e.status === 401) return new AiError('auth', 'chave recusada', 401);
      if (e.status === 403) return new AiError('permission', 'sem permissão (confirma a chave e o modelo)', 403);
      if (e.status === 429) return new AiError('rate', 'limite de pedidos atingido', 429);
      if (e.status === 404) return new AiError('other', 'modelo não encontrado', 404);
      if (e.status === 503 || e.status === 502 || e.status === 504) return new AiError('busy', `o Gemini está sobrecarregado neste momento (erro ${e.status})`, e.status);
      if (e.status >= 500) return new AiError('busy', `erro do servidor do Gemini (${e.status})`, e.status);
      return new AiError('other', `erro ${e.status}`, e.status);
    }
  }
  if (e instanceof TypeError) return new AiError('network', 'sem ligação ao serviço');
  return new AiError('other', e?.message || 'erro desconhecido');
}

// ---------- Clientes ----------
async function anthropicClient(cfg) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  return new Anthropic({ apiKey: cfg.key, dangerouslyAllowBrowser: true });
}
async function openaiClient(cfg, provider) {
  const { default: OpenAI } = await import('openai');
  const opts = { apiKey: cfg.key || 'sem-chave', dangerouslyAllowBrowser: true };
  if (provider === 'custom') opts.baseURL = cfg.baseUrl.replace(/\/+$/, '');
  return new OpenAI(opts);
}
async function geminiClient(cfg) {
  const { GoogleGenAI } = await import('@google/genai');
  const opts = { apiKey: cfg.key };
  if (cfg.fetch) opts.httpOptions = { fetch: cfg.fetch }; // só usado nos testes
  return new GoogleGenAI(opts);
}

// ---------- Gemini: tentativas e modelos de recurso ----------
// O Gemini responde muitas vezes 503 ("model is overloaded") ou 500 em horas de ponta, sobretudo nos modelos mais recentes.
// Em vez de desistir à primeira: repete com espera crescente e, se o modelo escolhido continuar indisponível,
// passa para outros modelos de conversa da mesma conta (primeiro os estáveis "Flash").
const GEMINI_RETRY = new Set([500, 502, 503, 504]);
const GEMINI_FALLBACKS = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-flash-lite-latest', 'gemini-2.5-flash-lite', 'gemini-pro-latest', 'gemini-2.5-pro'];
const sleep = (ms, signal) => new Promise((res, rej) => {
  const t = setTimeout(res, ms);
  signal?.addEventListener('abort', () => { clearTimeout(t); rej(new AiError('abort', 'cancelado')); }, { once: true });
});
const geminiStatus = (e) => (typeof e?.status === 'number' ? e.status : 0);
// Ordem de modelos a tentar: o escolhido, depois os da lista da conta (guardada no "Testar") e os de recurso conhecidos
export function geminiCandidates(cfg) {
  const known = (cfg.models || []).map((m) => (typeof m === 'string' ? m : m.id)).filter(Boolean);
  const rank = (id) => (/preview|exp/i.test(id) ? 2 : 0) + (/pro/i.test(id) ? 1 : 0); // estáveis e Flash primeiro
  const fromAccount = known.filter((id) => id !== cfg.model).sort((a, b) => rank(a) - rank(b));
  const fallbacks = known.length ? GEMINI_FALLBACKS.filter((id) => known.includes(id)) : GEMINI_FALLBACKS;
  return [...new Set([cfg.model, ...fallbacks, ...fromAccount].filter(Boolean))].slice(0, 5);
}

// ---------- Lista de modelos (também serve para testar a chave) ----------
const OPENAI_SKIP = /(embedding|tts|whisper|transcribe|audio|realtime|image|dall-e|moderation|search|computer|codex|instruct|davinci|babbage|sora)/i;
export async function listModels(provider, cfg) {
  try {
    if (provider === 'anthropic') {
      const client = await anthropicClient(cfg);
      await client.models.retrieve(cfg.model || PROVIDERS.anthropic.defaultModel); // valida a chave sem gastar tokens
      return ANTHROPIC_MODELS;
    }
    if (provider === 'openai' || provider === 'custom') {
      const client = await openaiClient(cfg, provider);
      const out = [];
      for await (const m of client.models.list()) out.push(m);
      const byNewest = (a, b) => (b.created || 0) - (a.created || 0);
      if (provider === 'openai') return out.filter((m) => /^(gpt|o\d|chatgpt)/i.test(m.id) && !OPENAI_SKIP.test(m.id)).sort(byNewest).map((m) => ({ id: m.id, label: m.id }));
      // Serviço personalizado: mostra todos, mas os que não servem para conversar (embeddings, áudio...) vão para o fim
      const chat = out.filter((m) => !OPENAI_SKIP.test(m.id)).sort(byNewest);
      const other = out.filter((m) => OPENAI_SKIP.test(m.id)).sort(byNewest);
      return [...chat, ...other].map((m) => ({ id: m.id, label: OPENAI_SKIP.test(m.id) ? `${m.id} (não é de conversa)` : m.id }));
    }
    if (provider === 'gemini') {
      const ai = await geminiClient(cfg);
      const out = [];
      const pager = await ai.models.list({ config: { pageSize: 100 } });
      for await (const m of pager) out.push(m);
      return out
        .filter((m) => (m.supportedActions || []).includes('generateContent') && /gemini/i.test(m.name || '') && !/(image|tts|audio|embedding|live)/i.test(m.name || ''))
        .map((m) => { const id = String(m.name).replace(/^models\//, ''); return { id, label: m.displayName ? `${m.displayName} (${id})` : id }; })
        .reverse();
    }
  } catch (e) { throw await normalize(provider, e); }
  return [];
}

// ---------- Conversa em streaming ----------
// messages: [{ role: 'user' | 'assistant', content }]; onText recebe o texto completo até ao momento
export async function streamChat(provider, cfg, { system, messages, onText, signal }) {
  let raw = '';
  try {
    if (provider === 'anthropic') {
      const client = await anthropicClient(cfg);
      const params = { model: cfg.model, max_tokens: 64000, system, output_config: { effort: 'medium' }, messages };
      // Se o modelo recusar por política de segurança, a API tenta outro modelo na mesma chamada (o Haiku 5.5 não tem esta opção)
      if (cfg.model !== 'claude-haiku-5-5') Object.assign(params, { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' });
      const stream = client.beta.messages.stream(params, { signal });
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') { raw += event.delta.text; onText(raw); }
      }
      const final = await stream.finalMessage();
      if (final.stop_reason === 'refusal') return { text: raw, note: raw ? 'A resposta foi interrompida por razões de segurança.' : 'Não posso ajudar com esse pedido.' };
      if (final.stop_reason === 'max_tokens') return { text: raw, note: 'A resposta ficou cortada por ser demasiado longa.' };
      return { text: raw };
    }
    if (provider === 'openai' || provider === 'custom') {
      const client = await openaiClient(cfg, provider);
      const stream = await client.chat.completions.create({
        model: cfg.model,
        stream: true,
        messages: [{ role: 'system', content: system }, ...messages],
      }, { signal });
      let finish = null;
      for await (const chunk of stream) {
        const choice = chunk.choices && chunk.choices[0];
        const piece = choice?.delta?.content;
        if (piece) { raw += piece; onText(raw); }
        if (choice?.finish_reason) finish = choice.finish_reason;
      }
      if (finish === 'length') return { text: raw, note: 'A resposta ficou cortada por ser demasiado longa.' };
      if (finish === 'content_filter') return { text: raw, note: 'A resposta foi interrompida pelo filtro de conteúdo do serviço.' };
      return { text: raw };
    }
    if (provider === 'gemini') {
      const ai = await geminiClient(cfg);
      const contents = messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
      const config = { systemInstruction: system, abortSignal: signal };
      let lastErr;
      for (const model of geminiCandidates(cfg)) {
        for (let attempt = 0; attempt < 2; attempt++) {
          if (signal?.aborted) throw new AiError('abort', 'cancelado');
          try {
            if (attempt === 0) {
              // 1.ª tentativa: em streaming (o texto aparece aos poucos)
              const stream = await ai.models.generateContentStream({ model, contents, config });
              for await (const chunk of stream) {
                if (signal?.aborted) throw new AiError('abort', 'cancelado');
                const piece = chunk.text;
                if (piece) { raw += piece; onText(raw); }
              }
            } else {
              // 2.ª tentativa: pedido normal, sem streaming (às vezes passa quando o streaming falha)
              const r = await ai.models.generateContent({ model, contents, config });
              raw = r.text || ''; if (raw) onText(raw);
            }
            if (!raw) throw new AiError('other', 'o Gemini devolveu uma resposta vazia');
            return model === cfg.model ? { text: raw } : { text: raw, note: `O modelo ${cfg.model} estava indisponível; respondeu o ${model}.`, model };
          } catch (e) {
            if (e instanceof AiError && e.kind === 'abort') throw e;
            if (signal?.aborted || e?.name === 'AbortError') throw new AiError('abort', 'cancelado');
            if (raw) throw e; // já chegou parte da resposta: não repetir por cima
            lastErr = e;
            const st = geminiStatus(e);
            const tryOtherModel = st === 404 || st === 429 || (st === 400 && !/api key/i.test(e?.message || ''));
            if (tryOtherModel) break; // este modelo não serve ou esgotou a quota gratuita: passa ao seguinte
            if (!GEMINI_RETRY.has(st) && !(e instanceof AiError && e.kind === 'other')) throw e; // chave, limites, rede: não adianta repetir
            if (attempt === 0) await sleep(800 + Math.random() * 700, signal);
          }
        }
      }
      throw lastErr || new AiError('other', 'nenhum modelo do Gemini respondeu');
    }
  } catch (e) {
    const err = await normalize(provider, e);
    if (signal?.aborted) throw new AiError('abort', 'cancelado');
    err.partial = raw;
    throw err;
  }
  throw new AiError('other', 'fornecedor desconhecido');
}
