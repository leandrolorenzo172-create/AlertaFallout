// Persona do Mr. Steel para o modo offline (e sem chave de IA), em português de Portugal, tratando por "tu".
// Tom: humano, próximo, calmo e articulado (inspirado no J.A.R.V.I.S., com um toque subtil de ironia).
// Regras: nunca despejar texto cru de PDF; reformular em frases próprias; ser transparente sobre o que não está
// nos ficheiros; acabar com uma pergunta útil; pedir para reformular quando o pedido não é claro.
// pick() nunca repete a última frase usada de cada lista.

// Fórmula e frases editáveis em src/data/mrsteel/ (ver README.md dessa pasta)
import RESPOSTAS from '@/data/mrsteel/respostas.json';
import PERGUNTAS from '@/data/mrsteel/perguntas.json';
import INICIAR from '@/data/mrsteel/iniciar.json';
import CONVERSA from '@/data/mrsteel/conversa.json';
import PIADAS from '@/data/mrsteel/piadas.json';
import EN from '@/data/mrsteel/en.json';
import { isEn } from '../../i18n';
const list = (f, fallback) => (Array.isArray(f?.frases) && f.frases.length ? f.frases : fallback);
// Frases em inglês (app em English): mesmas funções, outra lista. As frases em português ficam nos .json da pasta.
const en = (key, fallback) => (Array.isArray(EN?.[key]) && EN[key].length ? EN[key] : fallback);

const LAST = new Map();
export function pick(key, list) {
  if (!list || !list.length) return '';
  if (list.length === 1) return list[0];
  const prev = LAST.get(key);
  let i = Math.floor(Math.random() * list.length);
  if (i === prev) i = (i + 1 + Math.floor(Math.random() * (list.length - 1))) % list.length;
  LAST.set(key, i);
  return list[i];
}

// ---------- Saudações: calorosas, conforme a hora (Fórmula C) ----------
export const GREETINGS = {
  manha: [
    'Bom dia! Tudo bem por aí?',
    'Bom dia! Espero que a manhã esteja a começar bem.',
    'Olá, bom dia! Já com o café na mão, presumo?',
    'Muito bom dia! Que bom ver-te por cá.',
  ],
  tarde: [
    'Boa tarde! Como está a correr o dia?',
    'Olá, boa tarde! Tudo bem contigo?',
    'Boa tarde! Espero que o dia esteja a ser tranquilo.',
    'Boa tarde! Que bom ter-te de volta.',
  ],
  noite: [
    'Boa noite! Como correu o dia?',
    'Olá, boa noite! Tudo bem por aí?',
    'Boa noite! Ainda a tempo de resolver alguma coisa antes de descansar?',
    'Boa noite! Os meus circuitos não precisam de descanso, por isso estou todo teu.',
  ],
  madrugada: [
    'Olá! Ainda acordado a esta hora? Espero que esteja tudo bem.',
    'Boa noite, ou bom dia, conforme a perspetiva. Tudo bem por aí?',
    'Olá! A madrugada é calma; boa altura para pensar com clareza.',
    'Olá! Hora pouco habitual, mas estou aqui. Está tudo bem?',
  ],
  offline: [
    'Olá! Estamos sem internet, mas não te preocupes: tenho o Guia e os teus ficheiros aqui comigo.',
    'Olá! A rede foi-se, mas eu fico. Continuo a funcionar com tudo o que está guardado no telemóvel.',
    'Olá! Sem ligação de momento, mas é exatamente para isto que a SteelDeck foi feita.',
    'Olá! Modo offline ativo. O Guia de Sobrevivência e os teus documentos continuam disponíveis.',
  ],
};
export const periodOf = (d = new Date()) => {
  const h = d.getHours();
  return h < 6 ? 'madrugada' : h < 12 ? 'manha' : h < 20 ? 'tarde' : 'noite';
};
export function greeting(offline = false) {
  const G = isEn() ? (EN.greetings || GREETINGS) : GREETINGS;
  return offline ? pick('g-off', G.offline) : pick(`g-${periodOf()}`, G[periodOf()]);
}
export const helpPrompt = () => (isEn() ? 'How can I help you?' : 'Em que te posso ser útil?');

// ---------- Convites ao diálogo ----------
export const STARTERS = [
  'Em que te posso ajudar hoje?',
  'Diz-me o que tens em mente: uma dúvida, um texto ou um plano?',
  'Queres consultar o Guia, rever os teus ficheiros ou tirar uma dúvida rápida?',
  'Se tiveres algum documento carregado que queiras explorar, começamos por aí.',
  'Estás a preparar alguma saída ou é mais uma curiosidade?',
  'Conta-me o que precisas e eu trato de procurar o que interessa.',
  'Por onde queres começar?',
  'Tens os 18 módulos do Guia à mão. Há algum tema que te interesse?',
  'Se quiseres, posso ajudar-te a transformar notas soltas num plano.',
  'Qual é a dúvida do momento?',
  'Primeiros socorros, água, fogo, orientação… o que te traz por cá?',
  'Diz-me o contexto e eu ajudo-te a encontrar a resposta certa.',
  'Estou à escuta. O que vamos resolver primeiro?',
  'Queres uma resposta rápida ou preferes explorar um tema com calma?',
  'Tens alguma situação concreta em mãos?',
  'Podemos ir direto ao assunto: o que precisas de saber?',
  'Há alguma coisa no teu plano que queiras rever comigo?',
  'Se tiveres uma pergunta, um texto ou uma ideia, sou todo ouvidos.',
  'O que gostavas de ter resolvido no fim desta conversa?',
  'A consola é tua. Em que estás a pensar?',
];
export const starter = () => pick('start', isEn() ? en('iniciar', STARTERS) : list(INICIAR, STARTERS));

// ---------- Bloco 1: abrir uma síntese em frase própria (a partir dos ficheiros) ----------
export const SYNTH = [
  'Pelo que consta nos teus ficheiros sobre este tema, a ideia central é esta:',
  'Cruzando o que tens guardado, o ponto mais crítico aqui é o seguinte:',
  'Se traduzirmos o que o documento explica para uma linguagem direta, o essencial é isto:',
  'Nos registos que tens carregados, há um detalhe prático que faz toda a diferença:',
  'Deixando de lado os tecnicismos do texto original, o que realmente importa reter é isto:',
  'Um dos aspetos que mais se destaca nos teus apontamentos é o seguinte:',
  'A leitura atenta desse material mostra o essencial:',
  'Na prática, o que esse documento quer dizer é isto:',
  'Se resumirmos a essência numa ideia útil para o dia a dia, fica assim:',
  'O documento chama a atenção para uma precaução importante:',
  'Tirando o ruído e o contexto acessório, sobra uma regra muito clara:',
  'A lógica por trás do que está escrito é bastante pragmática:',
  'Mesmo que o texto original seja denso, a conclusão prática resume-se a isto:',
  'Com base no que tens arquivado, a forma mais segura de encarar isto é a seguinte:',
  'Em termos simples, os teus documentos sugerem o seguinte:',
  'O teu material aponta para uma lógica simples:',
  'O que sobressai dessa fonte é isto:',
  'Pelo que tenho guardado sobre o assunto, o mais importante é isto:',
  'Fui ao Guia e o essencial é o seguinte:',
  'Os teus ficheiros são bastante claros neste ponto:',
];
export const synth = () => pick('synth', SYNTH);

// ---------- Bloco 3: ligar uma segunda fonte ou a conversa ----------
export const CONNECTORS = [
  'Quando junto o que vem descrito noutra secção, o quadro fica mais claro:',
  'Há outra passagem que complementa bem esta ideia:',
  'Juntando com o que já falámos e com outra parte dos teus documentos:',
  'Se cruzarmos com outra fonte que tens guardada, acrescenta-se isto:',
  'Puxando pelo fio de outro registo, destaco ainda o seguinte:',
  'Noutro ponto do material há um complemento útil:',
  'Para completar o quadro, há ainda esta nota:',
  'Não precisamos de olhar para isto de forma isolada; noutra secção lê-se o seguinte:',
  'Há uma ligação direta com outro tema que tens guardado:',
  'Combinando com outra referência, o cenário fica assim:',
  'Vale a pena juntar ainda isto, de outra parte do Guia:',
  'E há um detalhe noutra fonte que reforça a ideia:',
  'Se reunirmos com outra passagem, percebe-se melhor onde está o foco:',
  'Convém ainda ter presente o que diz outra secção:',
  'Ligando os pontos com outro registo:',
];
export const connector = () => pick('conn', CONNECTORS);

// ---------- Bloco 4: uma pergunta inteligente sobre o tema ----------
export const QUESTIONS = [
  'Estás a pensar aplicar isto num cenário real ou é mais para estudo e preparação?',
  'Qual é o detalhe que te gera mais dúvida neste tema?',
  'Preferes que olhemos para isto de forma prática e rápida, ou queres os pormenores?',
  'Isto encaixa em algo que estás a planear agora ou surgiu como curiosidade?',
  'Que parte deste tema faz mais sentido explorar a seguir?',
  'Há alguma condição do teu caso, como tempo, recursos ou local, que deva entrar nesta conta?',
  'Queres que fiquemos pela ideia geral ou descemos ao passo a passo?',
  'O que é que te parece mais urgente esclarecer antes de avançarmos?',
  'Procuras uma resposta direta para agir já, ou queres comparar opções com calma?',
  'Há algum ponto aqui que gostasses de ver exemplificado?',
  'Queres que pense nisto como um plano completo ou foi só uma dúvida rápida?',
  'Queres que te mostre o excerto completo do Guia, ou chega este resumo?',
  'Isto liga-se a algum outro assunto que tenhas andado a preparar?',
  'Qual seria, para ti, o resultado ideal no fim desta conversa sobre o tema?',
  'Queres que continue com o resto do capítulo?',
];
export const question = () => pick('q', isEn() ? en('perguntas', QUESTIONS) : list(PERGUNTAS, QUESTIONS));
// abertura curta antes de uma resposta com fonte ("Fui ver ao Guia.")
// guide=false: documento do utilizador -> sem aberturas que falam do "Guia"
// Só entram aberturas que são frases completas: as que acabam em ":" ("Pelo que consta nos teus documentos:",
// "Sem rodeios:") anunciam o texto seguinte e, trocando ":" por ".", ficavam frases incompletas antes de
// "Com base no ficheiro…" — era uma das origens das "frases sem palavras".
export const isCompleteOpener = (f) => /[.!?]$/.test(String(f).trim()) && !/:\s*$/.test(String(f));
export const opener = (guide = true) => {
  const all = isEn() ? en('respostas', ['I checked.']) : list(RESPOSTAS, ['Fui ver.']);
  const ok = all.filter(isCompleteOpener).filter((f) => guide || !/\b(guia|guide)\b/i.test(f));
  return pick(`${isEn() ? 'en-' : ''}${guide ? 'open' : 'open-doc'}`, ok.length ? ok : [isEn() ? 'I checked.' : 'Fui ver.']);
};
// exemplos de estilo para a IA online (poucos, ao acaso, para não gastar tokens)
export function styleSamples(n = 4) {
  const take = (arr) => [...arr].sort(() => Math.random() - 0.5).slice(0, n);
  const chat = (CONVERSA?.temas || []).flatMap((t) => t.respostas || []);
  return { aberturas: take(list(RESPOSTAS, [])), perguntas: take(list(PERGUNTAS, [])), iniciar: take(list(INICIAR, [])), conversa: take(chat) };
}

// ---------- Bloco 5: pedir para reformular (pedido vago ou confuso) — Fórmula D ----------
export const REPHRASE = [
  'Acho que não apanhei bem o que pretendes com essa frase. Podes reformular com outras palavras?',
  'Fiquei com uma pequena dúvida sobre o que queres dizer ao certo. Consegues dar-me um pouco mais de contexto?',
  'Não quero adivinhar o que tinhas em mente. Podes dizer-me qual é o objetivo?',
  'Essa pergunta ficou um bocadinho aberta para mim. Se me disseres o que procuras em concreto, ajudo-te logo a seguir.',
  'Percebi o tema geral, mas não tenho a certeza do que queres fazer com ele. Podes reformular a ideia?',
  'Talvez me tenha escapado algum detalhe. Queres tentar dizer-me isso de outra maneira?',
  'Para te dar uma resposta certeira e não andar à volta: consegues reformular o que precisas exatamente?',
  'Não ficou totalmente claro o que esperas que eu faça. Queres que explique, resuma ou compare alguma coisa?',
  'A mensagem chegou um pouco solta e não quero interpretar mal. Podes juntar mais uma frase de contexto?',
  'Não apanhei bem a intenção por trás do pedido. Diz-me com outras palavras o que tens em mente.',
  'Faltou-me um bocadinho de contexto. Como é que reformularias esta pergunta?',
  'Não consegui ligar bem os pontos do que escreveste. Em poucas palavras, o que precisas?',
  'Desculpa, não percebi ao certo o rumo da pergunta. Podes reformular para eu te ajudar como deve ser?',
  'Acho que podemos afinar este pedido: o que gostavas mesmo de obter como resposta?',
  'Se me reformulares isso de forma mais direta, vou logo ao ponto.',
];
const REPHRASE_HINTS = [
  'Por exemplo: "como purificar água sem filtro" ou "o que levar na mochila de 72 horas".',
  'Algo como "como fazer fogo com pederneira" ou "sinais de hipotermia" ajuda-me muito.',
  'Diz-me o tema e o que queres: explicar, resumir ou um passo a passo.',
];
export const rephrase = () => (isEn()
  ? `${pick('re', en('rephrase', REPHRASE))}\n\n_${pick('re-h', en('rephraseHints', REPHRASE_HINTS))}_`
  : `${pick('re', REPHRASE)}\n\n_${pick('re-h', REPHRASE_HINTS)}_`);

// ---------- Bloco 2: quando o tema não está nos ficheiros (com transparência) ----------
export const MISSING = [
  'Não encontrei este assunto específico nos teus documentos, e prefiro não inventar.',
  'Este tema fica fora do que tens arquivado na base de conhecimento.',
  'Os teus ficheiros não entram neste detalhe, e não quero dar-te um palpite como se fosse facto.',
  'Para ser honesto: isto não está nos teus documentos base.',
  'Não há referência direta a isto nos ficheiros locais.',
  'Procurei no Guia e nos teus documentos e não encontrei nada sobre isso.',
  'Ainda não tenho este tópico documentado aqui.',
  'Se não está nos documentos, não invento que está.',
  'A base local é omissa neste ponto.',
  'Isto vai além do que está guardado nos teus ficheiros.',
];
const WHY = {
  offline: 'Como estamos **sem internet**, só consigo usar o que está guardado no telemóvel.',
  nokey: 'Com a **IA online ligada** (chave nas Definições) conseguiria raciocinar sobre isto além dos ficheiros.',
  error: 'A **IA online não respondeu** agora, por isso fiquei limitado aos ficheiros locais.',
  mode: 'O modo **Base local** está ativo (Modo IA, no menu ≡), por isso só uso os ficheiros do telemóvel.',
};
// Lista "A, B ou C" sem partir títulos que tenham vírgulas
const joinOr = (items, or) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} ${or} ${items[items.length - 1]}`);
export function missing(topicsList = [], reason = 'offline') {
  const items = topicsList.slice(0, 3).map((x) => `**${x}**`);
  if (isEn()) {
    const W = EN.why || {};
    const tt = items.length ? joinOr(items, 'or') : EN.missingDefault;
    return `${pick('miss-en', en('missing', MISSING))} ${W[reason] || W.offline}\n\n${String(EN.missingTail).replace('{t}', tt)}`;
  }
  const tt = items.length ? joinOr(items, 'ou') : 'os módulos do Guia';
  return `${pick('miss', MISSING)} ${WHY[reason] || WHY.offline}\n\nPosso, no entanto, ajudar-te com ${tt}. Se tiveres um documento sobre o tema, importa-o na aba **Ficheiros IA** e eu passo a consultá-lo. Queres que comecemos por algum destes?`;
}

// ---------- Agradecimentos ----------
export const THANKS = [
  'Sempre ao dispor! Se precisares de mais alguma coisa, estou por aqui.',
  'De nada, foi um prazer. Queres explorar mais algum tema?',
  'Às ordens! Há mais alguma coisa em que te possa ajudar?',
  'Ainda bem que ajudou. Diz-me se quiseres continuar.',
];
export const thanks = () => pick('thx', isEn() ? en('thanks', THANKS) : THANKS);
// compatibilidade: fecho = uma pergunta sobre o tema
export const closing = () => question();
export const intro = () => synth();

// ---------- Quem sou ----------
export const IDENTITY = [
  'Sou o **Mr. Steel**, o assistente da SteelDeck. Consulto o Guia de Sobrevivência, os documentos que importares e os dados da app. Com internet e uma chave de IA, consigo também raciocinar sobre temas que não estão nos ficheiros.',
  'Chamo-me **Mr. Steel**. Cruzo o Guia, os teus ficheiros e os dados da app para te dar respostas com fonte, e mesmo sem rede continuo a funcionar com o que está guardado no telemóvel.',
];
export const identity = () => pick('id', isEn() ? en('identity', IDENTITY) : IDENTITY);

// ---------- Limpeza de texto de PDF/OCR ----------
// Tira números de página soltos, cabeçalhos e rodapés repetidos do eBook e espaços a mais.
const NOISE = [
  /^\s*\[?\s*\d{1,4}\s*\]?\s*$/, // "12", "[ 038 ]"
  /^\s*(p[áa]g(ina)?\.?\s*)?\d{1,4}\s*(\/|de)\s*\d{1,4}\s*$/i, // "pág. 3 / 75"
  /^\s*>?\s*STEELDECK\s*\/\/.*$/i, // cabeçalho do eBook e "> STEELDECK // MÓDULO 05"
  /^\s*PANDASTEEL(\s*\[\s*\d+\s*\])?\s*$/i, // rodapé
  /^\s*FIG\.\s*\d+[A-Z]?\s*(\/\/|—|-).*$/i, // legendas e rodapés das figuras
  /^\s*[~·•\-–—]?\s*$/, // restos de desenhos
  /\.{4,}\s*\d*\s*$/, // linhas de índice "Capítulo 7 ........ 27"
];
export function cleanNoise(text) {
  const lines = String(text || '').split('\n').filter((l) => !NOISE.some((r) => r.test(l)));
  // rótulos soltos de desenhos (4+ linhas curtas seguidas, sem frases) saem
  const short = (l) => l.trim().length <= 24 && !/[.!?:;]$/.test(l.trim()) && !/^\s*(\d+\.|[■•\-☐▶])/.test(l);
  const keep = lines.map(() => true);
  for (let i = 0; i < lines.length;) {
    let j = i; while (j < lines.length && short(lines[j])) j++;
    if (j - i >= 4) for (let k = i; k < j; k++) keep[k] = false;
    i = j > i ? j : i + 1;
  }
  return lines.filter((_, i) => keep[i]).join('\n')
    // erros típicos de OCR: "Cap i tulo" -> "Capítulo", "prote ção" -> "proteção", "infor- mação" -> "informação".
    // Só sufixos que NUNCA são palavras soltas: antes também se colavam "mente", "dade" e "idade", e frases reais
    // como "a sua idade" ou "na tua mente" passavam a "suaidade" / "tuamente" (gralhas criadas pela limpeza).
    .replace(/([A-Za-zÀ-ú]{2,}) ([bcdfghijklmnpqrstuvxzç]) ([a-zà-ú]{2,})/g, '$1$2$3')
    .replace(/([a-zà-ú]{2,}) (ção|ções|sões|ência|ências|ância|âncias)(?![a-zà-ú])/g, '$1$2')
    // hifenização no fim da linha: "purifi-\ncação" -> "purificação"; "faz-\nse" mantém o hífen ("faz-se")
    .replace(/([a-zà-ú])-[ \t]*\n[ \t]*(se|me|te|lhe|lhes|nos|vos|o|a|os|as|lo|la|los|las|no|na)(?![a-zà-ú])/g, '$1-$2')
    .replace(/([a-zà-ú])-[ \t]*\n[ \t]*([a-zà-ú])/g, '$1$2')
    .replace(/([a-zà-ú])- ([a-zà-ú]{2,})/g, (m, a, b) => (/^(se|me|te|lhe|lhes|nos|vos|lo|la|los|las)$/.test(b) ? `${a}-${b}` : `${a}${b}`))
    // junta linhas partidas a meio da frase (PDF): a linha anterior não acaba em pontuação final e a seguinte
    // continua com minúscula, número ou parêntese ("…a menos de\n30 m de…" perdia o "30" mais à frente)
    .replace(/([a-zà-ú0-9,;(—–\-])[ \t]*\n(?=[a-zà-ú(])/g, '$1 ')
    // …e quando a linha seguinte começa por um número que continua a frase ("e\n3 minutos", "de\n30 m"),
    // mas não por um passo numerado ("1 PARAR.", "2. Vento…")
    .replace(/([a-zà-ú,;])[ \t]*\n(?=\d+(?:[.,]\d+)?(?:[–-]\d+(?:[.,]\d+)?)?\s*[a-zà-ú°%])/g, '$1 ')
    // …e quando a linha acaba numa palavra que não pode terminar uma frase (artigo, preposição, conjunção) ou numa
    // vírgula, mesmo que a seguinte comece por maiúscula: "os avisos da\nProteção Civil." ficava "os avisos da."
    .replace(/(?<![\p{L}])(da|de|do|das|dos|na|no|nas|nos|num|numa|em|a|o|as|os|à|ao|aos|às|e|ou|com|sem|por|para|pela|pelo|pelas|pelos|um|uma|que|entre|sobre|até|como|the|of|and|to|in|an|for|with|from|by|or)[ \t]*\n(?![ \t]*(?:[■•☐▶>\-]|\d+[.)]\s))(?=[ \t]*\p{Lu})/gu, '$1 ')
    .replace(/([,;])[ \t]*\n(?![ \t]*(?:[■•☐▶>\-]|\d+[.)]\s))(?=[ \t]*\p{Lu}\p{Ll})/gu, '$1 ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ---------- Conversa de café (conversa.json) ----------
const nrm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
export function smallTalk(text) {
  const q = ` ${nrm(text)} `;
  const temas = isEn() ? (EN.conversa || []) : (CONVERSA?.temas || []);
  for (const t of temas) {
    if ((t.padroes || []).some((p) => q.includes(` ${nrm(p)} `)) && t.respostas?.length) return { tema: t.nome, text: pick(`chat-${t.nome}`, t.respostas) };
  }
  return null;
}

// ---------- Piadas (piadas.json) ----------
const JOKE_RE = /\b(piadas?|anedotas?|faz me rir|fazer me rir|algo engracado|coisa engracada|conta outra|outra piada|anima me|jokes?|make me laugh|something funny|tell me another|another one)\b/;
export const isJoke = (text) => JOKE_RE.test(` ${nrm(text)} `);
const JOKE_INTRO = ['Aqui vai uma:', 'Lá vai:', 'Esta é das boas:', 'Prepara-te:', 'Uma para animar:', 'Tenho uma:'];
const JOKE_END = ['Queres outra?', 'Pronto, já me podes avaliar.', 'Se te riste, conta como vitória minha.', 'Há mais de onde esta veio.', 'Não me julgues, sou um assistente de sobrevivência.'];
export function joke() {
  if (isEn()) return `${pick('joke-in-en', en('jokeIntro', JOKE_INTRO))} ${pick('joke-en', en('piadas', []))}\n\n${pick('joke-end-en', en('jokeEnd', JOKE_END))}`;
  const j = pick('joke', list(PIADAS, ['Porque é que a mochila nunca vai a festas? Porque já anda sempre carregada.']));
  return `${pick('joke-in', JOKE_INTRO)} ${j}\n\n${pick('joke-end', JOKE_END)}`;
}

// ---------- Intenções simples (antes da pesquisa) ----------
const n = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[!?.,;:]+/g, ' ').replace(/\s+/g, ' ').trim();
const GREET_RE = /^(ola|oi|ole|hey|hello|hi|hi there|hey there|good morning|good afternoon|good evening|bom dia|boa tarde|boa noite|boas|saudacoes|mr\.? ?steel|mister steel|steel|estas ai|esta ai|estas por ai|alguem ai|are you there|anyone there)( (mr\.? ?steel|steel))?$/;
const WHO_RE = /^(quem es( tu)?|o que es( tu)?|quem e o mr\.? ?steel|o que fazes|o que sabes fazer|como funcionas|apresenta te|ajuda|help|menu|who are you|what are you|what can you do|what do you do|how do you work|introduce yourself)$/;
const THANKS_RE = /^(obrigad[oa]|muito obrigad[oa]|obg|valeu|thanks|thank you|thanks a lot|thank you very much|thx|obrigado mr\.? ?steel|perfeito|perfect|otimo|great|excelente|excellent|fixe|top|awesome)( mr\.? ?steel)?$/;
const CONT_RE = /^(continua|continue|go on|keep going|more|tell me more|next|mais|e depois|e entao|segue|seguinte|prossegue|explica melhor|explica|explain more|desenvolve|aprofunda|mais detalhes|more details|da exemplos|exemplos|examples|resume|resume isso|resumo|em resumo|sintetiza|summarize|summarise|summarize that|summarise that|summary|in short|tl ?dr|o que mais|what else)( isso| isto| that| this| por favor| pf| please)?$/;
export function intentOf(question) {
  const q = n(question);
  if (!q) return null;
  if (GREET_RE.test(q)) return 'greet';
  if (WHO_RE.test(q)) return 'who';
  if (THANKS_RE.test(q)) return 'thanks';
  if (CONT_RE.test(q)) return /resum|sintet|tl ?dr|summar|in short/.test(q) ? 'summary' : 'continue';
  return null;
}
