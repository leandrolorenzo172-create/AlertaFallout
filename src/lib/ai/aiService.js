// AIService: decide quem responde a cada pergunta, com recurso automático online -> offline.
//  - Dentro do claude.ai: a IA do próprio claude.ai (capacidade "sample" do artefacto).
//  - No site: o fornecedor escolhido nas Definições (Claude, ChatGPT, Gemini ou outro compatível com OpenAI),
//    com a chave do próprio utilizador (src/lib/ai/providers.js).
//  - Sem internet, sem chave ou se a IA online falhar: o motor local (src/lib/ai/localEngine.js).
import { getInstructions } from '@/lib/aiInstructions';
import { activeProvider } from './config';
import { streamChat, PROVIDERS } from './providers';
import { getNetwork, checkNow } from './net';
import { contextFor, answerLocally, summaryEntry } from './localEngine';
import { intentOf, styleSamples, isJoke, joke } from './steelPersonaOffline';
import FORMULA from '@/data/mrsteel/formula.md?raw';
import { getAiMode } from './aiTools';
import { isConversation, chatPrompt } from './chatMode';
import FORMULA_RESUMO from '@/data/mrsteel/formula-resumo.md?raw';
import { locale } from '../../i18n';

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

// Orçamento de contexto (poupança de tokens): no máximo 4 excertos de 950 caracteres, e só os realmente relevantes
const CTX_N = 6; const CTX_CHARS = 1200; const CTX_MIN = 1.25; // a fórmula obriga a consultar a base de conhecimento antes de escrever
// Conversa ou escrita sem relação com os ficheiros: não vale a pena enviar excertos
const CASUAL = /^(escreve|redige|reescreve|traduz|corrige|melhora|cria|inventa|faz(-me)? um (poema|texto|email|e-mail)|ajuda-me a escrever|conta(-me)? uma)/i;

// Contexto da app para a IA online. Devolve { system, ctx } para ask() reutilizar os excertos nas referências.
async function buildSystem(question) {
  // Conversa (desabafo, opinião, piada, "como estás?"): sem manuais, sem fórmula de resumo, sem perguntas de seguimento
  if (isConversation(question) && !CASUAL.test(question.trim())) {
    const ex = styleSamples(4);
    const system = `${getInstructions()}

${chatPrompt()}
${isJoke(question) ? `\nO utilizador pediu uma piada. Conta esta (ou uma parecida, leve e sem ofender ninguém), em 1–3 frases: ${joke()}\n` : ''}
# TOM (inspiração, não copies à letra)
- Conversa de café: ${ex.conversa.join(' | ')}

Data e hora do dispositivo: ${new Date().toLocaleString(locale())}. Responde em português de Portugal (ou na língua em que te escreverem), tratando por "tu". Não escrevas linha de perguntas de seguimento.`;
    return { system, ctx: [] };
  }
  const casual = intentOf(question) || CASUAL.test(question.trim());
  const ctx = casual ? [] : await contextFor(question, CTX_N, { chars: CTX_CHARS, minScore: CTX_MIN }).catch(() => []);
  const blocks = ctx.map((c) => `### [${c.ref}]\n${c.text}`).join('\n\n');
  const greet = intentOf(question) === 'greet';
  const ex = styleSamples(4);
  const sum = casual ? null : summaryEntry(question);
  const extra = [
    sum ? `# RESUMO DO TEMA (escrito a partir do Guia de Sobrevivência SteelDeck — capítulo «${sum.capitulo}»)\nSe a pergunta é sobre este tema, responde neste estilo: um resumo em prosa, com os números concretos, a dizer de que ficheiro e páginas vem (vê os excertos). Podes adaptar ao que foi perguntado.\n${sum.texto}` : '',
    isJoke(question) ? `# PIADA\nO utilizador pediu uma piada. Conta esta (ou uma parecida, leve e sem ofender ninguém), em 1–3 frases:\n${joke()}` : '',
  ].filter(Boolean).join('\n\n');
  const system = `${getInstructions()}

# FÓRMULA DE RESPOSTA (pasta src/data/mrsteel)
${FORMULA.replace(/^# .*\n+/, '').replace(/^Este ficheiro é lido[^\n]*\n+/m, '')}

${casual ? '' : `${FORMULA_RESUMO.replace(/^# /, '# OBRIGATÓRIO — ')}
Aplicação nesta app: a "base de conhecimento" são os excertos da secção CONTEXTO DA APLICAÇÃO abaixo (documentos do dispositivo na aba Conhecimento, Guia, manual e dados dos separadores). Sempre que a pergunta pedir informação, segue esta fórmula à risca: resumo de 10–15 linhas em prosa, nesta ordem (porquê/contexto → critérios e escolha do local/riscos com números → opções práticas → avisos de segurança e materiais de apoio), a começar por "Com base no ficheiro «…», página(s) …". Se os excertos não tiverem a informação, diz isso primeiro ("Isto não está nos teus ficheiros, mas…") e só depois complementa com conhecimento geral.
`}
# EXEMPLOS DE ESTILO (inspiração, não copies à letra)
- Aberturas: ${ex.aberturas.join(' | ')}
- Perguntas no fim: ${ex.perguntas.join(' | ')}
- Iniciar conversa: ${ex.iniciar.join(' | ')}
- Conversa de café: ${ex.conversa.join(' | ')}
${extra ? `\n${extra}\n` : ''}
# CONTEXTO DA APLICAÇÃO
Data e hora do dispositivo: ${new Date().toLocaleString(locale())}.
Abaixo estão os excertos mais relevantes dos dados desta aplicação para a pergunta (documentos da aba Conhecimento, manual incluído e dados guardados dos separadores). Quando usares um excerto, cita a referência entre parênteses retos, por exemplo [Manual — Abrigos]. Distingue o que vem destes excertos do teu conhecimento geral.

${blocks || '(Sem excertos locais necessários.)'}

# FORMATO
Responde em português de Portugal, em Markdown. Prosa fluida em conversa e escrita; listas, passos ou tabelas só quando a tarefa pedir estrutura. Sê direto.
${greet ? 'Esta mensagem é só um cumprimento: responde em uma ou duas frases (saudação + "Em que te posso ser útil?") e não escrevas a linha de seguimento.' : `No fim da resposta, numa linha à parte, escreve exatamente ${FOLLOW} seguido de 3 perguntas curtas de seguimento que o utilizador possa querer fazer a seguir, separadas por " | ". Não escrevas mais nada depois dessa linha.`}`;
  return { system, ctx };
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

// Histórico comprimido: últimas 10 mensagens; respostas antigas do assistente cortadas a 800 caracteres
const toTurns = (history) => {
  const turns = history.filter((m) => (m.role === 'user' || m.role === 'assistant') && m.text && !m.error).slice(-10);
  return turns.map((m, i) => ({
    role: m.role,
    content: m.role === 'assistant' && i < turns.length - 2 && m.text.length > 800 ? `${m.text.slice(0, 800)}…` : m.text,
  }));
};

// --- IA online: fornecedor escolhido nas Definições ---
async function askProvider({ question, history, onText, signal, system }) {
  const a = activeProvider();
  const r = await streamChat(a.id, a.cfg, {
    system,
    messages: [...toTurns(history), { role: 'user', content: question }],
    onText: (raw) => onText(splitFollowups(raw).text),
    signal,
  });
  const out = splitFollowups(r.text || '');
  if (r.note) out.text = out.text ? `${out.text}\n\n_${r.note}_` : r.note;
  return out;
}

// --- IA online: dentro do claude.ai ---
async function askClaudeAi({ question, history, onText, signal, system }) {
  const sample = await getSample();
  if (!sample) throw new Error('A IA do claude.ai não está disponível.');
  const turns = [{ role: 'user', content: system }, { role: 'assistant', content: 'Entendido.' }, ...toTurns(history), { role: 'user', content: question }];
  const { text } = await sample(turns, { cache: false, signal, onText: ({ text: t }) => onText(splitFollowups(t).text) });
  return splitFollowups(text);
}

function describeError(e) {
  const map = {
    auth: 'a chave da API foi recusada — confirma-a nas Definições',
    permission: e.message,
    rate: e.message,
    busy: e.message,
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
  // modo "Base local" (menu ≡ > MODO IA): responde sempre com os ficheiros do dispositivo
  const provider = getAiMode() === 'local' ? null : onlineProvider();
  const net = getNetwork();
  if (net === 'online' && provider) {
    try {
      const fn = provider === 'claude.ai' ? askClaudeAi : askProvider;
      const { system, ctx } = await buildSystem(question);
      const r = await fn({ question, history, onText, signal, system });
      const refs = ctx // os mesmos excertos que foram enviados: sem segunda pesquisa
        .filter((c) => r.text.includes(c.ref) || r.text.includes(c.title))
        .map((c) => ({ label: c.ref, source: c.source, docId: c.docId, page: c.page, route: c.route }));
      return { ...r, refs, source: 'online', provider: providerName(provider) };
    } catch (e) {
      if (signal?.aborted || e?.kind === 'abort' || e?.name === 'AbortError' || e?.code === 'cancelled') throw e;
      const { msg, network } = describeError(e);
      if (network) checkNow(); // talvez a rede tenha caído: atualiza o indicador
      const local = await answerLocally(question, { reason: 'error', history });
      return { ...local, source: 'local', notice: `Sem resposta da IA online (${msg}). Respondi com a base local.` };
    }
  }
  const local = await answerLocally(question, { reason: net !== 'online' ? 'offline' : 'nokey', history });
  if (getAiMode() === 'local') return { ...local, source: 'local' };
  return { ...local, source: net === 'online' ? 'local' : 'offline' };
}
