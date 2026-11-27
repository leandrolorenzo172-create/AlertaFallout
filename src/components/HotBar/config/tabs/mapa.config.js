// MAPA — posição, pinos, camadas, medir, rota, GPS e mapas offline (estado em src/map/mapTools.js e src/map/offline/tracker.js)
import { MapPin, LocateFixed, Layers, Ruler, Footprints, Navigation, HardDriveDownload } from 'lucide-react';
import { useMapTools, toggleMode, nextLayer, openOfflinePanel, openRoute, runMapAction, LAYER_LABEL } from '@/map/mapTools';
import { hasOfflineData } from '@/map/offline/offlineMapManager';
import { useTracker, toggleTracking } from '@/map/offline/tracker';
import { t } from '@/i18n';

const useMapContext = () => ({ ...useMapTools(), tracking: useTracker().tracking });
// modos exclusivos (pinos, medir, rota): ponto vermelho enquanto ativos
const mode = (id) => ({ toggle: true, isActive: (m) => m.mode === id, dot: (m) => m.mode === id, run: () => toggleMode(id) });

export default {
  tab: { id: 'mapa', path: '/mapa', label: 'Mapa', icon: MapPin },
  ariaLabel: 'Ferramentas do mapa',
  minWidth: 200,
  useContext: useMapContext,
  fabAlert: (m) => m.tracking || !!m.mode,
  items: [
    { id: 'center', label: 'Centrar posição', icon: LocateFixed, shortcut: 'c', runDelay: 120, run: () => runMapAction('center') },
    { id: 'pin', label: 'Marcadores / Pins', icon: MapPin, ...mode('pin') },
    { id: 'layers', label: 'Alternar camadas', icon: Layers, shortcut: 'l', keepOpen: true, badge: (m) => t(LAYER_LABEL[m.layer]), run: () => nextLayer() },
    { id: 'measure', label: 'Medir distância', icon: Ruler, ...mode('measure') },
    // Rota a pé no mapa real: malha guardada -> OSRM online -> linha reta.
    // Só sem rede E sem nenhum mapa guardado é que abre o ecrã esquemático.
    { id: 'route', label: 'Rota', icon: Footprints, ...mode('route'),
      run: (m) => {
        if (m.mode === 'route' || navigator.onLine !== false) { toggleMode('route'); return; }
        hasOfflineData().then((ok) => (ok ? toggleMode('route') : openRoute(true)));
      } },
    { id: 'track', label: 'Seguir GPS', icon: Navigation, shortcut: 'g', toggle: true, isActive: (m) => m.tracking, dot: (m) => m.tracking, run: () => toggleTracking() }, // funciona em modo avião
    { id: 'offline', label: 'Mapas offline', icon: HardDriveDownload, run: () => openOfflinePanel(true) }, // guardar áreas, PMTiles, espaço
  ],
};
