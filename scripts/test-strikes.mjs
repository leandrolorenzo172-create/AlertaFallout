// Testes do filtro de greves: node scripts/test-strikes.mjs [news.json]
import { readFileSync } from 'node:fs';
import { checkStrikeNotice, strikeSector } from '../src/lib/strikeFilter.js';

const cases = [
  // [título, resumo, deve passar?, setor esperado]
  ['00h. Autogolo garante vitória do FCP em casa do Feyenoord', 'Em direto: greve na CP, OE e futebol', false],
  ['A pedido da PSP, câmara fecha lojas e proíbe venda de garrafas junto a Parlamento', 'Medida antes da greve geral e manifestação', false],
  ['Pavilhão de Portugal na Bienal de Arte de Veneza recebeu mais de 15 mil visitantes', 'Apesar da greve dos museus...', false],
  ['PCP e BE contra OE2027 ao lado da CGTP-IN', 'Partidos apoiam a greve', false],
  ['A greve à sexta-feira deve ser elevada a património nacional', 'Crónica', false],
  ['"Já tivemos mais greves e manifestações até do que no tempo da Troika"', '', false],
  ['Da votação do OE à greve de vários setores: estas são "as 5 notícias"', '', false],
  ['Greve de fome de ativista chega ao 10.º dia', '', false],
  ['Maquinistas da CP em greve total mas com serviços mínimos', '', true, 'Transportes'],
  ['13h. Greve CP. Empresa dá conta de 70% de comboios suprimidos', '', true, 'Transportes'],
  ['Adesão à greve dos maquinistas da CP é total, diz sindicato', 'Sindicatos da saúde também em greve', true, 'Transportes'],
  ['Trabalhadores da Caixa convocam greve para 18 de dezembro', '', true, 'Privado'],
  ['Greve dos médicos com adesão de 75% a nível nacional, diz FNAM', '', true, 'Saúde'],
  ['Suspensa greve dos tripulantes de cabine da Azores Airlines', '', true, 'Transportes'],
  ['Greve geral em Itália com adesão de 60%', '', true, 'Greve geral'],
];
let fail = 0;
for (const [title, summary, want, sector] of cases) {
  const r = checkStrikeNotice({ title, summary });
  const sec = r.ok ? strikeSector(title.replace(/^\s*\d{1,2}h\S*\s*/, ''), summary) : '';
  const okCase = r.ok === want && (!sector || sec === sector);
  if (!okCase) fail++;
  console.log(`${okCase ? 'OK ' : 'ERRO'} ${want ? 'aceita ' : 'rejeita'} | ${title.slice(0, 70)}${r.ok ? ` → ${sec}` : ` (${r.reason})`}`);
}
const file = process.argv[2];
if (file) {
  const items = JSON.parse(readFileSync(file, 'utf8')).strikes.items;
  const bad = items.filter((x) => !checkStrikeNotice(x).ok);
  console.log(`\nNo news.json publicado: ${items.length} itens, ${bad.length} rejeitados pelo filtro novo:`);
  for (const x of bad) console.log(`  - [${x.sector}] ${x.title.slice(0, 90)} (${checkStrikeNotice(x).reason})`);
}
console.log(fail ? `\n${fail} caso(s) falharam` : '\nTodos os casos passaram');
process.exit(fail ? 1 : 0);
