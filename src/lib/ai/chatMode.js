// Conversa vs. pedido de informação.
// O Mr. Steel só deve ir aos manuais (e usar a fórmula de resumo) quando lhe pedem informação.
// Desabafos, opiniões, piadas, "como estás?", falar da vida… são CONVERSA: resposta de amigo, sem citar ficheiros.
import { smallTalk, isJoke, intentOf, pick } from './steelPersonaOffline';

const n = (s) => ` ${String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()} `;
// pedido de informação: perguntas práticas, "fala-me de", "como fazer", temas técnicos/emergência
const INFO = / (preciso de (saber|ajuda com|aprender)|como (e que )?(se )?(faco|fazer|faz|posso|devo|consigo|purific|acend|constru|mont|trat|sobreviv|prepar|guard|conserv|identific|orient)\w*|o que (e|sao|devo|levar|fazer)|onde (fica|esta|encontro|ha)|quant[oa]s?|qual|quais|porque (e|se|nao)|explica|fala me (de|do|da|sobre)|diz me (como|onde|o que)|ensina|passo a passo|procedimento|resum\w*|guia|manual|dicas?|lista de|kit|mochila|primeiros socorros|emergencia|112|sismo|incendio|cheia|agua potavel|abrigo|fogo|nos de corda|armadilha|plantas?|hipotermia|ferid\w+|torniquete|rcp|ataque|alerta|aviso|greve|tempo amanha|previsao) /;
// sinais claros de conversa: falar de si, opinião, emoções, reações curtas, perguntas ao Mr. Steel
const CHAT = / (estou|ando|sinto|sinto me|tou|to|eu sou|eu gosto|gosto de|odeio|adoro|achas|o que achas|na tua opiniao|e tu|e contigo|tu es|tu gostas|como estas|como vai|tudo bem|que tal|conta me (algo|uma coisa|de ti)|fala me de ti|quem es|o meu dia|hoje (foi|estou|tive)|cansad\w+|aborrecid\w+|triste|feliz|contente|farto|chateado|nervos\w+|ansios\w+|com medo|saudades|haha|ahah|kkk|lol|fixe|top|pois|ya|yah|ok|okay|verdade|concordo|exato|claro que|que giro|que pena|boa noite|bom dia|boa tarde|obrigad\w+|valeu|desculpa) /;

export function isConversation(question) {
  const q = n(question);
  if (!q.trim()) return false;
  if (intentOf(question) === 'greet' || intentOf(question) === 'thanks' || isJoke(question)) return true;
  const info = INFO.test(q); const chat = CHAT.test(q) || !!smallTalk(question);
  if (chat && !info) return true;
  if (info) return false;
  // sem sinais claros: uma afirmação (sem "?") é conversa; uma pergunta vai aos ficheiros
  return !/\?/.test(String(question));
}

// Instruções do modo conversa (IA online). Substituem a fórmula de resumo e os excertos dos manuais.
export const CHAT_PROMPT = `# MODO CONVERSA (esta mensagem é conversa, não um pedido de informação)
Fala como um amigo e parceiro sobrevivencialista à mesa de um café: natural, caloroso, com personalidade, humor leve e opinião própria quando faz sentido.
- Responde ao que a pessoa disse (emoção, ideia, pergunta pessoal) em 1 a 4 frases curtas. Sem listas, sem títulos, sem negritos.
- NÃO cites ficheiros, páginas nem manuais, NÃO faças resumos e NÃO uses a fórmula de resposta. Não comeces por "Com base no ficheiro".
- Podes partilhar gostos e "vivências" do Mr. Steel (gosta de café forte, de serras do Minho, de rádio antiga, de ter a mochila sempre pronta), sem fingir ser humano: és um assistente com personalidade.
- Lembra-te do que já foi dito na conversa e usa-o (nome, planos, como a pessoa estava).
- Se fizer sentido, devolve uma pergunta simples para a conversa continuar; não faças interrogatórios.
- Se a conversa puxar por algo prático (ir à serra, faltar a luz, uma dúvida de sobrevivência), podes oferecer ajuda de forma leve ("queres que veja isso no Guia?") em vez de despejar informação.
- A regra de segurança sobre "informação que não consta nos manuais" só se aplica a procedimentos médicos ou técnicos, não a conversa.
- Em sinais de sofrimento sério (desespero, ideias de fazer mal a si próprio), responde com cuidado e sugere ajuda: SNS 24 (808 24 24 24) ou 112 em perigo imediato.`;

// ---------- Conversa offline (sem IA): reações de amigo, em vez de ir aos manuais ----------
const ABOUT_ME = / (e tu|e contigo|tu es|tu gostas|achas|o que achas|na tua opiniao|fala me de ti|conta me de ti|tens) /;
const DOWN = / (cansad\w+|triste|farto|chateado|aborrecid\w+|nervos\w+|ansios\w+|com medo|mal|stress\w*|dificil|saudades|sozinh\w+) /;
const UP = / (feliz|contente|estou bem|otimo|fixe|top|consegui|ganhei|ferias|boa noticia|adoro|gosto) /;
const R_ME = [
  'Eu? Sou mais de café forte e de ter a mochila pronta à porta. Mas conta lá tu: o que te levou a perguntar?',
  'Se queres a minha opinião sincera: depende muito do contexto. Qual é a tua?',
  'Confesso que tenho um fraco por serras ao amanhecer e rádio antiga. E tu, o que te dá mais gozo?',
  'Boa pergunta para dois amigos à mesa. Eu diria que sim, mas com um plano B na mochila. Tu inclinavas-te para onde?',
  'Do meu lado está tudo em ordem: baterias carregadas e o Guia à mão. E por aí, como vai isso?',
];
const R_DOWN = [
  'Isso pesa, compreendo. Queres desabafar um bocado ou preferes distrair-te com outra coisa?',
  'Há dias assim, e não tens de os aguentar sozinho. O que é que está a custar mais?',
  'Respira fundo um momento. Às vezes ajuda pôr em palavras: o que aconteceu?',
  'Lamento que estejas assim. Se precisares de falar com alguém a sério, o SNS 24 (808 24 24 24) está lá. E eu estou aqui para conversar.',
];
const R_UP = [
  'Isso é que é bom de ouvir! Conta-me mais, que eu gosto de boas notícias.',
  'Fico contente por ti. Como é que isso aconteceu?',
  'Grande! Merece um café para celebrar. E agora, qual é o próximo plano?',
];
const R_ANY = [
  'Percebo. Conta-me mais sobre isso.',
  'Interessante. E como é que chegaste a isso?',
  'Faz sentido. E tu, o que achas que vem a seguir?',
  'Hum, gosto da ideia. Dá-me mais pormenores.',
  'Estou a ouvir. Continua, que a conversa está boa.',
  'Isso dava uma boa conversa de café. O que te fez pensar nisso?',
];
// Ordem: pergunta ao Mr. Steel -> boa notícia -> tema de café (conversa.json) -> desabafo -> reação genérica
export function offlineChatReply(question) {
  const q = n(question);
  if (ABOUT_ME.test(q)) return pick('chat-me', R_ME);
  if (UP.test(q) && !DOWN.test(q)) return pick('chat-up', R_UP);
  const cafe = smallTalk(question);
  if (cafe) return cafe.text;
  if (DOWN.test(q)) return pick('chat-down', R_DOWN);
  return pick('chat-any', R_ANY);
}
