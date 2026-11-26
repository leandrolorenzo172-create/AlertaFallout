// Testes de qualidade linguística do Mr. Steel (aba IA): npm run test:ai
// Garante que não voltam a aparecer palavras cortadas/em falta, frases incompletas, formas do Brasil em pt-PT
// ou mistura de idiomas — nos dois idiomas (pt-PT e en) e nos dois modos (online = prompt; offline = base local).
//
//  1. textQuality: correções e verificações (unidade)
//  2. Corte seguro de texto (excertos, histórico, secções dos documentos)
//  3. Frases locais (src/data/mrsteel/*.json e en.json): completas, sem gralhas de formato, idioma certo
//  4. Motor offline com o Guia real (public/guia-steeldeck.pdf), em pt e en: respostas completas e no idioma certo
//  5. Prompt da IA online: regras de idioma corretas para pt e en
import { createServer } from 'vite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let fail = 0; let pass = 0;
const ok = (cond, label, extra = '') => { if (cond) pass++; else { fail++; console.log(`ERRO ${label}${extra ? `\n     ${extra}` : ''}`); } };

// ---------- Ambiente de browser mínimo ----------
const store = {};
globalThis.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
globalThis.sessionStorage = globalThis.localStorage;

// ---------- Texto do Guia, extraído como a app faz (src/lib/kb.js) ----------
const pdfjs = await import(path.join(ROOT, 'node_modules/pdfjs-dist/legacy/build/pdf.mjs'));
const pdf = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(path.join(ROOT, 'public/guia-steeldeck.pdf'))), verbosity: 0 }).promise;
const pages = [];
for (let i = 1; i <= pdf.numPages; i++) {
  const tc = await (await pdf.getPage(i)).getTextContent();
  pages.push(tc.items.map((it) => it.str + (it.hasEOL ? '\n' : ' ')).join('').replace(/[ \t]+/g, ' ').trim());
}
await pdf.destroy();

// kb.js e guide.js usam IndexedDB: nos testes o Guia vem da memória
const mockKb = {
  name: 'mock-kb', enforce: 'pre',
  resolveId(id) { if (/(^@\/lib\/kb$|\/lib\/kb(\.js)?$)/.test(id)) return '\0kb'; if (/(^@\/lib\/guide$|\/lib\/guide(\.js)?$)/.test(id)) return '\0guide'; return null; },
  load(id) {
    if (id === '\0kb') return `export const listDocs = async () => [{ id: 'guia', name: 'GUIA DE SOBREVIVENCIA STEELDECK.pdf', title: 'GUIA DE SOBREVIVÊNCIA STEELDECK', unit: 'pág.', system: true, pages: ${JSON.stringify(pages)} }];
      export const onKbChange = () => () => {}; export const requestOpen = () => {};`;
    if (id === '\0guide') return 'export const ensureGuide = async () => {}; export const isGuide = () => true;';
    return null;
  },
};
const server = await createServer({ root: ROOT, configFile: false, logLevel: 'error', plugins: [mockKb], resolve: { alias: { '@': path.join(ROOT, 'src') } }, server: { middlewareMode: true, hmr: false }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } });
const load = (p) => server.ssrLoadModule(p);
const i18n = await load('/src/i18n/index.js');
const setLang = (l) => { store.pb_settings = JSON.stringify({ lang: l }); i18n.refreshLang(); };

const tq = await load('/src/lib/ai/textQuality.js');

// ---------- 1. textQuality ----------
console.log('\n# 1. textQuality');
const fix = (a, b, lang = 'pt') => { const r = tq.finalizeAnswer(a, { lang }); ok(r === b, `finalizeAnswer(${JSON.stringify(a)})`, `obtido:  ${JSON.stringify(r)}\n     esperado: ${JSON.stringify(b)}`); };
fix('Estou fazendo o registro no celular.', 'Estou a fazer o registo no telemóvel.');
fix('Ele está pondo a mesa e está sendo honesto.', 'Ele está a pôr a mesa e está a ser honesto.');
fix('O céu está lindo quando está redondo.', 'O céu está lindo quando está redondo.'); // não são gerúndios
fix('O trem passou pela praia e tremeu.', 'O comboio passou pela praia e tremeu.'); // "pra"/"trem" só palavra inteira
fix('Isto é de de teste , com espaço.Fim', 'Isto é de teste, com espaço. Fim');
fix('Vê https://pra.exemplo.pt/trem e `registro`.', 'Vê https://pra.exemplo.pt/trem e `registro`.'); // ligações e código intactos
fix('The the answer is ready .', 'The answer is ready.', 'en');
fix('He is doing the registro.', 'He is doing the registro.', 'en'); // em inglês não se aplica pt-BR -> pt-PT
ok(tq.checkText('Você está fazendo isso.', { lang: 'pt' }).some((x) => /Brasil/.test(x)), 'checkText deteta formas do Brasil');
ok(tq.checkText('Esta resposta acaba a meio de uma frase porque foi cortad', { lang: 'pt' }).some((x) => /cortado/.test(x)), 'checkText deteta texto cortado');
ok(tq.checkText('This is the answer and you can use it now.', { lang: 'pt' }).some((x) => /inglês/.test(x)), 'checkText deteta inglês em pt');
ok(tq.checkText('Isto é a resposta que não tem nada para ver com isso.', { lang: 'en' }).some((x) => /português/.test(x)), 'checkText deteta português em en');
ok(tq.checkText('Tudo certo, com frases completas e corretas.', { lang: 'pt' }).length === 0, 'checkText aceita texto correto');

// ---------- 2. Corte seguro ----------
console.log('# 2. Corte seguro');
const long = 'Primeira frase completa aqui. Segunda frase que tem de ser cortada num sítio sem partir palavras nenhumas.';
for (const n of [20, 35, 50, 70, 90]) {
  const r = tq.truncateAtBoundary(long, n);
  const lastWord = r.replace(/…$/, '').split(/\s+/).pop().replace(/[.,]$/, '');
  ok(r.length <= n + 1 && long.includes(lastWord) && long.split(/[\s.]+/).includes(lastWord), `truncateAtBoundary(${n}) não parte palavras`, JSON.stringify(r));
}
const svc = await load('/src/lib/ai/aiService.js');
ok(svc.joinParts('O abrigo deve ficar a meia en', 'encosta, com o vento pelas costas.') === 'O abrigo deve ficar a meia encosta, com o vento pelas costas.', 'joinParts junta continuação sem duplicar', svc.joinParts('O abrigo deve ficar a meia en', 'encosta, com o vento pelas costas.'));
ok(svc.joinParts('Primeira parte.', ' Segunda parte.') === 'Primeira parte. Segunda parte.', 'joinParts mantém o espaço');
// secções de documentos (.txt/.md/.docx): o chunk de src/lib/kb.js não pode cortar palavras
const kbSrc = fs.readFileSync(path.join(ROOT, 'src/lib/kb.js'), 'utf8');
const chunkSrc = kbSrc.slice(kbSrc.indexOf('export function safeCut'), kbSrc.indexOf('async function extract'));
const { chunk } = await import(`data:text/javascript,${encodeURIComponent(chunkSrc)}`);
const words = Array.from({ length: 3000 }, (_, i) => `palavra${i}`);
const parts = chunk(words.join(' '), 1800);
ok(parts.length > 1 && parts.every((p) => p.split(/\s+/).every((w) => /^palavra\d+$/.test(w))), 'kb.chunk não corta palavras a meio');
ok(parts.join(' ').split(/\s+/).length === words.length, 'kb.chunk não perde palavras');

// ---------- 3. Frases locais ----------
console.log('# 3. Frases locais (src/data/mrsteel)');
const J = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/mrsteel', f), 'utf8'));
const fmt = (s) => {
  const issues = [];
  if (/\s{2,}/.test(s)) issues.push('espaços duplos');
  if (/\s[,.;:!?]/.test(s)) issues.push('espaço antes de pontuação');
  if (!/([.!?…:)»"”]|\p{Extended_Pictographic})$/u.test(s.trim())) issues.push('sem pontuação final');
  if (/\b(\p{L}{2,})\s+\1\b/iu.test(s)) issues.push('palavra repetida');
  return issues;
};
const ptLists = { 'respostas.json': J('respostas.json').frases, 'perguntas.json': J('perguntas.json').frases, 'iniciar.json': J('iniciar.json').frases, 'piadas.json': J('piadas.json').frases };
ptLists['conversa.json'] = J('conversa.json').temas.flatMap((x) => x.respostas);
ptLists['resumos.json'] = [...J('resumos.json').capitulos, ...J('resumos.json').palavras].map((x) => x.texto);
for (const [f, list] of Object.entries(ptLists)) {
  list.forEach((s) => { const iss = [...fmt(s), ...tq.checkText(s, { lang: 'pt' }).filter((x) => !/cortado/.test(x))]; ok(!iss.length, `${f}: "${s.slice(0, 60)}"`, iss.join(', ')); });
}
const EN = J('en.json');
const enLists = { respostas: EN.respostas, perguntas: EN.perguntas, iniciar: EN.iniciar, piadas: EN.piadas, rephrase: EN.rephrase, missing: EN.missing, thanks: EN.thanks, identity: EN.identity, suggestions: EN.suggestions.map((s) => `${s}.`), conversa: EN.conversa.flatMap((x) => x.respostas), greetings: Object.values(EN.greetings).flat() };
for (const [k, list] of Object.entries(enLists)) {
  list.forEach((s) => { const iss = [...fmt(s), ...tq.checkText(s, { lang: 'en' }).filter((x) => !/cortado/.test(x))]; ok(!iss.length, `en.json/${k}: "${s.slice(0, 60)}"`, iss.join(', ')); });
}
const persona = await load('/src/lib/ai/steelPersonaOffline.js');
for (const lang of ['pt', 'en']) {
  setLang(lang);
  for (let i = 0; i < 60; i++) { const o = persona.opener(i % 2 === 0); ok(/[.!?]$/.test(o), `[${lang}] opener() devolve frase completa`, o); }
}

// ---------- 4. Motor offline com o Guia real ----------
console.log('# 4. Motor offline (Guia real, pt e en)');
const eng = await load('/src/lib/ai/localEngine.js');
// frase que acaba numa palavra que não pode terminar frase ("…os avisos da.") = palavras cortadas/em falta
const DANGLING = /(?<![\p{L}])(da|de|do|das|dos|na|no|nas|nos|em|ao|aos|à|às|com|para|pela|pelo|por|sem|entre|um|uma|the|of|and|an)\.(\s|$)/iu;
const Q = {
  pt: ['olá', 'quem és tu?', 'obrigado', 'conta uma piada', 'estou cansado', 'Como construir abrigo tático?', 'Armadilha de mola para coelho', 'Fazer fogo por fricção', 'Purificar água sem ferramentas', 'Torniquete de emergência',
    'Orientar-me em Braga sem bússola', 'Plantas comestíveis do Minho', 'Alimentos de alto rendimento', 'como faço sinais de socorro com um espelho de dia', 'o que devo saber sobre comunicação de emergência e o rádio',
    'qual a distância mínima de árvores mortas para montar o abrigo', 'sinais de hipotermia', 'como tratar uma queimadura', 'fala-me de pederneira', 'Saber mais sobre: Guia SteelDeck · Abrigos Táticos e Engenharia de Campanha',
    'como fazer um foguetão para ir à lua', 'e o outro lá do texto tal'],
  en: ['hello', 'who are you?', 'thanks', 'tell me a joke', "I'm tired", 'How do I build a tactical shelter?', 'Spring snare for a rabbit', 'Making fire by friction', 'Purifying water without tools', 'Emergency tourniquet',
    'Finding my way without a compass', 'Edible plants of the Minho region', 'signs of hypothermia', 'how to stop bleeding on a leg', 'Learn more about: Guia SteelDeck · Abrigos Táticos e Engenharia de Campanha',
    'how to build a rocket to the moon'],
};
const samples = {};
for (const lang of ['pt', 'en']) {
  setLang(lang);
  for (const reason of ['offline', 'nokey']) {
    for (const q of Q[lang]) {
      const r = await eng.answerLocally(q, { reason });
      const text = tq.finalizeAnswer(r.text, { lang });
      if (reason === 'offline') samples[`${lang}: ${q}`] = text;
      const issues = tq.checkText(text, { lang });
      const dangling = text.split('\n').filter((l) => !/^\s*>/.test(l) || lang === 'pt').join('\n').match(DANGLING) || (lang === 'en' && text.match(DANGLING));
      ok(!issues.length, `[${lang}/${reason}] "${q}"`, `${issues.join(', ')}\n     ${text.slice(0, 300).replace(/\n/g, ' ⏎ ')}`);
      ok(!dangling, `[${lang}/${reason}] "${q}" sem frases cortadas`, dangling && `…${text.slice(Math.max(0, dangling.index - 60), dangling.index + 8)}`);
      ok(r.text === tq.tidy(r.text), `[${lang}/${reason}] "${q}" sem espaços/pontuação a corrigir`, r.text.slice(0, 200));
      if (lang === 'en') ok(!(r.followups || []).some((f) => /^(Fala-me|Saber mais|Continua|Resume isso|Conta outra)/.test(f)), `[en/${reason}] "${q}" sugestões em inglês`, (r.followups || []).join(' | '));
      else ok(!(r.followups || []).some((f) => /^(Tell me|Learn more|Continue|Summarize)/.test(f)), `[pt/${reason}] "${q}" sugestões em português`, (r.followups || []).join(' | '));
    }
  }
}
// O Guia inteiro: nenhuma frase extraída pode acabar numa preposição/artigo (palavra seguinte perdida)
setLang('pt');
const allSentences = pages.map((p) => persona.cleanNoise(p)).join('\n');
const broken = allSentences.split('\n').filter((l) => /(?<![\p{L}])(da|de|do|das|dos|na|no|em|ao|com|para|pela|pelo|por|um|uma)\s*$/u.test(l.trim()) && l.trim().split(/\s+/).length > 3);
ok(broken.length === 0, 'cleanNoise junta linhas partidas a meio da frase no Guia', broken.slice(0, 5).join(' | '));

// ---------- 5. Prompt da IA online ----------
console.log('# 5. Prompt da IA online');
setLang('pt');
let { system } = await svc.buildSystem('como purificar água?');
ok(/português europeu \(pt-PT\)/.test(system) && /nunca omitas artigos/.test(system), 'prompt pt: regras de pt-PT e de frases completas');
ok(!/US English/.test(system), 'prompt pt: sem regras de inglês');
ok(system.lastIndexOf('IDIOMA E QUALIDADE') > system.lastIndexOf('CONTEXTO DA APLICAÇÃO'), 'prompt pt: regras de idioma no fim (prevalecem)');
setLang('en');
({ system } = await svc.buildSystem('how to purify water?'));
ok(/US English/.test(system) && /never drop articles/.test(system), 'prompt en: regras de inglês e de frases completas');
ok(!/Responde em português de Portugal/.test(system), 'prompt en: já não obriga a responder em português');
ok(/Based on the file/.test(system), 'prompt en: fórmula de fonte em inglês');
const mode = await load('/src/lib/ai/mode.js');
mode.setAiMode('tatico');
({ system } = await svc.buildSystem('how to purify water?'));
ok(/TACTICAL MODE/.test(system), 'prompt en: modo tático');
mode.setAiMode('completa');

await server.close();
if (process.argv.includes('--amostras')) for (const [k, v] of Object.entries(samples)) console.log(`\n===== ${k}\n${v}`);
console.log(`\n${pass} verificações OK, ${fail} com erro.`);
process.exit(fail ? 1 : 0);
