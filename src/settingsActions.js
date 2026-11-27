// Ferramentas rápidas das Definições (menu ≡ flutuante quando a aba ativa é DEFINIÇÕES).
// O menu (HotBar) não tem acesso ao estado dos cartões; por isso envia um evento e cada cartão
// (SettingsTab, NotificationsTab) reage com os seus próprios handlers — os mesmos dos botões.
const EVT = 'steeldeck:settings-action';

// Cartões com id fixo, para o scroll das ferramentas
export const CARD_IDS = { sobre: 'set-sobre', idioma: 'set-idioma', localizacao: 'set-localizacao', notificacoes: 'set-notificacoes' };

export function runSettingsAction(id) {
  window.dispatchEvent(new CustomEvent(EVT, { detail: { id } }));
}

export function onSettingsAction(handler) {
  const fn = (e) => handler(e.detail?.id);
  window.addEventListener(EVT, fn);
  return () => window.removeEventListener(EVT, fn);
}

// Scroll suave até ao cartão (centrado) e destaque breve com brilho âmbar
export function focusCard(id, { flash = true } = {}) {
  const el = document.getElementById(id);
  if (!el) return false;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  if (flash) {
    el.classList.remove('sd-flash');
    void el.offsetWidth; // reinicia a animação se o cartão já estava destacado
    el.classList.add('sd-flash');
    setTimeout(() => el.classList.remove('sd-flash'), 1800);
  }
  return true;
}

// Depois de mudar de idioma a app recarrega: guarda o cartão a destacar quando voltar
const PENDING = 'sd_pending_focus';
export function focusAfterReload(id) { try { sessionStorage.setItem(PENDING, id); } catch { /* sem armazenamento */ } }
export function takePendingFocus() {
  try { const v = sessionStorage.getItem(PENDING); sessionStorage.removeItem(PENDING); return v; } catch { return null; }
}
