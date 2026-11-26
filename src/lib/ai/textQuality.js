// Qualidade linguística das respostas do Mr. Steel (pt-PT e en), online e offline.
//
// Porque existe: as respostas apareciam com palavras cortadas ou em falta e com formas do Brasil. As causas
// estavam espalhadas (excertos e histórico cortados a meio da palavra, linhas de PDF partidas, regex de OCR que
// colavam palavras, aberturas que ficavam frases incompletas, prompt sempre em português…). Cada causa foi corrigida
// na origem; este módulo junta as proteções finais e as verificações usadas nos testes (scripts/test-ai-text.mjs):
//   - truncateAtBoundary(): cortar texto sem partir palavras nem frases;
//   - tidy(): espaços antes da pontuação, palavras repetidas por engano, frases coladas;
//   - ptBrToPtPt(): rede de segurança para formas do Brasil que escapem à IA online (só substituições seguras);
//   - finalizeAnswer(): o que é aplicado a cada resposta antes de a mostrar;
//   - checkText(): lista de problemas de um texto (vazio, cortado, palavras repetidas, hifenização partida,
//     mistura de idiomas, formas do Brasil, Markdown desequilibrado).

const L = '\\p{L}';
// fim de frase aceitável: pontuação final, fecho de aspas/parênteses/Markdown, reticências ou emoji
const TERMINAL_RE = /([.!?…:;)\]»"”'*_`]|\p{Extended_Pictographic})\s*$/u;

// Divide o texto em partes "normais" e partes protegidas (blocos ```, `código` e endereços web), para nunca mexer nelas.
const PROTECTED = /(```[\s\S]*?(?:```|$)|`[^`\n]*`|https?:\/\/[^\s)>\]]+|www\.[^\s)>\]]+)/;
function mapOutsideCode(text, fn) {
  return String(text).split(PROTECTED).map((part, i) => (i % 2 ? part : fn(part))).join('');
}

/**
 * Corta um texto até `max` caracteres sem partir palavras: prefere o fim de uma frase; senão, o último espaço.
 * Acrescenta "…" só quando corta a meio de uma frase.
 */
export function truncateAtBoundary(text, max, { ellipsis = '…' } = {}) {
  const s = String(text || '');
  if (s.length <= max) return s;
  const slice = s.slice(0, max + 1);
  // fim de frase dentro da 2.ª metade do limite
  let cut = -1;
  const re = /[.!?…](?=\s|$)/g; let m;
  while ((m = re.exec(slice))) { if (m.index + 1 <= max && m.index >= max * 0.5) cut = m.index + 1; }
  if (cut > 0) return s.slice(0, cut).trimEnd();
  const sp = slice.lastIndexOf(' ', max);
  const base = (sp > max * 0.3 ? s.slice(0, sp) : s.slice(0, max)).replace(/[\s,;:–—-]+$/, '');
  return `${base}${ellipsis}`;
}

// Pares repetidos legítimos (não são gralhas)
const OK_DOUBLES = new Set(['ha ha', 'há há', 'bye bye', 'so so', 'had had', 'that that', 'tic tac', 'blá blá', 'bla bla', 'pouco pouco', 'nós nós']);

/** Arruma espaços e pontuação sem alterar o conteúdo. Idempotente (pode correr em cada passo do streaming). */
export function tidy(text) {
  return mapOutsideCode(String(text || '').replace(/\r\n?/g, '\n'), (s) => s
    // espaço antes de pontuação (" ," " ." " ?"), mas não em reticências nem em listas "  - "
    .replace(new RegExp(`([${L}\\d)»"”])[ \\t]+([,.;:!?])(?=\\s|$)`, 'gu'), '$1$2')
    // frases coladas: "fim.Início" -> "fim. Início" (só minúscula + pontuação + Maiúscula+minúscula)
    .replace(/(\p{Ll}{2})([.!?])(\p{Lu}\p{Ll})/gu, '$1$2 $3')
    // palavra repetida por engano: "de de", "the the"
    .replace(new RegExp(`(^|[^${L}])([${L}]{2,})([ \\t]+)\\2(?![${L}])`, 'giu'), (all, pre, w, sp) => (OK_DOUBLES.has(`${w} ${w}`.toLowerCase()) ? all : `${pre}${w}`))
    // espaços múltiplos a meio da linha (mantém a indentação de listas e código)
    .replace(/(\S)[ \t]{2,}(?=\S)/g, '$1 '));
}

// ---------- Português do Brasil -> Português de Portugal (só substituições sem ambiguidade) ----------
// STEMS: início de palavra (aplica-se à família: "econômico/econômica/econômicos"). WORDS: só a palavra inteira.
const BR_STEMS = [
  ['econômic', 'económic'], ['fenômen', 'fenómen'], ['quilômetr', 'quilómetr'], ['anônim', 'anónim'], ['atômic', 'atómic'],
  ['eletrônic', 'eletrónic'], ['telefônic', 'telefónic'], ['polêmic', 'polémic'], ['acadêmic', 'académic'], ['gêner', 'géner'],
  ['prêmi', 'prémi'], ['convêni', 'convéni'], ['gême', 'géme'], ['crônic', 'crónic'], ['sinônim', 'sinónim'],
  ['harmônic', 'harmónic'], ['irônic', 'irónic'], ['agrônom', 'agrónom'], ['astronômic', 'astronómic'], ['ingênu', 'ingénu'],
  ['higiênic', 'higiénic'], ['oxigêni', 'oxigéni'], ['hidrogêni', 'hidrogéni'], ['anatômic', 'anatómic'], ['autônom', 'autónom'],
  ['efêmer', 'efémer'], ['usuári', 'utilizador'], ['recepç', 'receç'], ['detect', 'detet'],
];
const BR_WORDS = [
  ['bebê', 'bebé'], ['bebês', 'bebés'], ['purê', 'puré'], ['tênis', 'ténis'], ['Antônio', 'António'], ['ônibus', 'autocarro'],
  ['abdômen', 'abdómen'], ['fêmur', 'fémur'], ['gênio', 'génio'], ['gênios', 'génios'], ['Amazônia', 'Amazónia'], ['cômodo', 'cómodo'],
  ['equipe', 'equipa'], ['equipes', 'equipas'], ['celular', 'telemóvel'], ['celulares', 'telemóveis'], ['geladeira', 'frigorífico'],
  ['geladeiras', 'frigoríficos'], ['banheiro', 'casa de banho'], ['registro', 'registo'], ['registros', 'registos'],
  ['trem', 'comboio'], ['trens', 'comboios'], ['contato', 'contacto'], ['contatos', 'contactos'], ['pra', 'para'],
  ['xícara', 'chávena'], ['xícaras', 'chávenas'], ['açougue', 'talho'], ['caminhão', 'camião'], ['caminhões', 'camiões'],
];
// "usuário(s)/usuária(s)" -> "utilizador(es)/utilizadora(s)": o radical "usuári" precisa de terminação própria
const USUARIO = { o: '', os: 'es', a: 'a', as: 'as' };
const NOT_L = `(?<![${L}])`; const END = `(?![${L}])`;
const STEM_RES = BR_STEMS.map(([br, pt]) => [new RegExp(`${NOT_L}${br}([${L}]*)`, 'giu'), pt, br]);
const WORD_RES = BR_WORDS.map(([br, pt]) => [new RegExp(`${NOT_L}${br}${END}`, 'giu'), pt]);
const ESTAR = 'estou|estás|está|estamos|estão|estava|estavas|estávamos|estavam|esteve|estive|estiveram|estar|estará|estarás|estaremos|estarão|esteja|estejas|estejam|fica|ficas|ficam|ficou|continua|continuas|continuam|continuou|anda|andas|andam|andou';
const GER_RE = new RegExp(`${NOT_L}(${ESTAR})\\s+([${L}]+(?:ando|endo|indo|ondo))${END}`, 'giu');
// verbos curtos com infinitivo irregular e palavras em -ndo que NÃO são gerúndios ("está lindo", "está redondo")
const GER_IRREG = { dando: 'dar', tendo: 'ter', vendo: 'ver', lendo: 'ler', sendo: 'ser', rindo: 'rir', crendo: 'crer', pondo: 'pôr', vindo: 'vir', indo: 'ir', estando: 'estar', fazendo: 'fazer', dizendo: 'dizer', trazendo: 'trazer' };
const NOT_GER = new Set(['quando', 'lindo', 'linda', 'redondo', 'brando', 'estupendo', 'horrendo', 'tremendo', 'hediondo', 'findo', 'infindo', 'bando', 'comando', 'mando', 'segundo', 'fundo', 'profundo', 'mundo', 'imundo', 'oriundo', 'nefando', 'venerando', 'ando']);
function gerundToInfinitive(word) {
  const w = word.toLowerCase();
  if (NOT_GER.has(w)) return null;
  if (GER_IRREG[w]) return GER_IRREG[w];
  const m = w.match(/^(.{2,})(ando|endo|indo|ondo)$/);
  if (!m) return null;
  return `${m[1]}${{ ando: 'ar', endo: 'er', indo: 'ir', ondo: 'or' }[m[2]]}`;
}
const keepCase = (src, out) => (src[0] !== src[0].toLowerCase() ? out[0].toUpperCase() + out.slice(1) : out);

/** Corrige formas do Brasil inequívocas para pt-PT. Não mexe em blocos de código. */
export function ptBrToPtPt(text) {
  return mapOutsideCode(String(text || ''), (s) => {
    let out = s;
    for (const [re, pt, br] of STEM_RES) {
      out = out.replace(re, (found, rest) => {
        if (br === 'usuári') return keepCase(found, `utilizador${USUARIO[rest.toLowerCase()] ?? ''}`);
        return keepCase(found, `${pt}${rest}`);
      });
    }
    for (const [re, pt] of WORD_RES) out = out.replace(re, (found) => keepCase(found, pt));
    // "estou fazendo" -> "estou a fazer"; "está pondo" -> "está a pôr"
    out = out.replace(GER_RE, (all, aux, ger) => {
      const verb = gerundToInfinitive(ger);
      return verb ? `${aux} a ${verb}` : all;
    });
    return out;
  });
}

/** Passo final aplicado a TODAS as respostas (online, offline, streaming e texto final). */
export function finalizeAnswer(text, { lang = 'pt' } = {}) {
  let out = tidy(text);
  if (lang === 'pt') out = ptBrToPtPt(out);
  return out;
}

// ---------- Verificação (testes e avisos na consola em desenvolvimento) ----------
const PT_FUNC = /(^|\s)(não|que|para|com|uma|são|está|também|isso|mas|porque|pelo|pela|então|você|tu)(?=\s|[,.;:!?]|$)/giu;
const EN_FUNC = /(^|\s)(the|and|you|is|are|with|this|that|your|for|of|to|it|be|what|how)(?=\s|[,.;:!?]|$)/giu;
const BR_MARKERS = new RegExp(`(^|[^${L}])(você|vocês|${[...BR_WORDS.map(([w]) => w), ...BR_STEMS.map(([st]) => `${st}[${L}]*`)].join('|')})(?![${L}])`, 'iu');

/**
 * Devolve a lista de problemas encontrados no texto (vazia = OK).
 * @param {{ lang?: 'pt'|'en', allowPortugueseQuotes?: boolean }} opts
 *   allowPortugueseQuotes: em inglês, ignora citações em português marcadas como bloco "> " (excertos do Guia).
 */
export function checkText(text, { lang = 'pt', allowPortugueseQuotes = true } = {}) {
  const issues = [];
  const s = String(text || '');
  if (!s.trim()) return ['vazio'];
  const prose = s.replace(/```[\s\S]*?```/g, ' ').replace(/`[^`\n]*`/g, ' ').replace(/https?:\/\/\S+|www\.\S+/g, 'ligação');
  const lines = prose.trim().split('\n').filter((l) => l.trim());
  const last = lines[lines.length - 1] || '';
  const isListOrTable = /^\s*([-*•]|\d+[.)]|\|)/.test(last);
  if (prose.trim().length > 40 && !isListOrTable && !TERMINAL_RE.test(last.trim())) issues.push(`cortado: "…${last.trim().slice(-40)}"`);
  const dbl = prose.match(new RegExp(`(^|[^${L}])([${L}]{2,})[ \\t]+\\2(?![${L}])`, 'iu'));
  if (dbl && !OK_DOUBLES.has(`${dbl[2]} ${dbl[2]}`.toLowerCase())) issues.push(`palavra repetida: "${dbl[2]} ${dbl[2]}"`);
  const hy = prose.match(/\p{L}- \p{Ll}{2,}/u);
  if (hy) issues.push(`hifenização partida: "${hy[0]}"`);
  const sp = prose.match(new RegExp(`[${L}][ \\t]+[,;!?](?=\\s|$)`, 'u'));
  if (sp) issues.push(`espaço antes de pontuação: "${sp[0]}"`);
  if ((prose.match(/\*\*/g) || []).length % 2) issues.push('Markdown desequilibrado (**)');
  if (lang === 'pt') {
    const br = prose.match(BR_MARKERS);
    if (br) issues.push(`forma do Brasil: "${br[2]}"`);
    const ger = [...prose.matchAll(GER_RE)].find((m) => gerundToInfinitive(m[2]));
    if (ger) issues.push(`gerúndio do Brasil: "${ger[0].trim()}"`);
    const en = (prose.match(EN_FUNC) || []).length; const pt = (prose.match(PT_FUNC) || []).length;
    if (en >= 4 && en > pt) issues.push('texto parece estar em inglês');
  } else {
    const body = allowPortugueseQuotes ? prose.split('\n').filter((l) => !/^\s*>/.test(l)).join('\n') : prose;
    const pt = (body.match(PT_FUNC) || []).length; const en = (body.match(EN_FUNC) || []).length;
    if (pt >= 3 && pt >= en) issues.push('texto parece estar em português');
  }
  return issues;
}
