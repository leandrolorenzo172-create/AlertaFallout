// Ferramentas rápidas da aba ECONOMIA (menu ≡): estado partilhado entre o menu (HotBar) e a página (EconomyTab).
import { useSyncExternalStore } from 'react';

// Temas das notícias (classificação pelas palavras do título e do resumo, sem acentos)
export const ECO_THEMES = [
  { id: 'mercados', label: 'Mercados', re: /\b(bolsas?|acoes|accoes|indices?|s&p|nasdaq|dow jones|wall street|euro stoxx|psi|cotac\w+|forex|cambio|dolar|cripto\w*|bitcoin|ethereum|ouro|prata|futuros|etfs?|obrigac\w+|investidores?)\b/ },
  { id: 'estado', label: 'Orçamento/Estado', re: /\b(orcamento|oe20\d\d|governo|estado|impostos?|irs|iva|irc|defice|divida publica|fiscal|finanças publicas|ministro das financas|parlamento)\b/ },
  { id: 'energia', label: 'Energia', re: /\b(petroleo|brent|gas natural|gas|energia|eletricidade|combustive\w+|gasolina|gasoleo|opep|renovave\w+)\b/ },
  { id: 'inflacao', label: 'Inflação/Taxas', re: /\b(inflacao|precos?|bce|fed|reserva federal|juros|euribor|taxas? de juro|taxas? diretoras?|credito|habitacao|rendas?)\b/ },
  { id: 'empresas', label: 'Empresas', re: /\b(empresas?|lucros?|resultados|receitas|vendas|despedimentos?|layoff|aquisic\w+|fusao|ceo|administrac\w+|insolvenc\w+|falencias?)\b/ },
];
const CRITICAL = /\b(urgente|ultima hora|crash|colapso|afundam?|derrocada|queda abrupta|quedas? acentuadas?|panico|crise financeira|recessao|falencia|insolvencia|resgate|incumprimento|bancarrota)\b/;
export const normTxt = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
export const themesOf = (a) => { const x = normTxt(`${a.title} ${a.summary || ''}`); return ECO_THEMES.filter((th) => th.re.test(x)).map((th) => th.id); };
// urgente = palavra crítica no título/resumo, ou notícia negativa (etiqueta já usada na página)
export const isUrgent = (a) => !!a.negative || CRITICAL.test(normTxt(`${a.title} ${a.summary || ''}`));
export const isCritical = (a) => CRITICAL.test(normTxt(`${a.title} ${a.summary || ''}`));

let state = { urgentOnly: false, theme: null, query: '', searchOpen: false, sub: null, urgentCount: 0, loading: false, lastSync: null, freeSlots: 6 };
const listeners = new Set();
const set = (patch) => { state = { ...state, ...patch }; listeners.forEach((l) => l()); };
export const getEconomy = () => state;
export const useEconomyTools = () => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, getEconomy);
export const reportEconomy = (patch) => { if (Object.keys(patch).some((k) => state[k] !== patch[k])) set(patch); };
export const toggleUrgent = () => set({ urgentOnly: !state.urgentOnly });
export const setEcoTheme = (theme) => set({ theme });
export const setEcoQuery = (query) => set({ query });
export const openEcoSearch = (open = true) => set({ searchOpen: open, ...(open ? {} : { query: '' }) });
export const toggleEcoSub = (sub) => set({ sub: state.sub === sub ? null : sub });
export const ecoFiltered = (s = state) => s.urgentOnly || !!s.theme || !!s.query.trim();

// Eventos para a página: atualizar tudo e abrir o formulário de novo ativo
const REFRESH = 'steeldeck:eco-refresh'; const ADD = 'steeldeck:eco-add';
export const onRefreshEconomy = () => window.dispatchEvent(new Event(REFRESH));
export const onEconomyRefresh = (fn) => { window.addEventListener(REFRESH, fn); return () => window.removeEventListener(REFRESH, fn); };
export const requestAddAsset = () => window.dispatchEvent(new Event(ADD));
export const onAddAssetRequest = (fn) => { window.addEventListener(ADD, fn); return () => window.removeEventListener(ADD, fn); };
