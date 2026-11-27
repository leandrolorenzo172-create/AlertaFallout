// DEFINIÇÕES — 7 atalhos para os cartões das Definições (ações tratadas em src/settingsActions.js)
import { Settings, Info, Languages, MapPin, Bell, BellRing, Send, RotateCcw } from 'lucide-react';
import { runSettingsAction } from '@/settingsActions';
import { isEn } from '@/i18n';

// fecha primeiro, para o scroll e o destaque ficarem visíveis
const action = (id) => ({ id, runDelay: 120, run: () => runSettingsAction(id) });

export default {
  tab: { id: 'definicoes', path: '/definicoes', label: 'Definições', icon: Settings },
  ariaLabel: 'Ferramentas rápidas das definições',
  minWidth: 190,
  items: [
    { ...action('sobre'), label: 'Sobre o sistema', icon: Info },
    { ...action('idioma'), label: 'Idioma', icon: Languages, badge: () => (isEn() ? 'US → PT' : 'PT → US') },
    { ...action('localizacao'), label: 'Localização', icon: MapPin },
    { ...action('notificacoes'), label: 'Notificações', icon: Bell },
    { ...action('ativar'), label: 'Ativar notificação', icon: BellRing },
    { ...action('teste'), label: 'Teste', icon: Send },
    { ...action('repor'), label: 'Repor predefinições', icon: RotateCcw, tone: 'warn' },
  ],
};
