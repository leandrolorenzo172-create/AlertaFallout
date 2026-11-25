// Validador de avisos de greve, partilhado pelo script que recolhe as notícias (scripts/fetch-news.mjs)
// e pela app (src/api/liveData.js). Sem dependências: corre no Node e no browser.
//
// Uma notícia só conta como greve se:
//  1. o TÍTULO falar de greve/paralisação (não basta a palavra aparecer no resumo de passagem);
//  2. não for desporto, um direto/liveblog sobre outro assunto, um resumo de notícias, opinião
//     ou uma medida de ordem pública (câmara/PSP a fechar lojas, etc.);
//  3. tiver algo concreto: convocação, pré-aviso, adesão, serviços mínimos, dias, efeitos, suspensão...
// O setor é decidido pelo título primeiro (e só depois pelo resumo), para não herdar etiquetas erradas.

export const normText = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

const STRIKE = /\b(greves?|grevistas?|paralisac\w+|pre-avisos? de greve|plenarios? de trabalhadores)\b/;
const NOT_STRIKE = /\bgreves? de (fome|zelo de)\b/; // greve de fome não é laboral
// diretos/liveblogs: "13h. ...", "00h ..." — o título da entrada é o que conta
const LIVE_PREFIX = /^\s*\d{1,2}h(\d{2})?\s*[.:\-–—]?\s*/i;
const SPORTS = /\b(futebol|golos?|autogolo|liga dos campeoes|liga europa|i liga|campeonato|jogo|jogos|vitoria|derrota|empate|treinador|selecao nacional|fcp|fc porto|benfica|sporting|braga sc|feyenoord|uefa|fifa|mundial de|euro 20\d\d|ciclismo|volta a|tenis|formula 1|motogp|andebol|basquetebol|hoquei|atletismo)\b/;
const DIGEST = /\b(as \d+ noticias|o essencial|resumo do dia|o que (marcou|aconteceu)|as noticias da|5 noticias|cinco noticias)\b/;
const PUBLIC_ORDER = /\b(psp|gnr|camara municipal|camara (fecha|proibe)|policia)\b.*\b(fecha|proib\w*|encerr\w*|interdi\w*|vedad\w*)\b/;
// sinais de uma greve concreta (no título ou no resumo)
const CONCRETE = /\b(convoc\w*|marcad\w*|anunci\w*|pre-aviso|servicos minimos|adesao|aderem|adere|suprim\w*|cancel\w*|afet\w*|fech\w*|comec\w*|arranc\w*|mant(em|ido|em-se)|suspen\w*|desconvoc\w*|adia\w*|supress\w*|contingencia|atras\w*|dia de greve|em greve|hoje|amanha|continua|prolong\w*|cumpr\w*|para(m|ram)?\b|pára|leva|deixa|regist\w*|semana de greve|segunda-feira|terca-feira|quarta-feira|quinta-feira|sexta-feira|sabado|domingo|janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|\d+ de \w+|plenario|sindicato|frente comum|fenprof|fnam|stop|cgtp|ugt)\b/;
// opinião ou citação solta, sem greve concreta
const OPINION_START = /^\s*["“«']/;
const OPINION_WORDS = /\b(deve ser|devia ser|patrimonio nacional|opiniao|cronica|editorial|estranho que|a culpa|o problema das greves|porque e que)\b/;

export const STRIKE_SECTORS = [
  [/medic|enfermeir|hospita|saude|\bsns\b|farmac|fnam|centros? de saude/, 'Saúde'],
  [/professor|escola|ensino|educacao|universidad|fenprof|\bstop\b/, 'Educação'],
  [/greve geral/, 'Greve geral'],
  [/italia|franca|espanha|alemanha|belgica|reino unido|grecia|brasil|\beua\b|estados unidos|argentina|bangladesh|india|china/, 'Internacional'],
  [/comboio|\bcp\b|maquinist|metro|carris|stcp|\btap\b|sata|azores airlines|ryanair|easyjet|handling|tripulantes|pilotos|aeroporto|aviacao|transportes?|motoristas|camionistas|portos?|estivadores|ferrovi|autocarro/, 'Transportes'],
  [/funcao publica|administracao publica|funcionarios publicos|frente comum/, 'Função pública'],
  [/oficiais de justica|tribuna|justica|magistrad|guardas prisionais|prisoes|cadeia/, 'Justiça'],
  [/policia|psp|gnr|bombeiros|forcas de seguranca/, 'Segurança'],
  [/recolha do lixo|\blixo\b|limpeza urbana|autarquia|camara municipal|municipais/, 'Autarquias'],
  [/correios|\bctt\b|banca|bancarios|caixa geral|\bcgd\b|trabalhadores da caixa|comercio|industria|fabricas?|automotive|call center|accenture|teijin/, 'Privado'],
];

export function strikeSector(title, summary = '') {
  const t = normText(title); const all = `${t} ${normText(summary)}`;
  return (STRIKE_SECTORS.find(([re]) => re.test(t)) || STRIKE_SECTORS.find(([re]) => re.test(all)) || [null, 'Outros'])[1];
}

// Devolve { ok: true } ou { ok: false, reason } — o motivo serve para os testes e para depurar
export function checkStrikeNotice(item) {
  const rawTitle = String(item?.title || '');
  const title = normText(rawTitle.replace(LIVE_PREFIX, ''));
  const summary = normText(item?.summary);
  if (!title) return { ok: false, reason: 'sem título' };
  if (!STRIKE.test(title)) return { ok: false, reason: 'o título não fala de greve' };
  if (NOT_STRIKE.test(title)) return { ok: false, reason: 'greve de fome/zelo' };
  if (SPORTS.test(title)) return { ok: false, reason: 'desporto' };
  if (DIGEST.test(title)) return { ok: false, reason: 'resumo de notícias' };
  if (PUBLIC_ORDER.test(title) && !/\bgreve\b/.test(title)) return { ok: false, reason: 'medida de ordem pública' };
  if (OPINION_WORDS.test(title)) return { ok: false, reason: 'opinião' };
  const concrete = CONCRETE.test(title) || CONCRETE.test(summary);
  if (OPINION_START.test(rawTitle.replace(LIVE_PREFIX, '')) && !CONCRETE.test(title)) return { ok: false, reason: 'opinião/citação' };
  if (!concrete) return { ok: false, reason: 'sem greve concreta (opinião ou menção de passagem)' };
  return { ok: true };
}
export const isValidStrikeNotice = (item) => checkStrikeNotice(item).ok;
