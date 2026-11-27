// PIZZA — atualiza o índice, mostra as fontes do cálculo e liga o alerta de pico (estado em src/pizza/pizzaTools.js)
import { TrendingUp, RefreshCw, Newspaper, Siren } from 'lucide-react';
import { usePizzaTools, onRefreshPizzaIndex, onTogglePizzaAlert, PIZZA_PEAK, PIZZA_SOURCES_ID } from '@/pizza/pizzaTools';
import { t } from '@/i18n';

const usePizzaContext = () => { const p = usePizzaTools(); return { ...p, peak: (p.level || 0) >= PIZZA_PEAK }; };

export default {
  tab: { id: 'pizza', path: '/pizza', label: 'Pizza', icon: TrendingUp },
  ariaLabel: 'Ferramentas do Índice Pizza',
  minWidth: 230,
  useContext: usePizzaContext,
  fabAlert: (p) => p.isPizzaAlertActive || p.peak,
  items: [
    { id: 'refresh', label: 'Atualizar índice', icon: RefreshCw, shortcut: 'r', keepOpen: true, busy: (p) => p.loading,
      badge: (p) => {
        if (p.loading) return t('A ATUALIZAR');
        if (p.level == null) return '';
        const d = p.delta == null ? '' : `${p.delta > 0 ? '+' : ''}${p.delta.toFixed(1)}`;
        return { text: `${Number(p.level).toFixed(1)}/10${d ? ` (${d})` : ''}`, color: p.delta > 0 ? '#ff6600' : undefined };
      },
      run: () => onRefreshPizzaIndex() },
    // vai até "Indicadores Atuais" e destaca as contagens e manchetes que pesam no índice
    { id: 'sources', label: 'Fontes do cálculo', icon: Newspaper, run: (_p, api) => api.focus(PIZZA_SOURCES_ID) },
    { id: 'alert', label: 'Alerta', icon: Siren, keepOpen: true, toggle: true, isActive: (p) => p.isPizzaAlertActive,
      alert: (p) => p.isPizzaAlertActive || p.peak, badge: (p) => (p.isPizzaAlertActive ? 'ON' : 'OFF'), run: () => onTogglePizzaAlert() },
  ],
};
