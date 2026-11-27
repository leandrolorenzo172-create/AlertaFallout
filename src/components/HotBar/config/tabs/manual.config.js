// MANUAL — atualizar, topo, filtrar e organizar a estante (estado em src/manual/manualTools.js)
import { Book, RefreshCw, ArrowUpToLine, Filter, ArrowDownUp } from 'lucide-react';
import { useManualView, refreshView, scrollTop, openPanel, filtersActive } from '@/manual/manualTools';

// o painel abre no topo da estante: leva o utilizador até ele
const panel = (id) => ({
  toggle: true, isActive: (v) => v.panel === id,
  run: (v, api) => { const willOpen = v.panel !== id; openPanel(id); if (willOpen) api.scrollTo('manual-panel'); },
});

export default {
  tab: { id: 'manual', path: '/manual', label: 'Manual', icon: Book },
  ariaLabel: 'Ferramentas do manual',
  minWidth: 200,
  useContext: useManualView,
  fabAlert: (v) => filtersActive(v),
  items: [
    { id: 'refresh', label: 'Atualizar vista', icon: RefreshCw, shortcut: 'r', run: () => refreshView() },
    { id: 'top', label: 'Voltar ao topo', icon: ArrowUpToLine, runDelay: 120, run: () => scrollTop() },
    { id: 'filter', label: 'Filtrar por tipo', icon: Filter, dot: (v) => v.themes.length > 0, ...panel('filter') },
    { id: 'organize', label: 'Organizar documentos', icon: ArrowDownUp, dot: (v) => v.sort !== 'default' || v.types.length > 0 || !!v.group, ...panel('organize') },
  ],
};
