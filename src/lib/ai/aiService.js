// AIService: decide quem responde a cada pergunta, com recurso automático online -> offline.
//  - Dentro do claude.ai: a IA do próprio claude.ai (capacidade "sample" do artefacto).
//  - No site: a API da Anthropic com a chave que o utilizador guardou nas Definições (SDK oficial, no browser).
//  - Sem internet, sem chave ou se a IA online falhar: o motor local (src/lib/ai/localEngine.js).
import Anthropic from '@anthropic-ai/sdk';
import { getInstructions } from '@/lib/aiInstructions';
import { getAiConfig } from './config';
import { getNetwork, checkNow } from './net';
import { contextFor, answerLocally } from './localEngine';

export const IS_ARTIFACT = typeof window !== 'undefined' && !!window.claude?.use;
const FOLLOW = '<<SEGUIMENTO>>';

let samplePromise;
const getSample = () => {
  if (!samplePromise) samplePromise = IS_ARTIFACT ? window.claude.use('sample').catch(() => null) : Promise.resolve(null);
  return samplePromise;
};

// Modo atual, para o indicador no topo da aba
export function onlineProvider() {
  if (IS_ARTIFACT) return 'claude.ai';
  return getAiConfig().apiKey ? 'anthropic' : null;
}

// Contexto da app para a IA online: passagens relevantes da base de conhecimento, do manual e dos dados guardados
async function buildSystem(question) {
  const ctx = await contextFor(question, 6).catch(() => []);
  const blocks = ctx.map((c) => `### [${c.ref}]\n${c.text}`).join('\n\n');
  return `${getInstructions()}

# CONTEXTO DA APLICAÇÃO
Data e hora do dispositivo: ${new Date().toLocaleString('pt-PT')}.
Abaixo estão os excertos mais relevantes dos dados desta aplicação para a pergunta (documentos da aba Conhecimento, manual incluído e dados guardados dos separadores). Quando usares um excerto, cita a referência entre parênteses retos, por exemplo [Manual — Abrigos]. Distingue o que vem destes excertos do teu conhecimento geral.

${blocks || '(Não há excertos relevantes guardados na app para esta pergunta.)'}

# FORMATO
Responde em português de Portugal, em Markdown (títulos curtos, listas, tabelas e blocos de código quando ajudarem). Sê direto.
No fim da resposta, numa linha à parte, escreve exatamente ${FOLLOW} seguido de 3 perguntas curtas de seguimento que o utilizador possa querer fazer a seguir, separadas por " | ". Não escrevas mais nada depois dessa linha.`;
}

// Separa o texto das perguntas de seguimento; durante o streaming esconde a linha de seguimento incompleta
export function splitFollowups(raw) {
  const i = raw.indexOf(FOLLOW);
  if (i < 0) {
    // não mostrar o início do marcador enquanto ainda está a chegar
    for (let k = Math.min(FOLLOW.length - 1, raw.length); k > 0; k--) if (FOLLOW.startsWith(raw.slice(-k))) return { text: raw.slice(0, -k).trimEnd(), followups: [] };
    return { text: raw, followups: [] };
  }
  const followups = raw.slice(i + FOLLOW.length).split('|').map((s) => s.replace(/^[\s\-–•*\d.)]+/, '').trim()).filter(Boolean).slice(0, 3);
  return { text: raw.slice(0, i).trimEnd(), followups };
}

const toTurns = (history) => history
  .filter((m) => (m.role === 'user' || m.role === 'assistant') && m.text && !m.error)
  .slice(-20)
  .map((m) => ({ role: m.role, content: m.text }));

// --- IA online: API da Anthropic (SDK oficial) ---
async function askAnthropic({ question, history, onText, signal }) {
  const { apiKey, model } = getAiConfig();
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true }); // a chave é do próprio utilizador e fica no browser dele
  const params = {
    model,
    max_tokens: 64000,
    system: await buildSystem(question),
    output_config: { effort: 'medium' },
    messages: [...toTurns(history), { role: 'user', content: question }],
  };
  // Se o modelo recusar por política de segurança, a API tenta outro modelo na mesma chamada (o Haiku 5.5 não tem esta opção)
  if (model !== 'claude-haiku-5-5') Object.assign(params, { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' });
  const stream = client.beta.messages.stream(params, { signal });
  let raw = '';
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      raw += event.delta.text;
      onText(splitFollowups(raw).text);
    }
  }
  const final = await stream.finalMessage();
  if (final.stop_reason === 'refusal') {
    return { text: raw ? `${splitFollowups(raw).text}\n\n_A resposta foi interrompida por razões de segurança._` : 'Não posso ajudar com esse pedido.', followups: [] };
  }
  if (final.stop_reason === 'max_tokens') raw += '\n\n_A resposta ficou cortada por ser demasiado longa._';
  return splitFollowups(raw);
}

// --- IA online: dentro do claude.ai ---
async function askClaudeAi({ question, history, onText, signal }) {
  const sample = await getSample();
  if (!sample) throw new Error('A IA do claude.ai não está disponível.');
  const turns = [{ role: 'user', content: await buildSystem(question) }, { role: 'assistant', content: 'Entendido.' }, ...toTurns(history), { role: 'user', content: question }];
  const { text } = await sample(turns, { cache: false, signal, onText: ({ text: t }) => onText(splitFollowups(t).text) });
  return splitFollowups(text);
}

function describeError(e) {
  if (e instanceof Anthropic.AuthenticationError) return { msg: 'a chave da API foi recusada — confirma-a nas Definições', fatal: false };
  if (e instanceof Anthropic.PermissionDeniedError) return { msg: 'a chave não tem permissão para este modelo', fatal: false };
  if (e instanceof Anthropic.RateLimitError) return { msg: 'limite de pedidos atingido — tenta daqui a pouco', fatal: false };
  if (e instanceof Anthropic.APIConnectionError) return { msg: 'sem ligação ao serviço de IA', fatal: false, network: true };
  if (e instanceof Anthropic.APIError) return { msg: `erro ${e.status || ''} do serviço de IA`.trim(), fatal: false };
  if (e && e.code === 'not_granted') return { msg: 'o acesso à IA do claude.ai não foi autorizado', fatal: false };
  return { msg: 'a IA online não respondeu', fatal: false, network: true };
}

/**
 * Responde a uma pergunta.
 * @returns {Promise<{text, followups, refs, source: 'online'|'offline'|'local', notice?}>}
 */
export async function ask({ question, history = [], onText = () => {}, signal }) {
  const provider = onlineProvider();
  const net = getNetwork();
  if (net === 'online' && provider) {
    try {
      const fn = provider === 'anthropic' ? askAnthropic : askClaudeAi;
      const r = await fn({ question, history, onText, signal });
      const refs = (await contextFor(question, 6).catch(() => []))
        .filter((c) => r.text.includes(c.ref) || r.text.includes(c.title))
        .map((c) => ({ label: c.ref, source: c.source, docId: c.docId, page: c.page, route: c.route }));
      return { ...r, refs, source: 'online' };
    } catch (e) {
      if (signal?.aborted || e instanceof Anthropic.APIUserAbortError || e?.name === 'AbortError' || e?.code === 'cancelled') throw e;
      const { msg, network } = describeError(e);
      if (network) checkNow(); // talvez a rede tenha caído: atualiza o indicador
      const local = await answerLocally(question, { reason: 'error' });
      return { ...local, source: 'local', notice: `Sem resposta da IA online (${msg}). Respondi com a base local.` };
    }
  }
  const local = await answerLocally(question, { reason: net !== 'online' ? 'offline' : 'nokey' });
  return { ...local, source: net === 'online' ? 'local' : 'offline' };
}
