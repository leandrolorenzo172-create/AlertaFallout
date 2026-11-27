// Classificação de notícias de cibersegurança e cálculo do Risco Cibernético (0–100).
// Sem dependências: usado pelo recolhedor de notícias (scripts/fetch-news.mjs) e pela app (aba Ciberataques e Painel).

export const CYBER_SOURCES = [
  { name: 'BleepingComputer', domain: 'bleepingcomputer.com', url: 'https://www.bleepingcomputer.com/feed/', group: 'int' },
  { name: 'The Hacker News', domain: 'thehackernews.com', url: 'https://feeds.feedburner.com/TheHackersNews', group: 'int' },
  { name: 'Krebs on Security', domain: 'krebsonsecurity.com', url: 'https://krebsonsecurity.com/feed/', group: 'int' },
  { name: 'Dark Reading', domain: 'darkreading.com', url: 'https://www.darkreading.com/rss.xml', group: 'int' },
  { name: 'The Record', domain: 'therecord.media', url: 'https://therecord.media/feed', group: 'int' },
  { name: 'SecurityWeek', domain: 'securityweek.com', url: 'https://www.securityweek.com/feed/', group: 'int' },
  { name: 'IT Security', domain: 'itsecurity.pt', url: 'https://www.itsecurity.pt/feed/', group: 'pt' },
  { name: 'SAPO Tek', domain: 'tek.sapo.pt', url: 'https://tek.sapo.pt/rss', group: 'pt', filter: true }, // tecnologia geral: só entram notícias de segurança
  { name: 'CNCS', domain: 'cncs.gov.pt', url: 'https://www.cncs.gov.pt/pt/rss/', group: 'pt', official: true },
  { name: 'The Hack', domain: 'thehack.com.br', url: 'https://thehack.com.br/feed/', group: 'pt' },
  { name: 'CISO Advisor', domain: 'cisoadvisor.com.br', url: 'https://www.cisoadvisor.com.br/feed/', group: 'pt' },
  { name: 'CISA Alerts', domain: 'cisa.gov', url: 'https://www.cisa.gov/cybersecurity-advisories/all.xml', group: 'oficial', official: true },
  { name: 'CERT-EU', domain: 'cert.europa.eu', url: 'https://cert.europa.eu/publications/security-advisories-rss', group: 'oficial', official: true },
  { name: 'CERT-EU', domain: 'cert.europa.eu', url: 'https://cert.europa.eu/publications/threat-intelligence-rss', group: 'oficial', official: true },
];

export const THREAT_TYPES = [
  { id: 'ransomware', label: 'Ransomware', re: /\b(ransomware|ransom|lockbit|blackcat|alphv|akira|clop|cl0p|qilin|play ransomware|resgate digital|sequestro de dados|extors\w+)\b/ },
  { id: 'zeroday', label: 'Zero-Day', re: /\b(zero[- ]?day|0[- ]?day|actively exploited|exploited in the wild|under active exploitation|known exploited|kev|explorad[ao]s? ativamente|dia zero|cve-\d{4}-\d+)\b/ },
  { id: 'leak', label: 'Fuga de Dados', re: /\b(data breach|breach|leak\w*|exposed (data|records|database)|stolen data|data theft|fuga de dados|vazamento|vazad[ao]s?|violacao de dados|dados (expostos|roubados|pessoais))\b/ },
  { id: 'infra', label: 'Infraestrutura Crítica', re: /\b(critical infrastructure|ics|scada|ot security|power grid|utilit(y|ies)|water (utility|system|treatment)|pipeline|hospital|energy sector|infraestruturas? criticas?|rede eletrica|aguas|energia|portos?|aeroportos?)\b/ },
];
export const SEVERITIES = ['Crítico', 'Alto', 'Médio', 'Baixo'];
export const SECTORS = [
  ['Saúde', /\b(hospita\w+|health\w*|healthcare|medical|pharma\w*|saude|clinica)\b/],
  ['Finanças', /\b(bank\w*|banco\w*|financ\w+|fintech|crypto\w*|cripto\w*|payment|pagamentos?|insurance|seguradora)\b/],
  ['Governo', /\b(government|gov|federal|ministry|ministerio|municipio|camara|agency|agencia|military|militar|defen[cs]e|defesa|eleic\w+|election)\b/],
  ['Energia', /\b(energy|energia|oil|gas|petroleo|power|eletric\w+|electric\w*|nuclear|utility|utilities)\b/],
  ['Telecom', /\b(telecom\w*|telco|isp|operadora|5g|mobile carrier)\b/],
  ['Transportes', /\b(airline|airport|aeroporto|aviation|aviacao|railway|ferrovi\w+|shipping|maritim\w+|logistic\w+|transport\w*)\b/],
  ['Educação', /\b(universit\w+|school|escola|educa\w+|college)\b/],
  ['Retalho', /\b(retail\w*|retalho|e-?commerce|loja|store)\b/],
  ['Indústria', /\b(manufactur\w+|industr\w+|fabrica|factory|automotive|automovel)\b/],
  ['Tecnologia', /\b(microsoft|google|apple|cisco|fortinet|ivanti|vmware|oracle|linux|windows|android|ios|chrome|software|cloud|saas|github|npm|pypi|router|vpn|firewall)\b/],
];

const CRITICAL = /\b(critical|critica|zero[- ]?day|0[- ]?day|actively exploited|exploited in the wild|emergency directive|cvss (score )?(of )?(9|10)|9\.\d cvss|nation[- ]state|wiper|supply[- ]chain attack|worm|massive|mass exploitation|explorad[ao]s? ativamente|ataque massivo)\b/;
const HIGH = /\b(ransomware|breach|hacked|compromised|attack(ed|s)?|backdoor|malware|botnet|exploit\w*|stolen|leak\w*|ataque|invadid[ao]|comprometid[ao]|roubad[ao]s?|vazamento|fuga de dados|high[- ]severity|alta gravidade)\b/;
const LOW = /\b(how to|guide|tips|webinar|podcast|interview|opinion|review|report finds|survey|study|award|funding|raises \$|acquires|acquisition|hiring|ciso|conference|evento|entrevista|opiniao|estudo|inquerito|dicas|guia)\b/;
const SECURITY = /\b(seguranca|ciber\w*|cyber\w*|hacker\w*|ataque|malware|ransomware|phishing|vulnerabilidade\w*|falha de seguranca|fuga de dados|vazamento|dados pessoais|burla online|esquema|fraude)\b/;

export const normTxt = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
export const isSecurityNews = (text) => SECURITY.test(normTxt(text));

// Classifica uma notícia: tipos de ameaça, gravidade, setor e se vem de fonte oficial
export function classifyCyber({ title = '', summary = '', source = '', official = false }) {
  const x = normTxt(`${title} ${summary}`);
  const types = THREAT_TYPES.filter((tp) => tp.re.test(x)).map((tp) => tp.id);
  let severity = 'Médio';
  if (CRITICAL.test(x) || (official && types.includes('zeroday'))) severity = 'Crítico';
  else if (HIGH.test(x) || types.includes('ransomware') || types.includes('leak')) severity = 'Alto';
  else if (LOW.test(x)) severity = 'Baixo';
  if (severity === 'Médio' && official) severity = 'Alto'; // alerta oficial (CISA/CERT-EU/CNCS) nunca fica abaixo de Alto
  const sector = (SECTORS.find(([, re]) => re.test(x)) || ['Geral'])[0];
  return { types, severity, sector, official: !!official, source };
}

// ---------- Risco Cibernético (0–100) ----------
// Gravidade (0–60): cada ocorrência dos últimos 7 dias soma um peso (Crítico 10, Alto 6, Médio 3, Baixo 1),
//   ×1,5 se for alerta oficial (CISA, CERT-EU, CNCS) e ×0,5 se tiver mais de 24 h. G = 60 × (1 − e^(−soma/900)).
//   (uma semana típica da imprensa de cibersegurança soma ≈ 600 → G ≈ 30)
// Volume (0–40): 25 × min(1, ocorrências nas últimas 24 h ÷ 80) + 15 × min(1, ocorrências em 7 dias ÷ 400).
// Nível: 0–24 Baixo · 25–49 Moderado · 50–74 Elevado · 75–100 Crítico. No Painel aparece em 0–10 (pontuação ÷ 10).
export const SEV_WEIGHT = { 'Crítico': 10, Alto: 6, 'Médio': 3, Baixo: 1 };
export const RISK_LEVELS = [[75, 'Crítico'], [50, 'Elevado'], [25, 'Moderado'], [0, 'Baixo']];
export function computeCyberRisk(items, now = Date.now()) {
  const H24 = 24 * 3600e3; const D7 = 7 * 24 * 3600e3;
  const recent = (items || []).filter((a) => now - a.date <= D7);
  const last24 = recent.filter((a) => now - a.date <= H24);
  const sum = recent.reduce((s, a) => s + (SEV_WEIGHT[a.severity] || 3) * (a.official ? 1.5 : 1) * (now - a.date <= H24 ? 1 : 0.5), 0);
  const gravity = 60 * (1 - Math.exp(-sum / 900));
  const volume = 25 * Math.min(1, last24.length / 80) + 15 * Math.min(1, recent.length / 400);
  const score = Math.round(Math.min(100, gravity + volume));
  const level = RISK_LEVELS.find(([min]) => score >= min)[1];
  const critical = recent.filter((a) => a.severity === 'Crítico').length;
  return { score, level, gravity: Math.round(gravity), volume: Math.round(volume), n24: last24.length, n7: recent.length, critical, at: now };
}
