// METEO — atualiza, salta entre secções e muda a cidade de referência (estado em src/weather/weatherTools.js)
import { Cloud, RefreshCw, ChevronsDown, MapPin, Anchor, CalendarDays } from 'lucide-react';
import { useMeteoTools, onRefreshWeather, toggleSub, METEO_SECTIONS, MAIN_CITIES } from '@/weather/weatherTools';
import { useLoc, LOCATIONS, setLocManual } from '@/location';
import { t } from '@/i18n';
import { syncBadge } from '../helpers';

// estado da meteo + localização escolhida
const useMeteoContext = () => ({ ...useMeteoTools(), loc: useLoc() });

export default {
  tab: { id: 'meteo', path: '/meteo', label: 'Meteo', icon: Cloud },
  ariaLabel: 'Ferramentas da meteorologia',
  minWidth: 230,
  useContext: useMeteoContext,
  items: [
    { id: 'refresh', label: 'Atualizar agora', icon: RefreshCw, shortcut: 'r', keepOpen: true, busy: (m) => m.loading, badge: syncBadge, run: () => onRefreshWeather() },
    { id: 'jump', label: 'Saltar para secção', icon: ChevronsDown,
      submenu: {
        isOpen: (m) => m.sub === 'jump', toggle: () => toggleSub('jump'), layout: 'list',
        options: () => METEO_SECTIONS.map((sec) => ({ id: sec.id, label: sec.label })),
        onPick: (o, _m, api) => { toggleSub('jump'); api.goSection(o.id); },
      } },
    { id: 'city', label: 'Cidade principal', icon: MapPin, badge: (m) => m.loc.name.toUpperCase(),
      submenu: {
        isOpen: (m) => m.sub === 'city', toggle: () => toggleSub('city'), layout: 'grid',
        options: (m) => MAIN_CITIES.map((name) => ({ id: name, label: name, selected: m.loc.name === name })),
        onPick: (o, _m, api) => {
          const l = LOCATIONS.find((x) => x.name === o.id); if (!l) return;
          setLocManual(l.id); toggleSub('city');
          api.goSection('meteo-15dias'); // a previsão de 15 dias recarrega para a cidade nova
        },
      } },
    { id: 'sea', label: 'Avisos marítimos', icon: Anchor, alert: (m) => m.seaActive > 0,
      badge: (m) => (m.seaTotal ? (m.seaActive ? t('{n} ATIVO(S)', { n: m.seaActive }) : String(m.seaTotal)) : t('SEM AVISOS')),
      keepOpen: true, run: (_m, api) => api.goSection('meteo-mar') },
    { id: 'forecast', label: 'Previsão 15 dias', icon: CalendarDays, badge: (m) => m.loc.name.toUpperCase(),
      keepOpen: true, run: (_m, api) => api.goSection('meteo-15dias') },
  ],
};
