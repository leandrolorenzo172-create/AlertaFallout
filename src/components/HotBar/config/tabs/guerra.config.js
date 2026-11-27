// GUERRA — filtra alertas, gravidade e região, pesquisa e atualiza (estado em src/war/warTools.js)
import { Skull, Siren, SlidersHorizontal, Globe, Search, RefreshCw, ArrowUpToLine } from 'lucide-react';
import { useWarTools, toggleAlerts, cycleSeverity, setWarRegion, openWarSearch, onRefreshWar, toggleWarSub } from '@/war/warTools';
import { scrollTop } from '@/manual/manualTools';
import { t } from '@/i18n';
import { syncBadge, queryBadge, countBadge, allOption } from '../helpers';

export default {
  tab: { id: 'guerra', path: '/guerra', label: 'Guerra', icon: Skull, alert: true },
  ariaLabel: 'Ferramentas da guerra',
  minWidth: 230,
  useContext: useWarTools,
  fabAlert: (w) => w.alertCount > 0,
  items: [
    { id: 'alerts', label: 'Alertas ativos', icon: Siren, toggle: true, isActive: (w) => w.alertsOnly, alert: (w) => w.alertCount > 0,
      badge: (w) => countBadge(w.alertsOnly, w.alertCount), run: (_w, api) => { toggleAlerts(); api.focus('guerra-lista'); } },
    { id: 'severity', label: 'Filtrar gravidade', icon: SlidersHorizontal, keepOpen: true, isActive: (w) => w.minSev > 0, // Todas -> >= 5 -> >= 7
      badge: (w) => (w.minSev ? `≥ ${w.minSev}/10` : t('TODAS')), run: () => cycleSeverity() },
    { id: 'region', label: 'Filtrar por região', icon: Globe, isActive: (w) => !!w.region,
      badge: (w) => (w.region ? t(w.region).toUpperCase() : t('TODAS')),
      submenu: {
        isOpen: (w) => w.sub === 'region', toggle: () => toggleWarSub('region'), layout: 'chips',
        options: (w) => [allOption('Todas as regiões', !w.region), ...w.regions.map(([name, n]) => ({ id: name, label: name, count: n, selected: w.region === name }))],
        onPick: (o, _w, api) => { setWarRegion(o.id); toggleWarSub('region'); api.goSection('guerra-lista'); },
      } },
    { id: 'search', label: 'Pesquisar', icon: Search, shortcut: 's', isActive: (w) => !!w.query.trim(), badge: (w) => queryBadge(w.query),
      run: (_w, api) => { openWarSearch(true); api.focus('guerra-lista'); } },
    { id: 'refresh', label: 'Atualizar agora', icon: RefreshCw, shortcut: 'r', keepOpen: true, busy: (w) => w.loading, badge: syncBadge, run: () => onRefreshWar() },
    { id: 'top', label: 'Voltar ao topo', icon: ArrowUpToLine, runDelay: 120, run: () => scrollTop() },
  ],
};
