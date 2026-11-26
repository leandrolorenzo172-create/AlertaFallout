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
import FORMULA_RESUMO from '@/data/mrsteel/formula-resumo.md?raw';
import { locale, isEn, t } from '../../i18n';
import { truncateAtBoundary, finalizeAnswer } from './textQuality';
import { getAiMode } from './mode';

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

// Orçamento de contexto (poupança de tokens): no máximo 6 excertos de ~1200 caracteres (cortados no fim de uma frase,
// nunca a meio de uma palavra — excertos com palavras cortadas faziam a IA copiar palavras partidas), só os relevantes
const CTX_N = 6; const CTX_CHARS = 1200; const CTX_MIN = 1.25; // a fórmula obriga a consultar a base de conhecimento antes de escrever
// Conversa ou escrita sem relação com os ficheiros: não vale a pena enviar excertos
const CASUAL = /^(escreve|redige|reescreve|traduz|corrige|melhora|cria|inventa|faz(-me)? um (poema|texto|email|e-mail)|ajuda-me a escrever|conta(-me)? uma|write|rewrite|translate|fix|improve|create|make (me )?a (poem|text|story|email))/i;

// Regras de idioma e de qualidade linguística: vão SEMPRE no fim do prompt (prevalecem sobre exemplos e guiões).
// Antes, o prompt dizia sempre "Responde em português de Portugal", mesmo com a app em inglês.
const LANG_RULES_PT = `# IDIOMA E QUALIDADE LINGUÍSTICA (OBRIGATÓRIO — PREVALECE SOBRE TUDO O RESTO, EXCETO AS REGRAS DE SEGURANÇA)
- Escreve sempre em português europeu (pt-PT), com a ortografia do Acordo Ortográfico de 1990 tal como se aplica em Portugal: "facto", "contacto", "receção", "detetar", "ótimo", "económico", "género", "quilómetro", "telemóvel", "ecrã", "ficheiro", "utilizador", "equipa", "registo", "casa de banho", "autocarro", "comboio", "frigorífico". Nunca uses formas do Brasil ("você", "celular", "tela", "arquivo" para ficheiro, "usuário", "equipe", "registro", "ônibus", "trem", acentos "ô/ê" em "econômico", "gênero"...).
- Trata o utilizador por "tu" e usa "estar a + infinitivo" ("estou a verificar"), nunca o gerúndio brasileiro ("estou verificando").
- Colocação dos pronomes à portuguesa: ênclise por omissão ("diz-me", "ajuda-te", "faz-se"); próclise só quando a gramática obriga ("não te preocupes", "que se faz", "já te digo").
- Ortografia, acentuação, pontuação e concordância (género, número, tempos verbais) sempre corretas.
- Frases completas e gramaticalmente íntegras: nunca omitas artigos, preposições, conjunções, verbos auxiliares, sujeitos necessários, substantivos ou adjetivos; não escrevas em estilo telegráfico nem cortes palavras a meio. Se os excertos tiverem palavras partidas ou erros de OCR, escreve-as corretamente.
- Termina sempre a última frase. Se a resposta tiver de ser longa, resume em vez de a deixares a meio.
- Evita anglicismos quando houver termo português corrente ("ficheiro" e não "file", "ligação" e não "link", "transferir" e não "fazer download").`;
const LANG_RULES_EN = `# LANGUAGE AND WRITING QUALITY (MANDATORY — OVERRIDES EVERYTHING ABOVE EXCEPT THE SAFETY RULES)
- The app is set to English (US). Write the WHOLE answer in natural, correct US English, even though the instructions, style examples and document excerpts above are in Portuguese. Ignore any instruction above to speak Portuguese; keep the Mr. Steel persona, tone and response formula.
- Translate everything you take from the excerpts. Keep only proper names, file names and document titles in the original (in «guillemets» or quotes). Instead of "Com base no ficheiro «…», página(s) …", write "Based on the file «…», page(s) …".
- Correct spelling (US), grammar, punctuation and agreement at all times.
- Complete, grammatically whole sentences: never drop articles, prepositions, conjunctions, auxiliary verbs, required subjects, nouns or adjectives; no telegraphic style; never cut words. If an excerpt has broken words or OCR errors, write them correctly.
- Always finish the last sentence. If the answer would be long, summarise instead of stopping halfway.`;
const langRules = () => (isEn() ? LANG_RULES_EN : LANG_RULES_PT);
const TACTICAL_PT = `# MODO TÁTICO (escolhido pelo utilizador)
Responde de forma curta e direta: no máximo 6 frases completas ou 6 passos numerados quando for um procedimento. Sem introduções, sem piadas e sem a fórmula de 10–15 linhas. As frases continuam completas e corretas.`;
const TACTICAL_EN = `# TACTICAL MODE (chosen by the user)
Answer briefly and directly: at most 6 complete sentences, or 6 numbered steps for a procedure. No introductions, no jokes and no 10–15 line formula. Sentences must still be complete and correct.`;

// Contexto da app para a IA online. Devolve { system, ctx } para ask() reutilizar os excertos nas referências.
export async function buildSystem(question) { // exportada para os testes (scripts/test-ai-text.mjs)
  const casual = intentOf(question) || CASUAL.test(question.trim());
  const ctx = casual ? [] : await contextFor(question, CTX_N, { chars: CTX_CHARS, minScore: CTX_MIN }).catch(() => []);
  const blocks = ctx.map((c) => `### [${c.ref}]\n${truncateAtBoundary(c.text, CTX_CHARS)}`).join('\n\n');
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
Responde em Markdown${isEn() ? ' e em inglês (EUA)' : ' e em português de Portugal'}. Prosa fluida em conversa e escrita; listas, passos ou tabelas só quando a tarefa pedir estrutura. Sê direto.
${greet ? `Esta mensagem é só um cumprimento: responde em uma ou duas frases completas (saudação + ${isEn() ? '"How can I help you?"' : '"Em que te posso ser útil?"'}) e não escrevas a linha de seguimento.` : `No fim da resposta, numa linha à parte, escreve exatamente ${FOLLOW} seguido de 3 perguntas curtas de seguimento (frases completas${isEn() ? ', em inglês' : ''}) que o utilizador possa querer fazer a seguir, separadas por " | ". Não escrevas mais nada depois dessa linha.`}
${getAiMode() === 'tatico' ? `\n${isEn() ? TACTICAL_EN : TACTICAL_PT}\n` : ''}
${langRules()}`;
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

// Histórico comprimido: últimas 10 mensagens; respostas antigas do assistente encurtadas a ~800 caracteres,
// no fim de uma frase (antes cortava a meio da palavra, e a IA imitava essas palavras partidas)
const toTurns = (history) => {
  const turns = history.filter((m) => (m.role === 'user' || m.role === 'assistant') && m.text && !m.error).slice(-10);
  return turns.map((m, i) => ({
    role: m.role,
    content: m.role === 'assistant' && i < turns.length - 2 ? truncateAtBoundary(m.text, 800) : m.text,
  }));
};
const lang = () => (isEn() ? 'en' : 'pt');
const polish = (text) => finalizeAnswer(text, { lang: lang() });
// Pedido de continuação quando a resposta chega cortada pelo limite de tokens (1 tentativa)
const CONTINUE = () => (isEn()
  ? 'Your previous answer was cut off. Continue exactly from the last word, without repeating anything, and finish the answer (including the follow-up line, if it is missing).'
  : 'A tua resposta anterior ficou cortada. Continua exatamente a partir da última palavra, sem repetir nada, e termina a resposta (incluindo a linha de seguimento, se faltar).');
// Junta a continuação à 1.ª parte sem duplicar a última palavra nem partir/colar palavras
export const joinParts = (a, b) => {
  if (!b) return a;
  // a continuação às vezes repete o fim da 1.ª parte: remove a sobreposição (até 60 caracteres)
  for (let k = Math.min(60, a.length, b.length); k >= 3; k--) {
    if (a.endsWith(b.slice(0, k))) { b = b.slice(k); break; } // eslint-disable-line no-param-reassign
  }
  if (!b) return a;
  // a 1.ª parte acabou a meio de uma palavra ("meia en") e a continuação repete-a inteira ("encosta…")
  const tailA = a.match(/(\p{L}{2,})$/u); const headB = b.match(/^(\p{L}+)/u);
  if (tailA && headB && headB[1].length > tailA[1].length && headB[1].toLowerCase().startsWith(tailA[1].toLowerCase())) return `${a.slice(0, -tailA[1].length)}${b}`;
  if (/\s$/.test(a) || /^\s/.test(b) || /^[,.;:!?)»]/.test(b)) return `${a}${b}`;
  if (/[\p{L}\d]$/u.test(a) && /^\p{Ll}/u.test(b)) return `${a}${b}`; // a meio de uma palavra
  return `${a} ${b}`;
};

// --- IA online: fornecedor escolhido nas Definições ---
async function askProvider({ question, history, onText, signal, system }) {
  const a = activeProvider();
  const messages = [...toTurns(history), { role: 'user', content: question }];
  let r = await streamChat(a.id, a.cfg, { system, messages, onText: (raw) => onText(polish(splitFollowups(raw).text)), signal });
  // Cortada pelo limite de tokens: pede a continuação uma vez, em vez de mostrar uma frase a meio
  if (r.truncated && r.text) {
    const first = r.text;
    try {
      const r2 = await streamChat(a.id, a.cfg, {
        system,
        messages: [...messages, { role: 'assistant', content: first }, { role: 'user', content: CONTINUE() }],
        onText: (raw) => onText(polish(splitFollowups(joinParts(first, raw)).text)),
        signal,
      });
      r = { ...r2, text: joinParts(first, r2.text || '') };
    } catch (e) {
      if (signal?.aborted) throw e;
      r = { ...r, text: first }; // fica a primeira parte, com o aviso de corte
    }
  }
  const out = splitFollowups(r.text || '');
  out.text = polish(out.text);
  if (r.note) out.text = out.text ? `${out.text}\n\n_${r.note}_` : r.note;
  return out;
}

// --- IA online: dentro do claude.ai ---
async function askClaudeAi({ question, history, onText, signal, system }) {
  const sample = await getSample();
  if (!sample) throw new Error('A IA do claude.ai não está disponível.');
  const turns = [{ role: 'user', content: system }, { role: 'assistant', content: 'Entendido.' }, ...toTurns(history), { role: 'user', content: question }];
  const { text } = await sample(turns, { cache: false, signal, onText: ({ text: tx }) => onText(polish(splitFollowups(tx).text)) });
  const out = splitFollowups(text);
  out.text = polish(out.text);
  return out;
}

function describeError(e) {
  const map = {
    auth: t('a chave da API foi recusada — confirma-a nas Definições'),
    permission: e && e.message && t(e.message),
    rate: e && e.message && t(e.message),
    busy: e && e.message && t(e.message),
    network: (e && e.message && t(e.message)) || t('sem ligação ao serviço de IA'),
  };
  if (e && e.code === 'not_granted') return { msg: t('o acesso à IA do claude.ai não foi autorizado') };
  return { msg: map[e && e.kind] || (e && e.message && t(e.message)) || t('a IA online não respondeu'), network: !e || e.kind === 'network' || !e.kind };
}

/**
 * Responde a uma pergunta.
 * @returns {Promise<{text, followups, refs, source: 'online'|'offline'|'local', notice?}>}
 */
export async function ask({ question, history = [], onText = () => {}, signal }) {
  const provider = onlineProvider();
  const net = getNetwork();
  const forceLocal = getAiMode() === 'local'; // ferramenta "Modo IA" no menu ≡
  if (net === 'online' && provider && !forceLocal) {
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
      return { ...local, text: polish(local.text), source: 'local', notice: t('Sem resposta da IA online ({m}). Respondi com a base local.', { m: msg }) };
    }
  }
  const local = await answerLocally(question, { reason: net !== 'online' ? 'offline' : (forceLocal ? 'mode' : 'nokey'), history });
  return { ...local, text: polish(local.text), source: net === 'online' ? 'local' : 'offline' };
}
