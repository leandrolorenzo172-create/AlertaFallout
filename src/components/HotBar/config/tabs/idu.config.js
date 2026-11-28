// IDU (ID UTILIZADOR) — a ficha vive em src/tabs/IduTab.jsx; aqui o menu ≡ é o ECRÃ SOS com 5 ações, por esta ordem,
// seguidas do backup do perfil (dispositivo, email, importar) para trocar de telemóvel sem perder dados.
// Lógica das ações em src/idu/sos.js (emergência do país, SMS com GPS, estroboscópio, sirene, ligar ao contacto).
import { IdCard } from 'lucide-react';
import { useIdu, emergencyContact } from '@/idu/iduStore';
import { useSos, callEmergency, smsSos, toggleSosStrobe, toggleSosSiren, callContact, clearNotice } from '@/idu/sos';
import { useCountry } from '@/geo/country';
import { emergencyNumber } from '@/geo/emergency';
import { useBackupFlow, exportToDevice, emailBackup, pickBackupFile } from '@/backup/backupFlow';
import { t } from '@/i18n';

// emergency = número do país detetado (muda sozinho quando o utilizador viaja)
const useIduSosContext = () => { const c = useCountry(); return { ...useSos(), contact: emergencyContact(useIdu()), backup: useBackupFlow(), emergency: emergencyNumber(c.code), countryCode: c.code }; };
const noContact = (c) => !c.contact;
const contactBadge = (c) => (c.contact ? (c.contact.name || c.contact.phone).toUpperCase() : t('SEM NÚMERO'));
const STROBE = { off: 'OFF', starting: '…', torch: 'LANTERNA', screen: 'ECRÃ' };

export default {
  tab: { id: 'idu', path: '/idu', label: 'IDU', icon: IdCard },
  ariaLabel: 'Ecrã SOS de emergência',
  title: 'SOS · Emergência',
  titleColor: '#ef4444',
  minWidth: 250,
  useContext: useIduSosContext,
  onEnter: () => clearNotice(),
  status: (c) => (c.backup.busy ? { text: c.backup.busy, color: '#ffaa00' }
    : c.backup.msg ? { text: c.backup.msg.text, color: c.backup.msg.err ? '#ef4444' : '#ffaa00' }
      : c.notice ? { text: c.notice, color: '#ffaa00' } : null),
  fabAlert: (c) => c.siren || c.strobe !== 'off',
  items: [
    { id: 'call112', label: (c) => t('SOS - Ligar {n}', { n: c.emergency }), symbol: '📞', tone: 'danger', badge: (c) => ({ text: c.countryCode ? `${c.emergency} · ${c.countryCode}` : c.emergency, color: '#ef4444' }), run: () => callEmergency() },
    // fica aberto enquanto obtém o GPS; sem contacto fecha e abre a ficha no campo do telefone
    { id: 'sms', label: 'SMS SOS', symbol: '📩', keepOpen: (c) => !noContact(c), alert: noContact,
      badge: (c) => (c.sms === 'gps' ? t('A OBTER GPS…') : contactBadge(c)), disabledWhen: (c) => c.sms === 'gps',
      run: (c, api) => { if (noContact(c)) api.close(); smsSos(); } },
    { id: 'strobe', label: 'SOS estrobo', symbol: '🔦', keepOpen: true, toggle: true, isActive: (c) => c.strobe !== 'off',
      tone: (c) => (c.strobe !== 'off' ? 'rec' : 'default'), dot: (c) => c.strobe !== 'off',
      badge: (c) => t(STROBE[c.strobe] || 'OFF'), run: () => toggleSosStrobe() },
    { id: 'siren', label: 'Sirene / apito', symbol: '🚨', keepOpen: true, toggle: true, shortcut: 's', isActive: (c) => c.siren,
      tone: (c) => (c.siren ? 'rec' : 'default'), dot: (c) => c.siren, badge: (c) => (c.siren ? 'ON' : 'OFF'), run: () => toggleSosSiren() },
    { id: 'contact', label: 'Ligar contacto', symbol: '📲', alert: noContact, badge: contactBadge, run: () => callContact() },
    // backup completo da app (ficha IDU incluída), sem mapas offline: para trocar de telemóvel sem perder dados
    { id: 'sep-backup', type: 'separator' },
    { id: 'backup-device', label: 'Backup p/ dispositivo', symbol: '💾', keepOpen: true, disabledWhen: (c) => !!c.backup.busy,
      badge: () => '.ZIP', run: () => exportToDevice() },
    { id: 'backup-email', label: 'Backup por email', symbol: '✉️', keepOpen: true, disabledWhen: (c) => !!c.backup.busy,
      badge: () => 'EMAIL', run: () => emailBackup() },
    // síncrono no clique (o seletor de ficheiros exige o gesto); a confirmação Fundir/Substituir aparece na aba
    { id: 'backup-import', label: 'Importar perfil', symbol: '📥', disabledWhen: (c) => !!c.backup.busy,
      badge: () => '.ZIP', run: () => pickBackupFile() },
  ],
};
