// Dados reais de fontes públicas, usados quando a app corre fora do claude.ai.
// - Meteorologia e avisos: IPMA (api.ipma.pt). Previsão a 15 dias: Open-Meteo, com o IPMA (5 dias) como reserva.
// - Catástrofes: GDACS (alertas laranja/vermelho) e USGS (sismos).
// - Notícias: data/news.json, gerado pelo GitHub Actions a partir de feeds de jornais (scripts/fetch-news.mjs).
// Cada função devolve os dados no formato que o separador respetivo já esperava.

const IPMA = 'https://api.ipma.pt/open-data/';

async function getJson(url, ms = 15000) {
  const res = await fetch(url, { signal: AbortSignal.timeout(ms) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
const num = (v) => { const n = Number(v); return Number.isFinite(n) && n > -90 ? n : null; };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const round1 = (v) => Math.round(v * 10) / 10;

// ---------------- Meteorologia (IPMA) ----------------
const CITIES = [
  { name: 'Lisboa', id: 1110600, station: '1200535' },
  { name: 'Porto', id: 1131200, station: '1200545' },
  { name: 'Braga', id: 1030300, station: '1210622' },
  { name: 'Coimbra', id: 1060300, station: '1200548' },
  { name: 'Faro', id: 1080500, station: '1200554' },
  { name: 'Évora', id: 1070500, station: '1200558' },
];
const WIND_DIR_ID = { 1: 'N', 2: 'NE', 3: 'E', 4: 'SE', 5: 'S', 6: 'SW', 7: 'W', 8: 'NW', 9: 'N' };
const WIND_CLASS_KMH = { 1: 10, 2: 25, 3: 45, 4: 65 }; // fraco, moderado, forte, muito forte
const AREAS = {
  AVR: 'Aveiro', BJA: 'Beja', BRG: 'Braga', BGC: 'Bragança', CBO: 'Castelo Branco', CBR: 'Coimbra', EVR: 'Évora', FAR: 'Faro',
  GDA: 'Guarda', LRA: 'Leiria', LSB: 'Lisboa', PTG: 'Portalegre', PTO: 'Porto', STM: 'Santarém', STB: 'Setúbal',
  VCT: 'Viana do Castelo', VRL: 'Vila Real', VIS: 'Viseu', MCN: 'Madeira (costa norte)', MCS: 'Madeira (costa sul)',
  MRM: 'Madeira (montanha)', MPS: 'Porto Santo', AOR: 'Açores (oriental)', ACE: 'Açores (central)', AOC: 'Açores (ocidental)',
};
const LEVEL_PT = { yellow: 'amarelo', orange: 'laranja', red: 'vermelho' };
const SEA_SPOTS = [
  { id: 1160926, name: 'Viana do Castelo (costa do Minho)' },
  { id: 1130826, name: 'Porto (costa norte)' },
  { id: 1060526, name: 'Figueira da Foz' },
  { id: 1111026, name: 'Lisboa' },
  { id: 1151326, name: 'Sines' },
  { id: 1081526, name: 'Sagres' },
  { id: 1080526, name: 'Faro' },
];
const WMO_PT = (c) => {
  if (c === 0) return 'Céu limpo';
  if (c <= 2) return 'Céu pouco nublado';
  if (c === 3) return 'Céu muito nublado';
  if (c <= 48) return 'Nevoeiro';
  if (c <= 57) return 'Chuvisco';
  if (c <= 67) return 'Chuva';
  if (c <= 77) return 'Neve';
  if (c <= 82) return 'Aguaceiros de chuva';
  if (c <= 86) return 'Aguaceiros de neve';
  return 'Trovoada com chuva';
};
const DEG_DIR = (d) => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(((d % 360) / 45)) % 8];
const dayName = (iso) => {
  const s = new Date(`${iso}T12:00:00`).toLocaleDateString('pt-PT', { weekday: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const shortDate = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });

export async function fetchWeather() {
  const safe = (p) => p.catch(() => null);
  const [types, obs, uv, warnings, sea, ...daily] = await Promise.all([
    safe(getJson(`${IPMA}weather-type-classe.json`)),
    safe(getJson(`${IPMA}observation/meteorology/stations/observations.json`, 25000)),
    safe(getJson(`${IPMA}forecast/meteorology/uv/uv.json`)),
    safe(getJson(`${IPMA}forecast/warnings/warnings_www.json`)),
    safe(getJson(`${IPMA}forecast/oceanography/daily/hp-daily-sea-forecast-day0.json`)),
    ...CITIES.map((c) => safe(getJson(`${IPMA}forecast/meteorology/cities/daily/${c.id}.json`))),
  ]);
  if (daily.every((d) => !d)) throw new Error('IPMA indisponível');

  const typeName = (id) => {
    const t = types?.data?.find((x) => x.idWeatherType === id);
    return t?.descWeatherTypePT || t?.descIdWeatherTypePT || '—';
  };
  const today = new Date().toISOString().slice(0, 10);
  const obsKeys = obs ? Object.keys(obs).sort() : [];
  // última observação disponível de cada estação (a mais recente pode ainda não ter todas)
  const lastObs = (station) => {
    for (let i = obsKeys.length - 1; i >= 0; i--) {
      const o = obs[obsKeys[i]]?.[station];
      if (o && num(o.temperatura) !== null) return o;
    }
    return null;
  };

  const cities = CITIES.map((c, i) => {
    const d = daily[i]?.data?.[0];
    const o = lastObs(c.station);
    const uvRow = (uv || []).filter((x) => x.globalIdLocal === c.id).sort((a, b) => a.data.localeCompare(b.data)).find((x) => x.data >= today);
    return {
      name: c.name,
      temp: o ? Math.round(num(o.temperatura)) : (d ? Math.round((Number(d.tMin) + Number(d.tMax)) / 2) : null),
      condition: d ? typeName(d.idWeatherType) : '—',
      humidity: o && num(o.humidade) !== null ? Math.round(num(o.humidade)) : '—',
      wind_kmh: o && num(o.intensidadeVentoKM) !== null ? Math.round(num(o.intensidadeVentoKM)) : (d ? WIND_CLASS_KMH[d.classWindSpeed] : '—'),
      wind_direction: (o && WIND_DIR_ID[o.idDireccVento]) || d?.predWindDir || '—',
      uv_index: uvRow ? Math.round(Number(uvRow.iUv)) : 0,
      min_temp: d ? Math.round(Number(d.tMin)) : null,
      max_temp: d ? Math.round(Number(d.tMax)) : null,
    };
  }).filter((c) => c.temp !== null);

  const now = Date.now();
  const active = (warnings || []).filter((w) => w.awarenessLevelID !== 'green' && new Date(w.endTime).getTime() > now);
  const rank = { red: 0, orange: 1, yellow: 2 };
  active.sort((a, b) => (rank[a.awarenessLevelID] - rank[b.awarenessLevelID]) || a.startTime.localeCompare(b.startTime));
  const fmt = (t) => new Date(t).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  // o mesmo aviso costuma repetir-se por vários distritos: junta-os numa só linha
  const groups = new Map();
  for (const w of active) {
    const key = `${w.awarenessLevelID}|${w.awarenessTypeName}|${w.text}|${w.startTime}|${w.endTime}`;
    if (!groups.has(key)) groups.set(key, { w, areas: [] });
    groups.get(key).areas.push(AREAS[w.idAreaAviso] || w.idAreaAviso);
  }
  const alerts = [...groups.values()].slice(0, 10).map(({ w, areas }) => ({
    city: areas.join(', '),
    alert_type: w.awarenessTypeName,
    severity: LEVEL_PT[w.awarenessLevelID] || w.awarenessLevelID,
    description: `${w.text || ''} (${fmt(w.startTime)} a ${fmt(w.endTime)})`.trim(),
  }));

  const bragaIpma = (daily[2]?.data || []).map((d) => ({
    date: shortDate(d.forecastDate),
    day_name: dayName(d.forecastDate),
    condition: typeName(d.idWeatherType),
    min_temp: Math.round(Number(d.tMin)),
    max_temp: Math.round(Number(d.tMax)),
    humidity: '—',
    wind_kmh: WIND_CLASS_KMH[d.classWindSpeed] ?? '—',
    wind_direction: d.predWindDir,
    uv_index: 0,
    precipitation_prob: Math.round(Number(d.precipitaProb)),
  }));
  let braga15 = bragaIpma;
  try {
    const om = await getJson('https://api.open-meteo.com/v1/forecast?latitude=41.5475&longitude=-8.4227&timezone=Europe%2FLisbon&forecast_days=15&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant,uv_index_max,relative_humidity_2m_mean', 10000);
    const d = om.daily;
    if (d?.time?.length) {
      braga15 = d.time.map((t, i) => ({
        date: shortDate(t),
        day_name: dayName(t),
        condition: WMO_PT(d.weather_code[i]),
        min_temp: Math.round(d.temperature_2m_min[i]),
        max_temp: Math.round(d.temperature_2m_max[i]),
        humidity: d.relative_humidity_2m_mean?.[i] != null ? Math.round(d.relative_humidity_2m_mean[i]) : '—',
        wind_kmh: Math.round(d.wind_speed_10m_max[i]),
        wind_direction: DEG_DIR(d.wind_direction_10m_dominant[i]),
        uv_index: d.uv_index_max?.[i] != null ? Math.round(d.uv_index_max[i]) : 0,
        precipitation_prob: d.precipitation_probability_max?.[i] ?? 0,
      }));
    }
  } catch (e) { /* fica a previsão de 5 dias do IPMA */ }

  const seaWarn = (area) => active.find((w) => w.idAreaAviso === area && /mar[ií]tima/i.test(w.awarenessTypeName));
  const SEA_AREA = { 1160926: 'VCT', 1130826: 'PTO', 1060526: 'CBR', 1111026: 'LSB', 1151326: 'STB', 1081526: 'FAR', 1080526: 'FAR' };
  const sea_storms = SEA_SPOTS.map((s) => {
    const f = sea?.data?.find((x) => x.globalIdLocal === s.id);
    if (!f) return null;
    const h = Number(f.totalSeaMax);
    const w = seaWarn(SEA_AREA[s.id]);
    const sev = h >= 6 ? 'Muito forte' : h >= 4 ? 'Forte' : h >= 2.5 ? 'Moderada' : 'Fraca';
    return {
      region: s.name,
      wave_height_m: round1(h),
      wind_direction: f.predWaveDir,
      wind_intensity: `Período das ondas até ${f.wavePeriodMax} s`,
      severity: w ? `Aviso ${LEVEL_PT[w.awarenessLevelID]}` : sev,
      description: w ? w.text : `Ondulação de ${f.predWaveDir} com ${f.waveHighMin} a ${f.waveHighMax} m. Água a ${f.sstMax} °C.`,
      is_active: !!w || h >= 4,
    };
  }).filter(Boolean);

  return {
    alerts,
    cities,
    forecast_days: bragaIpma.slice(0, 5).map((d) => ({ day: `${d.day_name.slice(0, 3)} ${d.date}`, condition: d.condition, min_temp: d.min_temp, max_temp: d.max_temp })),
    braga_15day_forecast: braga15,
    sea_storms,
  };
}

// ---------------- Catástrofes (GDACS + USGS) ----------------
const GDACS_TYPE = { EQ: 'Sismo', TC: 'Ciclone tropical', FL: 'Cheias', VO: 'Erupção vulcânica', DR: 'Seca', WF: 'Incêndio florestal', TS: 'Tsunami' };

export async function fetchCatastrophes() {
  const [g, q] = await Promise.all([
    getJson('https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?alertlevel=orange;red', 20000).catch(() => null),
    getJson('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson', 20000).catch(() => null),
  ]);
  if (!g && !q) throw new Error('Fontes de catástrofes indisponíveis');
  const articles = [];
  const monthAgo = Date.now() - 10 * 86400000; // só eventos em curso ou dos últimos 10 dias
  const fmt = (t) => new Date(t).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });

  const events = (g?.features || []).map((f) => f.properties)
    .filter((p) => p.iscurrent === 'true' || new Date(p.todate).getTime() > monthAgo)
    .sort((a, b) => new Date(b.todate) - new Date(a.todate));
  for (const p of events.slice(0, 8)) {
    const red = /red/i.test(p.alertlevel);
    const kind = GDACS_TYPE[p.eventtype] || p.eventtype;
    articles.push({
      title: `${kind}: ${p.country || p.name}`,
      summary: `Alerta ${red ? 'vermelho' : 'laranja'} do GDACS. ${p.name}. ${p.severitydata?.severitytext || ''} De ${fmt(p.fromdate)} a ${fmt(p.todate)}.`.replace(/\s+/g, ' ').trim(),
      severity: red ? 9 : 7,
      region: p.country || 'Global',
      source: 'GDACS',
      url: p.url?.report,
      when: new Date(p.todate).getTime(),
    });
  }
  const quakes = (q?.features || []).map((f) => f.properties).filter((p) => p.mag >= 5.5).sort((a, b) => b.mag - a.mag).slice(0, 6);
  for (const p of quakes) {
    articles.push({
      title: `Sismo de magnitude ${p.mag.toFixed(1)}`,
      summary: `${p.place}. Registado em ${new Date(p.time).toLocaleString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}.${p.tsunami ? ' Possível tsunami.' : ''}`,
      severity: clamp(Math.round((p.mag - 5.5) * 2.4 + 5), 1, 10),
      region: (p.place || '').split(', ').pop() || 'Global',
      source: 'USGS',
      url: p.url,
      when: p.time,
    });
  }
  articles.sort((a, b) => b.severity - a.severity || b.when - a.when);
  return { articles: articles.slice(0, 12) };
}

// ---------------- Notícias (ficheiro gerado no GitHub Actions) ----------------
let newsCache = null;
async function fetchNewsFile() {
  if (newsCache && Date.now() - newsCache.at < 5 * 60000) return newsCache.data;
  const data = await getJson(`./data/news.json?t=${Math.floor(Date.now() / 300000)}`);
  newsCache = { at: Date.now(), data };
  return data;
}

export async function fetchWarNews() {
  const n = await fetchNewsFile().catch(() => null);
  if (!n) throw new Error('Notícias ainda não disponíveis. São recolhidas de hora a hora.');
  return { articles: (n.war || []).slice(0, 12) };
}

// ---------------- Painel e Índice Pizza (calculados a partir dos dados acima) ----------------
const scoreFromCount = (count, per10) => clamp(round1(1 + (count / per10) * 9), 1, 10);

export async function fetchDashboard() {
  const [n, cat] = await Promise.all([fetchNewsFile().catch(() => null), fetchCatastrophes().catch(() => null)]);
  if (!n && !cat) throw new Error('Sem fontes de dados disponíveis');
  const war = n?.war || [];
  const c = n?.counts || { total: 0, war: 0, prep: 0, econ: 0, cyber: 0 };
  const avgSev = war.length ? war.slice(0, 10).reduce((s, a) => s + a.severity, 0) / Math.min(10, war.length) : 1;
  const share = c.total ? c.war / c.total : 0; // parte das notícias que fala de conflitos
  const war_risk = n ? clamp(round1(avgSev * 0.6 + share * 20), 1, 10) : 0;
  const geopolitical_tension = n ? clamp(round1(1 + ((c.war + c.prep) / Math.max(1, c.total)) * 22), 1, 10) : 0;
  const cats = cat?.articles || [];
  const natural_disaster_risk = cat ? clamp(round1(cats.slice(0, 5).reduce((s, a) => s + a.severity, 0) / Math.max(1, Math.min(5, cats.length))), 1, 10) : 0;
  const economic_instability = n ? scoreFromCount(c.econ, Math.max(10, c.total * 0.12)) : 0;
  const cyber_risk = n ? scoreFromCount(c.cyber, Math.max(6, c.total * 0.05)) : 0;
  const global_threat_level = round1(war_risk * 0.35 + geopolitical_tension * 0.2 + natural_disaster_risk * 0.2 + economic_instability * 0.15 + cyber_risk * 0.1);
  const critical_events = [
    ...war.map((a) => ({ title: a.title, severity: a.severity, type: 'guerra', region: a.region })),
    ...cats.map((a) => ({ title: a.title, severity: a.severity, type: 'catástrofe', region: a.region })),
  ].sort((a, b) => b.severity - a.severity).slice(0, 5);
  const when = n?.generated ? new Date(n.generated).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : null;
  return {
    war_risk, geopolitical_tension, natural_disaster_risk, economic_instability, cyber_risk, global_threat_level, critical_events,
    summary: `Índices calculados automaticamente, não são uma avaliação oficial. ${n ? `Baseados em ${c.total} notícias de jornais portugueses (${c.war} sobre conflitos, ${c.econ} sobre economia, ${c.cyber} sobre ciberataques), recolhidas em ${when}` : 'Notícias indisponíveis'}${cat ? `, e em ${cats.length} alertas do GDACS e do USGS.` : '.'}`,
  };
}

export async function fetchPizza() {
  const n = await fetchNewsFile().catch(() => null);
  if (!n) throw new Error('Notícias ainda não disponíveis. São recolhidas de hora a hora.');
  const c = n.counts;
  const share = c.total ? (c.war + c.prep) / c.total : 0;
  const level = clamp(round1(1 + share * 24), 1, 10);
  const prev = (() => { try { return JSON.parse(localStorage.getItem('pizza_prev_level')); } catch { return null; } })();
  try { localStorage.setItem('pizza_prev_level', JSON.stringify(level)); } catch { /* sem armazenamento */ }
  const trend = prev == null || Math.abs(level - prev) < 0.3 ? 'estavel' : level > prev ? 'subindo' : 'descendo';
  return {
    current_level: level,
    trend,
    explanation: 'O "Índice Pizza" é um indicador informal: a ideia é que muitas entregas de pizza à noite junto ao Pentágono sugerem que há gente a trabalhar até tarde numa crise. Não existem dados públicos fiáveis dessas entregas. Aqui o nível é uma estimativa calculada a partir da proporção de notícias sobre conflitos e atividade militar nos jornais portugueses.',
    current_indicators: [
      `${c.war} de ${c.total} notícias recentes falam de guerra ou ataques`,
      `${c.prep} notícias falam de preparação militar, armamento ou sanções`,
      ...(n.war || []).slice(0, 3).map((a) => `${a.source}: ${a.title}`),
    ],
    historical_events: [
      { event: 'Crise dos mísseis de Cuba', year: '1962', pizza_level: 9 },
      { event: 'Guerra do Golfo (Tempestade no Deserto)', year: '1991', pizza_level: 9 },
      { event: 'Ataques de 11 de setembro', year: '2001', pizza_level: 10 },
      { event: 'Invasão do Iraque', year: '2003', pizza_level: 9 },
      { event: 'Invasão da Ucrânia', year: '2022', pizza_level: 8 },
    ],
    citizen_meaning: level >= 7
      ? 'O volume de notícias sobre conflitos está muito alto. Vale a pena acompanhar fontes oficiais e ter o kit de emergência em dia.'
      : level >= 4
        ? 'Há várias notícias sobre conflitos, dentro do habitual dos últimos tempos. Mantém-te informado por fontes oficiais.'
        : 'Poucas notícias sobre conflitos neste momento.',
    recent_activity: `Os níveis históricos da tabela são ilustrativos, não são medições. Notícias recolhidas em ${new Date(n.generated).toLocaleString('pt-PT')}.`,
  };
}
