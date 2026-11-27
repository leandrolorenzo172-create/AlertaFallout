// CIBERATAQUES — atualiza o feed, filtra ameaças, alertas críticos e recalcula o risco (estado em src/cyber/cyberTools.js)
import { ShieldAlert, RefreshCw, Filter, Siren, Calculator } from 'lucide-react';
import { useCyberTools, onRefreshCyber, onRecalcRisk, setThreatType, toggleCritical, toggleCyberSub } from '@/cyber/cyberTools';
import { THREAT_TYPES } from '@/lib/cyberRisk';
import { t } from '@/i18n';
import { syncBadge, countBadge, allOption } from '../helpers';

export default {
  tab: { id: 'ciber', path: '/ciber', label: 'Ciberataques', icon: ShieldAlert },
  ariaLabel: 'Ferramentas de ciberataques',
  minWidth: 240,
  useContext: useCyberTools,
  fabAlert: (c) => c.criticalCount > 0,
  items: [
    { id: 'refresh', label: 'Atualizar feed', icon: RefreshCw, shortcut: 'r', keepOpen: true, busy: (c) => c.loading, badge: syncBadge, run: () => onRefreshCyber() },
    { id: 'type', label: 'Filtrar ameaça', icon: Filter, isActive: (c) => !!c.type,
      badge: (c) => (c.type ? t(THREAT_TYPES.find((x) => x.id === c.type)?.label).toUpperCase() : t('TODAS')),
      submenu: {
        isOpen: (c) => c.sub === 'type', toggle: () => toggleCyberSub('type'), layout: 'chips',
        options: (c) => [allOption('Todas', c.type == null), ...THREAT_TYPES.map((tp) => ({ id: tp.id, label: tp.label, selected: c.type === tp.id }))],
        onPick: (o, _c, api) => { setThreatType(o.id); toggleCyberSub('type'); api.goSection('ciber-lista'); },
      } },
    { id: 'critical', label: 'Alertas críticos', icon: Siren, toggle: true, isActive: (c) => c.criticalOnly, alert: (c) => c.criticalCount > 0,
      badge: (c) => countBadge(c.criticalOnly, c.criticalCount), run: (_c, api) => { toggleCritical(); api.focus('ciber-lista'); } },
    { id: 'recalc', label: 'Recalcular risco', icon: Calculator, keepOpen: true,
      badge: (c) => (c.risk ? `${c.risk.score}/100 · ${t(c.risk.level).toUpperCase()}` : ''),
      run: (_c, api) => { onRecalcRisk(); api.focus('ciber-risco', 100); } }, // mostra a pontuação nova
  ],
};
