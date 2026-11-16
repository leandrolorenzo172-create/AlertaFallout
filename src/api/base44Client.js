// Substituto local do cliente Base44.
// - Dados (ficheiros, definições): guardados no browser (localStorage).
// - IA (InvokeLLM, askMestre): usa o Claude quando a app corre como artefacto no claude.ai.
// - Rádio: API pública radio-browser.info (só funciona fora do artefacto).
import { SYSTEM_IDENTITY } from '@/data/survivalKnowledge';
import { fetchWeather, fetchCatastrophes, fetchWarNews, fetchDashboard, fetchPizza } from './liveData';

export const IS_ARTIFACT = typeof window !== 'undefined' && !!window.claude?.use;

let samplePromise;
function getSample() {
  if (!samplePromise) {
    samplePromise = window.claude?.use ? window.claude.use('sample').catch(() => null) : Promise.resolve(null);
  }
  return samplePromise;
}

const SIM_PREAMBLE = `CONTEXTO: és o motor de uma app de demonstração com tema de terminal de sobrevivência. NÃO tens acesso à internet nem a dados em tempo real. Gera um cenário de SIMULAÇÃO plausível mas fictício, em português de Portugal. Em qualquer campo de fonte (por exemplo "source") escreve exatamente "SIMULAÇÃO". Não atribuas nada a órgãos de comunicação, entidades oficiais ou pessoas reais.\n\nPEDIDO:\n`;

function store(name) {
  const key = `b44_${name}`;
  const read = () => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } };
  const write = (rows) => { try { localStorage.setItem(key, JSON.stringify(rows)); } catch { /* sem armazenamento */ } };
  return {
    async list(opts = {}) {
      let rows = read();
      if (opts.sort === '-created_date') rows = rows.slice().sort((a, b) => (b.created_date || '').localeCompare(a.created_date || ''));
      return opts.limit ? rows.slice(0, opts.limit) : rows;
    },
    async create(data) {
      const now = new Date().toISOString();
      const row = { ...data, id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, created_date: now, updated_date: now };
      write([...read(), row]);
      return row;
    },
    async update(id, data) {
      const rows = read().map((r) => (r.id === id ? { ...r, ...data, updated_date: new Date().toISOString() } : r));
      write(rows);
      return rows.find((r) => r.id === id);
    },
    async delete(id) {
      write(read().filter((r) => r.id !== id));
    },
  };
}

const entities = {
  KnowledgeFile: store('KnowledgeFile'),
  NotificationSettings: store('NotificationSettings'),
  User: { async delete() { throw new Error('Sem contas nesta versão'); } },
};

async function invokeLLM({ prompt, add_context_from_internet, response_json_schema }) {
  // Fora do claude.ai: dados reais de fontes públicas, escolhidos pelo formato que o separador pede
  if (!IS_ARTIFACT) {
    const props = response_json_schema?.properties || {};
    if (props.cities) return fetchWeather();
    if (props.war_risk) return fetchDashboard();
    if (props.current_level) return fetchPizza();
    if (props.articles) return /cat[aá]strofes/i.test(prompt) ? fetchCatastrophes() : fetchWarNews();
    throw new Error('IA indisponível neste ambiente');
  }
  const sample = await getSample();
  if (!sample) throw new Error('IA indisponível neste ambiente');
  let input = (add_context_from_internet ? SIM_PREAMBLE : '') + prompt;
  if (response_json_schema) {
    input += `\n\nResponde APENAS com um objeto JSON válido (sem texto antes ou depois) que respeite este JSON Schema:\n${JSON.stringify(response_json_schema)}`;
    return sample.json(input, { modelTier: 'quick' });
  }
  return (await sample(input, { modelTier: 'quick' })).text;
}

async function askMestre({ question }) {
  const sample = await getSample();
  if (!sample) throw new Error('IA indisponível');
  const files = (await entities.KnowledgeFile.list({ sort: '-created_date', limit: 30 }))
    .filter((f) => f.enabled !== false && f.extracted_text);
  let budget = 40000;
  const used = [];
  let filesText = '';
  for (const f of files) {
    if (budget <= 0) break;
    const t = f.extracted_text.slice(0, budget);
    budget -= t.length;
    filesText += `\n\n### Ficheiro: ${f.name}\n${t}`;
    used.push(f.name);
  }
  const rules = `Assume esta identidade e responde sempre em português de Portugal, de forma prática, direta e segura:\n${SYSTEM_IDENTITY}\n\nSe os ficheiros do utilizador abaixo forem relevantes, usa-os e diz de que ficheiro veio a informação.${filesText ? `\n\nFICHEIROS DO UTILIZADOR:${filesText}` : ''}`;
  const { text } = await sample(
    [{ role: 'user', content: rules }, { role: 'assistant', content: 'Entendido. Pronto.' }, { role: 'user', content: question }],
    { cache: false },
  );
  return { data: { answer: text, filesUsed: used } };
}

// Mesma lógica da função de backend functions/radioStations.js, mas a correr no browser
// (sem verificação de utilizador, porque esta versão não tem contas).
async function radioStations({ search, limit }) {
  const term = (search || '').toString().trim();
  const max = Math.min(Number(limit) || 60, 100);
  const params = new URLSearchParams({ countrycode: 'PT', hidebroken: 'true', order: 'clickcount', reverse: 'true', limit: String(max) });
  if (term) params.set('name', term);
  const res = await fetch(`https://de1.api.radio-browser.info/json/stations/search?${params.toString()}`, {
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error('Serviço de rádio indisponível');
  const data = await res.json();
  // Numa página https o browser recusa streams http, por isso ficam de fora
  const httpsOnly = window.location.protocol === 'https:';
  const stations = (Array.isArray(data) ? data : [])
    .map((s) => ({
      id: s.stationuuid,
      name: (s.name || '').trim(),
      url: s.url_resolved || s.url,
      favicon: s.favicon || '',
      tags: s.tags || '',
      bitrate: s.bitrate || 0,
      codec: s.codec || '',
      homepage: s.homepage || '',
    }))
    .filter((s) => s.url && s.name && (!httpsOnly || s.url.startsWith('https')));
  return { data: { stations } };
}

export const base44 = {
  entities,
  auth: {
    async me() { throw new Error('Sem sessão'); },
    async logout() {},
  },
  integrations: {
    Core: {
      InvokeLLM: invokeLLM,
      async UploadPrivateFile({ file }) { return { file_uri: `local://${file.name}` }; },
    },
  },
  functions: {
    async invoke(name, payload) {
      if (name === 'askMestre') return askMestre(payload || {});
      if (name === 'radioStations') return radioStations(payload || {});
      throw new Error(`Função desconhecida: ${name}`);
    },
  },
};
