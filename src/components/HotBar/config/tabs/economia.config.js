// ECONOMIA — filtra notícias, gere os "Meus ativos" e atualiza (estado em src/economy/economyTools.js)
import { TrendingDown, Siren, LineChart, BarChart3, Search, RefreshCw, ArrowUpToLine, ChevronsDown, PlusCircle } from 'lucide-react';
import { useEconomyTools, toggleUrgent, toggleEcoSub, setEcoTheme, openEcoSearch, onRefreshEconomy, requestAddAsset, ECO_THEMES } from '@/economy/economyTools';
import { scrollTop } from '@/manual/manualTools';
import { focusCard } from '@/settingsActions';
import { t } from '@/i18n';
import { syncBadge, queryBadge, countBadge, allOption } from '../helpers';

export default {
  tab: { id: 'economia', path: '/economia', label: 'Economia', icon: TrendingDown },
  ariaLabel: 'Ferramentas da economia',
  minWidth: 230,
  useContext: useEconomyTools,
  fabAlert: (e) => e.urgentCount > 0,
  items: [
    { id: 'urgent', label: 'Alertas urgentes', icon: Siren, toggle: true, isActive: (e) => e.urgentOnly, alert: (e) => e.urgentCount > 0,
      badge: (e) => countBadge(e.urgentOnly, e.urgentCount), run: (_e, api) => { toggleUrgent(); api.focus('eco-noticias'); } },
    { id: 'assets', label: 'Meus ativos', icon: LineChart, badge: (e) => t('{n}/6', { n: 6 - e.freeSlots }),
      submenu: {
        isOpen: (e) => e.sub === 'assets', toggle: () => toggleEcoSub('assets'), layout: 'list',
        options: (e) => [
          { id: 'goto', label: 'Ir para os meus ativos', icon: ChevronsDown, run: (_e, api) => { toggleEcoSub('assets'); api.goSection('eco-ativos'); } },
          { id: 'add', label: e.freeSlots ? 'Adicionar ativo' : 'Espaços cheios', icon: PlusCircle, disabled: !e.freeSlots,
            run: (_e, api) => { toggleEcoSub('assets'); api.close(); api.later(() => { focusCard('eco-ativos'); requestAddAsset(); }, 150); } },
        ],
      } },
    { id: 'theme', label: 'Filtrar por tema', icon: BarChart3, isActive: (e) => !!e.theme,
      badge: (e) => (e.theme ? t(ECO_THEMES.find((x) => x.id === e.theme)?.label).toUpperCase() : t('TODOS')),
      submenu: {
        isOpen: (e) => e.sub === 'theme', toggle: () => toggleEcoSub('theme'), layout: 'chips',
        options: (e) => [allOption('Todos os temas', !e.theme), ...ECO_THEMES.map((th) => ({ id: th.id, label: th.label, selected: e.theme === th.id }))],
        onPick: (o, _e, api) => { setEcoTheme(o.id); toggleEcoSub('theme'); api.goSection('eco-noticias'); },
      } },
    { id: 'search', label: 'Pesquisar', icon: Search, shortcut: 's', isActive: (e) => !!e.query.trim(), badge: (e) => queryBadge(e.query),
      run: (_e, api) => { openEcoSearch(true); api.focus('eco-noticias'); } },
    { id: 'refresh', label: 'Atualizar dados', icon: RefreshCw, shortcut: 'r', keepOpen: true, busy: (e) => e.loading, badge: syncBadge, run: () => onRefreshEconomy() },
    { id: 'top', label: 'Topo da lista', icon: ArrowUpToLine, runDelay: 120, run: () => scrollTop() },
  ],
};
