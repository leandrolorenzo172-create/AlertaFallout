// Ferramentas rápidas do botão flutuante ≡ (HotBar).
// O menu deixou de navegar entre separadores: mostra as ferramentas da aba ATIVA (ver toolMenus.js).
//
// Como funciona (barramento de eventos simples, sem dependências):
//   1. O HotBar chama runTool(tabId, actionId) quando o utilizador toca numa ferramenta.
//   2. Cada separador regista os seus handlers com o hook useQuickTools(tabId, { actionId: () => ... }).
//   3. Se nenhum separador tratar a ação, runTool devolve false e o HotBar aplica o comportamento por omissão
//      (ver DEFAULT_ACTIONS em HotBar.jsx) — assim uma ferramenta nunca fica "morta".
//
// Para ligar uma ferramenta nova à lógica da app: acrescenta o item em toolMenus.js e o handler no separador:
//   useQuickTools('mapa', { centrar: () => map.flyTo(...) });
//
// Os separadores também podem publicar estado para o menu (ex.: indicador vermelho de "Alertas ativos")
// com setToolBadge(tabId, actionId, true|false); o menu lê-o com useToolBadges().
import { useEffect, useRef, useSyncExternalStore } from 'react';

const EVENT = 'pb:quick-tool';

/**
 * Dispara uma ferramenta da aba indicada.
 * @returns {boolean} true se algum separador tratou a ação.
 */
export function runTool(tabId, actionId) {
  if (typeof window === 'undefined') return false;
  const detail = { tabId, actionId, handled: false };
  window.dispatchEvent(new CustomEvent(EVENT, { detail })); // síncrono: os listeners correm já aqui
  return detail.handled;
}

/**
 * Regista os handlers das ferramentas de um separador enquanto ele estiver montado.
 * handlers: { [actionId]: () => void }. Pode mudar a cada render (fica sempre a versão mais recente).
 */
export function useQuickTools(tabId, handlers) {
  const ref = useRef(handlers);
  ref.current = handlers;
  useEffect(() => {
    const on = (e) => {
      const { tabId: tab, actionId } = e.detail || {};
      if (tab !== tabId) return;
      const fn = ref.current && ref.current[actionId];
      if (typeof fn !== 'function') return;
      e.detail.handled = true;
      try { fn(); } catch (err) { console.error(`Ferramenta ${tabId}/${actionId}:`, err); } // eslint-disable-line no-console
    };
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, [tabId]);
}

// ---------- Indicadores (badges) publicados pelos separadores ----------
let badges = {};
const listeners = new Set();
export function setToolBadge(tabId, actionId, on) {
  const key = `${tabId}:${actionId}`;
  if (!!badges[key] === !!on) return;
  badges = { ...badges, [key]: !!on };
  listeners.forEach((l) => l());
}
export const hasToolBadge = (state, tabId, actionId) => !!state[`${tabId}:${actionId}`];
export function useToolBadges() {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => badges, () => badges);
}

// ---------- Aviso curto (toast) por cima do botão ≡: confirmação de ações sem ecrã próprio ----------
let toast = null; let toastTimer = null;
const toastListeners = new Set();
export function showToolToast(text, ms = 2200) {
  toast = text ? { text, id: Date.now() } : null;
  clearTimeout(toastTimer);
  if (text) toastTimer = setTimeout(() => { toast = null; toastListeners.forEach((l) => l()); }, ms);
  toastListeners.forEach((l) => l());
}
export function useToolToast() {
  return useSyncExternalStore((l) => { toastListeners.add(l); return () => toastListeners.delete(l); }, () => toast, () => toast);
}
