// Localização para o tempo, os avisos e as notificações: segue o país e a posição detetados (src/geo/country.js).
// Em Portugal usa as cidades do IPMA (fornecedor oficial dos dados); noutros países, as coordenadas diretamente.
// A posição exata só serve para pedir o tempo e as rotas; nas notificações só vai o nome da cidade.
import { getSettings, setSettings, useSettings } from './theme';
import { getCountry, useCountry, detectCountry } from './geo/country';

// Cidades com previsão e avisos do IPMA (distrits-islands.json): id = globalIdLocal, area = distrito dos avisos
export const LOCATIONS = [
  { id: 1010500, name: 'Aveiro', area: 'AVR', lat: 40.6413, lon: -8.6535 },
  { id: 1020500, name: 'Beja', area: 'BJA', lat: 38.0200, lon: -7.8700 },
  { id: 1030300, name: 'Braga', area: 'BRG', lat: 41.5475, lon: -8.4227 },
  { id: 1030800, name: 'Guimarães', area: 'BRG', lat: 41.4434, lon: -8.2938 },
  { id: 1040200, name: 'Bragança', area: 'BGC', lat: 41.8076, lon: -6.7606 },
  { id: 1050200, name: 'Castelo Branco', area: 'CBO', lat: 39.8217, lon: -7.4957 },
  { id: 1060300, name: 'Coimbra', area: 'CBR', lat: 40.2081, lon: -8.4194 },
  { id: 1070500, name: 'Évora', area: 'EVR', lat: 38.5701, lon: -7.9104 },
  { id: 1080500, name: 'Faro', area: 'FAR', lat: 37.0146, lon: -7.9331 },
  { id: 1081505, name: 'Sagres', area: 'FAR', lat: 37.0168, lon: -8.9403 },
  { id: 1081100, name: 'Portimão', area: 'FAR', lat: 37.1500, lon: -8.5200 },
  { id: 1080800, name: 'Loulé', area: 'FAR', lat: 37.1397, lon: -8.0202 },
  { id: 1090700, name: 'Guarda', area: 'GDA', lat: 40.5379, lon: -7.2647 },
  { id: 1090821, name: 'Penhas Douradas', area: 'GDA', lat: 40.4075, lon: -7.5665 },
  { id: 1100900, name: 'Leiria', area: 'LRA', lat: 39.7473, lon: -8.8069 },
  { id: 1110600, name: 'Lisboa', area: 'LSB', lat: 38.7660, lon: -9.1286 },
  { id: 1121400, name: 'Portalegre', area: 'PTG', lat: 39.2900, lon: -7.4200 },
  { id: 1131200, name: 'Porto', area: 'PTO', lat: 41.1580, lon: -8.6294 },
  { id: 1141600, name: 'Santarém', area: 'STM', lat: 39.2000, lon: -8.7400 },
  { id: 1151200, name: 'Setúbal', area: 'STB', lat: 38.5246, lon: -8.8856 },
  { id: 1151300, name: 'Sines', area: 'STB', lat: 37.9560, lon: -8.8643 },
  { id: 1160900, name: 'Viana do Castelo', area: 'VCT', lat: 41.6952, lon: -8.8365 },
  { id: 1171400, name: 'Vila Real', area: 'VRL', lat: 41.3053, lon: -7.7440 },
  { id: 1182300, name: 'Viseu', area: 'VIS', lat: 40.6585, lon: -7.9120 },
  { id: 2310300, name: 'Funchal', area: 'MCS', lat: 32.6485, lon: -16.9084 },
  { id: 2320100, name: 'Porto Santo', area: 'MPS', lat: 33.0700, lon: -16.3400 },
  { id: 3410100, name: 'Vila do Porto', area: 'AOR', lat: 36.9563, lon: -25.1409 },
  { id: 3420300, name: 'Ponta Delgada', area: 'AOR', lat: 37.7415, lon: -25.6677 },
  { id: 3430100, name: 'Angra do Heroísmo', area: 'ACE', lat: 38.6700, lon: -27.2200 },
  { id: 3440100, name: 'Santa Cruz da Graciosa', area: 'ACE', lat: 39.0800, lon: -28.0000 },
  { id: 3450200, name: 'Velas', area: 'ACE', lat: 38.6842, lon: -28.2133 },
  { id: 3460200, name: 'Madalena', area: 'ACE', lat: 38.5325, lon: -28.5237 },
  { id: 3470100, name: 'Horta', area: 'ACE', lat: 38.5363, lon: -28.6315 },
  { id: 3480200, name: 'Santa Cruz das Flores', area: 'AOC', lat: 39.4500, lon: -31.1300 },
  { id: 3490100, name: 'Vila do Corvo', area: 'AOC', lat: 39.6700, lon: -31.1200 },
];
// Cidades IPMA: são o fornecedor de dados de Portugal (previsão e avisos por distrito), não o país por omissão.
const dist = (a, b, c, d) => { const r = Math.PI / 180; const x = (d - b) * r * Math.cos(((a + c) / 2) * r); const y = (c - a) * r; return Math.sqrt(x * x + y * y); };
export const nearest = (lat, lon) => LOCATIONS.reduce((best, l) => (dist(lat, lon, l.lat, l.lon) < dist(lat, lon, best.lat, best.lon) ? l : best), LOCATIONS[0]);

/**
 * Local do utilizador para o tempo, avisos e notificações, sempre derivado do país detetado (src/geo/country.js).
 * @typedef {{ key: string, country: string|null, name: string, lat: number|null, lon: number|null,
 *   exact: boolean, source: string|null, id: number|null, area: string|null, ready: boolean }} UserLoc
 * - id/area: cidade e distrito IPMA (só em Portugal), para a previsão e os avisos oficiais
 * - lat/lon: posição exata do GPS, ou a cidade do IP; null quando só se sabe o país pelo idioma
 * Em Portugal, a cidade escolhida à mão nas Definições (ou no menu ≡ da Meteo) tem prioridade.
 * @returns {UserLoc}
 */
function buildLoc(c, s) {
  if (c.status !== 'ready' || !c.code) return { key: 'loading', country: null, name: '', lat: null, lon: null, exact: false, source: null, id: null, area: null, ready: false };
  if (c.code === 'PT') {
    const manual = s.loc?.mode === 'manual' ? LOCATIONS.find((l) => l.id === s.loc.id) : null;
    if (manual) return { key: `PT:${manual.id}`, country: 'PT', name: manual.name, lat: manual.lat, lon: manual.lon, exact: false, source: 'manual', id: manual.id, area: manual.area, ready: true };
    if (c.lat != null) {
      const n = nearest(c.lat, c.lon);
      return { key: `PT:${c.lat.toFixed(2)},${c.lon.toFixed(2)}`, country: 'PT', name: c.city || n.name, lat: c.lat, lon: c.lon, exact: c.source === 'gps', source: c.source, id: n.id, area: n.area, ready: true };
    }
  }
  return { key: `${c.code}:${c.lat != null ? `${c.lat.toFixed(2)},${c.lon.toFixed(2)}` : 'x'}`, country: c.code, name: c.city || c.name || c.code, lat: c.lat, lon: c.lon, exact: c.source === 'gps', source: c.source, id: null, area: null, ready: true };
}
export const getLoc = () => buildLoc(getCountry(), getSettings());
export function useLoc() { const s = useSettings(); const c = useCountry(); return buildLoc(c, s); }
export const locMode = () => getSettings().loc?.mode || 'auto'; // 'auto' (país/posição detetados) | 'manual' (cidade IPMA escolhida)

export function setLocManual(id) { const l = LOCATIONS.find((x) => x.id === Number(id)); if (l) setSettings({ loc: { mode: 'manual', id: l.id } }); }
export const setLocAuto = () => setSettings({ loc: { mode: 'auto' } });

// "Usar a minha localização": pede o GPS (autorização nasce do toque) e volta ao modo automático
export async function detectLocation() {
  setLocAuto();
  const c = await detectCountry({ askGps: true });
  if (c.source !== 'gps') throw new Error(c.permission === 'denied' ? 'denied' : 'unavailable');
  return getLoc();
}
export const refreshAutoLocation = () => detectCountry();
