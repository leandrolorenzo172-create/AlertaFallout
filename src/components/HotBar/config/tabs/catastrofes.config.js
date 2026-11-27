// CATÁSTROFES — alertas ativos, protocolo de emergência, filtro, pesquisa e atualização (estado em src/catastrophe/catTools.js)
import { AlertTriangle, Siren, ShieldAlert, SlidersHorizontal, Search, RefreshCw, ArrowUpToLine } from 'lucide-react';
import { useCatTools, toggleActiveOnly, openProtocol, cycleCatFilter, openCatSearch, onRefreshCat, CAT_FILTERS } from '@/catastrophe/catTools';
import { scrollTop } from '@/manual/manualTools';
import { t } from '@/i18n';
import { syncBadge, queryBadge, countBadge } from '../helpers';

export default {
  tab: { id: 'catastrofes', path: '/catastrofes', label: 'Catástrofes', icon: AlertTriangle },
  ariaLabel: 'Ferramentas das catástrofes',
  minWidth: 240,
  useContext: useCatTools,
  fabAlert: (c) => c.activeCount > 0,
  items: [
    { id: 'active', label: 'Alertas ativos', icon: Siren, toggle: true, isActive: (c) => c.activeOnly, alert: (c) => c.activeCount > 0,
      badge: (c) => countBadge(c.activeOnly, c.activeCount), run: (_c, api) => { toggleActiveOnly(); api.focus('cat-lista'); } },
    { id: 'protocol', label: 'Protocolo de emergência', icon: ShieldAlert, run: () => openProtocol(true) },
    { id: 'filter', label: 'Filtrar gravidade / tipo', icon: SlidersHorizontal, keepOpen: true, isActive: (c) => !!c.filter, // Todas -> Críticas -> Sismos -> …
      badge: (c) => t(CAT_FILTERS.find((f) => f.id === c.filter)?.label || 'Todas').toUpperCase(), run: () => cycleCatFilter() },
    { id: 'search', label: 'Pesquisar', icon: Search, shortcut: 's', isActive: (c) => !!c.query.trim(), badge: (c) => queryBadge(c.query),
      run: (_c, api) => { openCatSearch(true); api.focus('cat-lista'); } },
    { id: 'refresh', label: 'Atualizar agora', icon: RefreshCw, shortcut: 'r', keepOpen: true, busy: (c) => c.loading, badge: syncBadge, run: () => onRefreshCat() },
    { id: 'top', label: 'Voltar ao topo', icon: ArrowUpToLine, runDelay: 120, run: () => scrollTop() },
  ],
};
