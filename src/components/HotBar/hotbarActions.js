// API que o motor do menu ≡ entrega às ações das abas: fechar, navegar, destacar cartões, deslizar até painéis.
// As configs ficam declarativas: chamam api.goSection('id') em vez de repetirem setOpen/setTimeout/focusCard.
import { focusCard } from '@/settingsActions';

export function createHotbarApi({ setOpen, navigate, playSelect }) {
  const close = () => setOpen(false);
  const later = (fn, ms = 120) => setTimeout(fn, ms);
  return {
    close,
    later,
    playSelect,
    navigate: (path) => { close(); navigate(path); },
    focus: (id, ms = 150) => later(() => focusCard(id), ms),
    goSection: (id) => { close(); later(() => focusCard(id), 150); },
    scrollTo: (elementId) => later(() => document.getElementById(elementId)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150),
  };
}

// Executa um item segundo o contrato: som -> (fecha) -> ação (já ou depois de runDelay)
export function runItem(item, ctx, api, keepOpen) {
  api.playSelect();
  if (item.submenu) { item.submenu.toggle(ctx); return; }
  if (!keepOpen) api.close();
  if (!item.run) return;
  // síncrono quando não há atraso: o seletor de ficheiros, o ecrã inteiro e a partilha exigem o gesto do utilizador
  if (item.runDelay) api.later(() => item.run(ctx, api), item.runDelay);
  else item.run(ctx, api);
}
