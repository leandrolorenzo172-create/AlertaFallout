// AIService: decide quem responde a cada pergunta, com recurso automático online -> offline.
//  - Dentro do claude.ai: a IA do próprio claude.ai (capacidade "sample" do artefacto).
//  - No site: o fornecedor escolhido nas Definições (Claude, ChatGPT, Gemini ou outro compatível com OpenAI),
//    com a chave do próprio utilizador (src/lib/ai/providers.js).
//  - Sem internet, sem chave ou se a IA online falhar: o motor local (src/lib/ai/localEngine.js).
import { getInstructions } from '@/lib/aiInstructions';
import { activeProvider } from './config';
import { streamChat, PROVIDERS } from './providers';
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
  const a = activeProvider();
  return a ? a.id : null;
}
export function providerName(id) {
  if (id === 'claude.ai') return 'Claude (claude.ai)';
  return PROVIDERS[id] ? PROVIDERS[id].short : '';
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

// --- IA online: fornecedor escolhido nas Definições ---
async function askProvider({ question, history, onText, signal }) {
  const a = activeProvider();
  const r = await streamChat(a.id, a.cfg, {
    system: await buildSystem(question),
    messages: [...toTurns(history), { role: 'user', content: question }],
    onText: (raw) => onText(splitFollowups(raw).text),
    signal,
  });
  const out = splitFollowups(r.text || '');
  if (r.note) out.text = out.text ? `${out.text}\n\n_${r.note}_` : r.note;
  return out;
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
  const map = {
    auth: 'a chave da API foi recusada — confirma-a nas Definições',
    permission: e.message,
    rate: e.message,
    network: e.message || 'sem ligação ao serviço de IA',
  };
  if (e && e.code === 'not_granted') return { msg: 'o acesso à IA do claude.ai não foi autorizado' };
  return { msg: map[e && e.kind] || (e && e.message) || 'a IA online não respondeu', network: !e || e.kind === 'network' || !e.kind };
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
      const fn = provider === 'claude.ai' ? askClaudeAi : askProvider;
      const r = await fn({ question, history, onText, signal });
      const refs = (await contextFor(question, 6).catch(() => []))
        .filter((c) => r.text.includes(c.ref) || r.text.includes(c.title))
        .map((c) => ({ label: c.ref, source: c.source, docId: c.docId, page: c.page, route: c.route }));
      return { ...r, refs, source: 'online', provider: providerName(provider) };
    } catch (e) {
      if (signal?.aborted || e?.kind === 'abort' || e?.name === 'AbortError' || e?.code === 'cancelled') throw e;
      const { msg, network } = describeError(e);
      if (network) checkNow(); // talvez a rede tenha caído: atualiza o indicador
      const local = await answerLocally(question, { reason: 'error' });
      return { ...local, source: 'local', notice: `Sem resposta da IA online (${msg}). Respondi com a base local.` };
    }
  }
  const local = await answerLocally(question, { reason: net !== 'online' ? 'offline' : 'nokey' });
  return { ...local, source: net === 'online' ? 'local' : 'offline' };
}
