// "Meus ativos": 6 espaços guardados no dispositivo (localStorage) e cotações.
// Cotação automática: criptoativos via CoinGecko (API pública, sem chave, permite pedidos do browser).
// Os outros ativos (ações, ETFs, obrigações, fundos…) não têm API pública gratuita que o browser possa ler;
// e as páginas do Investing.com não deixam ser lidas por outro site. Ficam com valor e variação manuais (editáveis).
export const CATEGORIES = [
  { id: 'capital', label: 'Capital Garantido e Dívida Pública', risk: 'Baixo', ex: 'Certificados de Aforro, Depósitos a Prazo, Bilhetes do Tesouro' },
  { id: 'obrigacoes', label: 'Obrigações', risk: 'Baixo a Médio', ex: 'Obrigações do Tesouro, obrigações empresariais' },
  { id: 'acoes', label: 'Ações', risk: 'Médio a Alto', ex: 'Apple, EDP, Galp, Microsoft' },
  { id: 'fundos', label: 'Fundos de Investimento e PPR', risk: 'Baixo a Alto', ex: 'Fundos mobiliários, Fundos PPR' },
  { id: 'etf', label: 'ETFs', risk: 'Médio a Alto', ex: 'S&P 500, MSCI World' },
  { id: 'imobiliario', label: 'Imobiliário e REITs', risk: 'Médio', ex: 'Imóveis para arrendamento, Fundos Imobiliários, REITs' },
  { id: 'cripto', label: 'Criptoativos', risk: 'Muito Alto', ex: 'Bitcoin BTC, Ethereum ETH, Solana SOL' },
  { id: 'materias', label: 'Matérias-Primas e Derivados', risk: 'Alto', ex: 'Ouro, Petróleo, Gás Natural, contratos futuros' },
];
export const catById = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

const KEY = 'sd_watchlist';
export const SLOTS = 6;
export function loadSlots() {
  try { const v = JSON.parse(localStorage.getItem(KEY)); if (Array.isArray(v)) return Array.from({ length: SLOTS }, (_, i) => v[i] || null); } catch { /* sem armazenamento */ }
  return Array(SLOTS).fill(null);
}
export function saveSlots(slots) { try { localStorage.setItem(KEY, JSON.stringify(slots)); } catch { /* sem armazenamento */ } }

// Moeda pelo nome ("BTC/USD", "… Euro") — por omissão EUR
export function currencyOf(name) {
  const n = String(name || '').toUpperCase();
  if (/\/USD\b|\bUSD\b|D[OÓ]LAR/.test(n)) return 'USD';
  if (/\/GBP\b|\bGBP\b|LIBRA/.test(n)) return 'GBP';
  return 'EUR';
}
// Símbolo cripto pelo nome: "BTC/USD - Bitcoin" -> "btc"; "Solana" -> "solana"
const COIN_IDS = { btc: 'bitcoin', bitcoin: 'bitcoin', eth: 'ethereum', ethereum: 'ethereum', sol: 'solana', solana: 'solana', xrp: 'ripple', ada: 'cardano', doge: 'dogecoin', bnb: 'binancecoin', dot: 'polkadot', ltc: 'litecoin', usdt: 'tether', usdc: 'usd-coin', avax: 'avalanche-2', link: 'chainlink', trx: 'tron' };
async function coinId(name) {
  const words = String(name || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  for (const w of words) if (COIN_IDS[w]) return COIN_IDS[w];
  const q = words[0]; if (!q) return null;
  try {
    const r = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`, { signal: AbortSignal.timeout(8000) });
    const j = await r.json(); return j.coins?.[0]?.id || null;
  } catch { return null; }
}
// Devolve { price, change, pct, at, auto: true } ou null (sem cotação automática)
export async function fetchQuote(asset) {
  if (asset.category !== 'cripto') return null;
  const id = asset.coinId || await coinId(asset.name);
  if (!id) return null;
  const cur = currencyOf(asset.name).toLowerCase();
  const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=${cur}&include_24hr_change=true`, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const j = (await r.json())[id]; if (!j || j[cur] == null) return null;
  const price = j[cur]; const pct = j[`${cur}_24h_change`] ?? 0;
  return { coinId: id, price, pct, change: price - price / (1 + pct / 100), at: Date.now(), auto: true };
}
export const fmtNum = (v, d = 2) => (v == null || !Number.isFinite(Number(v)) ? '—' : Number(v).toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d }));
