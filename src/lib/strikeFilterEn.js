// Validador de avisos de greve para notícias em inglês (Reino Unido, EUA). Mesma interface que strikeFilter.js
// e devolve os MESMOS nomes de setor (em português), para a app os traduzir como sempre. Sem dependências.
import { normText } from './strikeFilter.js';

const STRIKE = /\b(strikes?|striking|walk-?outs?|industrial action|stoppages?|picket(s|ing| lines?)?)\b/;
// sentidos que não são greves laborais
const NOT_STRIKE = /\b(hunger strikes?|air ?strikes?|drone strikes?|missile strikes?|military strikes?|pre-?emptive strikes?|first strike|strike (a|the|any) (deal|balance|chord|note|pose)|strikes? (back|gold|out|again)|lightning|strike force|striker|strikes? (hit|kill\w*|on (iran|gaza|ukraine|israel|syria|yemen))|tariff strike)\b/;
const SPORTS = /\b(football|soccer|premier league|champions league|goals?|nfl|nba|mlb|nhl|baseball|cricket|bowling|darts|tennis|golf|formula 1|world cup|super bowl)\b/;
const DIGEST = /\b(morning briefing|evening briefing|news (in brief|quiz)|what we know|the week in|newsletter|live updates?)\b/;
const OPINION = /\b(opinion|comment|editorial|letters?:|analysis:)\b/;
const CONCRETE = /\b(union|unions|members|ballot\w*|vote[sd]? (to|for)|announce\w*|planned|called|go(es|ing)? ahead|begin\w*|start\w*|continu\w*|suspend\w*|called off|cancel\w*|postpone\w*|disrupt\w*|walk out|today|tomorrow|this week|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2} (jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*|pay (dispute|offer|deal)|picket|rmt|aslef|unite|unison|gmb|bma|rcn|nhs|teamsters|uaw|sag-aftra|afl-cio|nurses|doctors|teachers|workers|staff)\b/;

export const STRIKE_SECTORS_EN = [
  [/\b(doctors?|nurses?|nhs|hospitals?|health\w*|bma|rcn|medics?|pharmac\w+|paramedics?|ambulances?)\b/, 'Saúde'],
  [/\b(teachers?|schools?|universit\w+|colleges?|lecturers?|education|neu|ucu)\b/, 'Educação'],
  [/\b(general strike|national strike)\b/, 'Greve geral'],
  [/\b(france|french|germany|german|spain|spanish|italy|italian|portugal|greece|belgium|india|argentina|brazil|korea|canada|australia|nigeria|south africa)\b/, 'Internacional'],
  [/\b(rail\w*|trains?|tube|underground|metro|bus(es)?|bus drivers?|train drivers?|rmt|aslef|airports?|airlines?|pilots?|cabin crew|baggage handlers?|ports?|docks?|dockworkers?|ferr(y|ies)|transport\w*|teamsters|freight|truckers?)\b/, 'Transportes'],
  [/\b(civil serv\w+|public sector|federal (workers|employees)|government (workers|employees)|pcs)\b/, 'Função pública'],
  [/\b(courts?|barristers?|lawyers?|probation|prisons?|justice)\b/, 'Justiça'],
  [/\b(police|firefighters?|fire brigade|fbu|security guards?)\b/, 'Segurança'],
  [/\b(bin (strike|workers|collection)|refuse|councils?|municipal|city workers)\b/, 'Autarquias'],
  [/\b(postal|royal mail|amazon|starbucks|factor(y|ies)|plants?|warehouses?|retail|banks?|automakers?|uaw|boeing|hollywood|actors|writers|sag-aftra|wga|hotels?)\b/, 'Privado'],
];

export function strikeSector(title, summary = '') {
  const t = normText(title); const all = `${t} ${normText(summary)}`;
  return (STRIKE_SECTORS_EN.find(([re]) => re.test(t)) || STRIKE_SECTORS_EN.find(([re]) => re.test(all)) || [null, 'Outros'])[1];
}

export function checkStrikeNotice(item) {
  const title = normText(item?.title);
  const summary = normText(item?.summary);
  if (!title) return { ok: false, reason: 'no title' };
  if (!STRIKE.test(title)) return { ok: false, reason: 'title is not about a strike' };
  if (NOT_STRIKE.test(title) || NOT_STRIKE.test(summary.slice(0, 160))) return { ok: false, reason: 'military/other meaning' };
  if (SPORTS.test(title)) return { ok: false, reason: 'sport' };
  if (DIGEST.test(title)) return { ok: false, reason: 'digest/live blog' };
  if (OPINION.test(title)) return { ok: false, reason: 'opinion' };
  if (!CONCRETE.test(title) && !CONCRETE.test(summary)) return { ok: false, reason: 'no concrete strike' };
  return { ok: true };
}
export const isValidStrikeNotice = (item) => checkStrikeNotice(item).ok;

// Dias da greve a partir do texto em inglês (normalizado, minúsculas). Devolve 'AAAA-MM-DD' (máx. 7).
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export function strikeDaysEn(text, pubTime) {
  const pub = new Date(pubTime); pub.setHours(12, 0, 0, 0);
  const at = (m, d) => { const x = new Date(pub.getFullYear(), m, d, 12); if (x - pub > 200 * 86400000) x.setFullYear(x.getFullYear() - 1); if (pub - x > 160 * 86400000) x.setFullYear(x.getFullYear() + 1); return x; };
  const plus = (n) => new Date(pub.getTime() + n * 86400000);
  const mon = MONTHS.map((m) => `${m.slice(0, 3)}(?:${m.slice(3)})?`).join('|');
  const mIdx = (s) => MONTHS.findIndex((m) => m.startsWith(s.slice(0, 3)));
  let days = []; let m;
  // "12-14 december" / "between 12 and 14 december" / "december 12-14"
  if ((m = text.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s*(?:-|–|to|and)\\s*(\\d{1,2})(?:st|nd|rd|th)?\\s+(${mon})\\b`)))) { const a = +m[1], b = +m[2], mo = mIdx(m[3]); if (b >= a && b - a < 7) for (let d = a; d <= b; d++) days.push(at(mo, d)); }
  if (!days.length && (m = text.match(new RegExp(`\\b(${mon})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s*(?:-|–|to|and)\\s*(\\d{1,2})\\b`)))) { const a = +m[2], b = +m[3], mo = mIdx(m[1]); if (b >= a && b - a < 7) for (let d = a; d <= b; d++) days.push(at(mo, d)); }
  // "12 december" / "december 12"
  if (!days.length && (m = text.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${mon})\\b`)))) days = [at(mIdx(m[2]), +m[1])];
  if (!days.length && (m = text.match(new RegExp(`\\b(${mon})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`)))) days = [at(mIdx(m[1]), +m[2])];
  if (!days.length && /\btomorrow\b/.test(text)) days = [plus(1)];
  if (!days.length && (m = text.match(/\b(?:this|next|on) (sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/))) { const w = WEEKDAYS.indexOf(m[1]); let n = (w - pub.getDay() + 7) % 7; if (/next/.test(m[0]) && n === 0) n = 7; days = [plus(n)]; }
  if (!days.length && /\b(today|under way|underway|begins|began|starts|started)\b/.test(text)) days = [pub];
  return [...new Set(days.filter((d) => d - pub > -2 * 86400000 && d - pub < 90 * 86400000).map(ymd))].sort();
}
export const CANCEL_EN = /\b(suspended|called off|cancell?ed|postponed|averted|scrapped|deal reached|agreement reached)\b/;
