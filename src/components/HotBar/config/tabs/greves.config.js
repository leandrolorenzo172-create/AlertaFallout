// GREVES — filtra, pesquisa e navega na lista (estado em src/strikes/strikesTools.js)
import { Megaphone, Siren, ChevronsDown, Tag, Search, RefreshCw, ArrowUpToLine } from 'lucide-react';
import { useStrikesTools, toggleOnlyActive, toggleStrikeSub, setSector, openSearch, onRefreshStrikes, STRIKE_SECTIONS } from '@/strikes/strikesTools';
import { scrollTop } from '@/manual/manualTools';
import { t } from '@/i18n';
import { syncBadge, queryBadge, countBadge } from '../helpers';

export default {
  tab: { id: 'greves', path: '/greves', label: 'Greves', icon: Megaphone },
  ariaLabel: 'Ferramentas das greves',
  minWidth: 230,
  useContext: useStrikesTools,
  fabAlert: (s) => s.activeCount > 0,
  items: [
    { id: 'active', label: 'Alertas ativos', icon: Siren, toggle: true, isActive: (s) => s.onlyActive, alert: (s) => s.activeCount > 0,
      badge: (s) => countBadge(s.onlyActive, s.activeCount), run: (_s, api) => { toggleOnlyActive(); api.focus('greves-proximas'); } },
    { id: 'jump', label: 'Saltar para secção', icon: ChevronsDown,
      submenu: {
        isOpen: (s) => s.sub === 'jump', toggle: () => toggleStrikeSub('jump'), layout: 'list',
        options: () => STRIKE_SECTIONS.map((sec) => ({ id: sec.id, label: sec.label })),
        onPick: (o, _s, api) => { toggleStrikeSub('jump'); api.goSection(o.id); },
      } },
    { id: 'sector', label: 'Filtrar por setor', icon: Tag, isActive: (s) => s.sector !== 'Todos',
      badge: (s) => (s.sector === 'Todos' ? t('TODOS') : t(s.sector).toUpperCase()),
      submenu: {
        isOpen: (s) => s.sub === 'sector', toggle: () => toggleStrikeSub('sector'), layout: 'chips',
        options: (s) => [{ id: 'Todos', label: 'Todos os setores', selected: s.sector === 'Todos' }, ...s.sectors.map(([name, n]) => ({ id: name, label: name, count: n, selected: s.sector === name }))],
        onPick: (o, _s, api) => { setSector(o.id); toggleStrikeSub('sector'); api.goSection('greves-lista'); },
      } },
    { id: 'search', label: 'Pesquisar', icon: Search, shortcut: 's', isActive: (s) => !!s.query.trim(), badge: (s) => queryBadge(s.query),
      run: (_s, api) => { openSearch(true); api.focus('greves-lista'); } },
    { id: 'refresh', label: 'Atualizar dados', icon: RefreshCw, shortcut: 'r', keepOpen: true, busy: (s) => s.loading, badge: syncBadge, run: () => onRefreshStrikes() },
    { id: 'top', label: 'Topo da lista', icon: ArrowUpToLine, runDelay: 120, run: () => scrollTop() },
  ],
};
