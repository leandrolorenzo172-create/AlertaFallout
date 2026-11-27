// FICHEIROS IA — base de conhecimento da IA: notas, importar, filtrar, ordenar, eliminar (estado em src/files/filesTools.js)
import { BrainCircuit, StickyNote, FilePlus, Filter, ArrowDownUp, Trash2 } from 'lucide-react';
import { useFilesView, openFilesPanel, requestImport, askReset } from '@/files/filesTools';

// painel que abre no topo da aba: leva o utilizador até ele
const panel = (id) => ({
  toggle: true, isActive: (v) => v.panel === id,
  run: (v, api) => { const willOpen = v.panel !== id; openFilesPanel(id); if (willOpen) api.scrollTo('files-panel'); },
});

export default {
  tab: { id: 'conhecimento', path: '/conhecimento', label: 'Ficheiros IA', icon: BrainCircuit },
  ariaLabel: 'Ferramentas da base de conhecimento',
  minWidth: 200,
  useContext: useFilesView,
  fabAlert: (v) => v.types.length > 0,
  items: [
    { id: 'note', label: 'Notas', icon: StickyNote, ...panel('note') },
    { id: 'import', label: 'Importar ficheiro', icon: FilePlus, shortcut: 'i', run: () => requestImport() }, // síncrono: o seletor precisa do gesto
    { id: 'filter', label: 'Filtrar por tipo', icon: Filter, dot: (v) => v.types.length > 0, ...panel('filter') },
    { id: 'sort', label: 'Ordenar', icon: ArrowDownUp, dot: (v) => v.sort !== 'new', ...panel('sort') },
    { id: 'reset', label: 'Eliminar biblioteca', icon: Trash2, tone: 'danger', run: () => askReset(true) }, // abre a confirmação SIM / NÃO
  ],
};
