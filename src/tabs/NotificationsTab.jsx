import React, { useState, useEffect } from 'react';
import { base44, IS_ARTIFACT } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Bell, BellOff, Save, Loader2, Check, UserX, AlertTriangle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { enableNotifications, isRegistered, pushSupported } from '@/notify/push';
import { testWeatherAlert, testNotifications } from '@/notify/strikeAlerts';
import { askPermission, testAlert, checkStrikeAlerts, ANTECEDENCIA_DIAS } from '@/notify/strikeAlerts';
import { t } from '@/i18n';
import { onSettingsAction, focusCard } from '@/settingsActions';

const notifications = [
  { key: 'guerra_enabled', label: t('Guerra & Conflitos'), desc: t('Notícias sobre guerras ativas e conflitos armados'), icon: '⚔️', color: '#ff0000' },
  { key: 'catastrofes_enabled', label: t('Catástrofes Naturais'), desc: t('Terramotos, tsunamis, erupções e outros desastres'), icon: '🌋', color: '#ff6600' },
  { key: 'meteorologia_enabled', label: t('Meteorologia Portugal'), desc: t('Alertas meteorológicos e condições extremas'), icon: '🌧️', color: '#00aaff' },
  { key: 'tensao_global_enabled', label: t('Tensão Global'), desc: t('Indicadores de escalada de tensão internacional'), icon: '🌍', color: '#ffaa00' },
  { key: 'pizza_index_enabled', label: t('Índice Pizza'), desc: t('Alterações significativas no índice de atividade'), icon: '🍕', color: '#ff9900' },
  { key: 'greves_enabled', label: t('Greves Portugal'), desc: t('Novas greves e paralisações anunciadas em Portugal'), icon: '✊', color: '#cc33ff' },
];

const DEFAULTS = {
  guerra_enabled: true,
  catastrofes_enabled: true,
  meteorologia_enabled: true,
  tensao_global_enabled: true,
  pizza_index_enabled: false,
  greves_enabled: true,
};

export default function NotificationsTab() {
  const [settings, setSettings] = useState(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [existingId, setExistingId] = useState(null);
  const [user, setUser] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const existing = await base44.entities.NotificationSettings.list();
      if (existing.length > 0) {
        // definições guardadas antes de existir a opção Greves ficam com o valor por omissão; a antiga Promoções sai
        const { deals_enabled, ...saved } = existing[0];
        setSettings({ ...DEFAULTS, ...saved });
        setExistingId(existing[0].id);
      }
      
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (e) {
        setUser(null);
      }
    };
    load();
  }, []);

  const [registered, setRegistered] = useState(false);
  const [pushMsg, setPushMsg] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { isRegistered().then(setRegistered); }, []);
  const activatePush = async () => {
    setPushMsg(''); setBusy(true);
    try { await enableNotifications(); setRegistered(true); setPerm('granted'); setPushMsg(t('✔ Pronto! Este telemóvel passa a receber os avisos, mesmo com a app fechada.')); }
    catch (e) { setPushMsg(e.message); } finally { setBusy(false); }
  };
  const [perm, setPerm] = useState(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
  // "Testar notificações" (o mesmo handler do botão e da ferramenta TESTE do menu ≡)
  const runTest = async () => {
    setPushMsg(t('A enviar notificações de teste…'));
    const ok = await testNotifications();
    setPushMsg(ok ? t('Enviadas 2 notificações de teste. Se não aparecerem, confirma nas definições do telemóvel que as notificações desta app estão permitidas.') : t('As notificações não estão autorizadas neste telemóvel: carrega primeiro em "Ativar notificações no telemóvel". O aviso de teste aparece só dentro da app.'));
  };
  // Ferramentas rápidas do menu ≡: ATIVAR NOTIFICAÇÃO, TESTE e REPOR PREDEFINIÇÕES (categorias)
  const actions = React.useRef({});
  actions.current = { activatePush, runTest, perm };
  useEffect(() => onSettingsAction((id) => {
    const show = () => setTimeout(() => focusCard('set-push'), 60); // mostra o estado/resultado
    if (id === 'ativar') {
      show();
      if (!pushSupported()) setPushMsg(t('✖ Este browser não mostra notificações. Usa o Chrome com a app instalada no ecrã inicial; até lá os avisos só aparecem dentro da app.'));
      else actions.current.activatePush();
    } else if (id === 'teste') { show(); actions.current.runTest(); }
    else if (id === 'repor-notificacoes') { setSettings(DEFAULTS); setSaved(false); setPushMsg(t('Categorias repostas: carrega em "Guardar definições" para as guardar.')); }
  }), []);
  const handleToggle = (key) => {
    // ligar os avisos de greve pede logo autorização para notificações no telemóvel
    if (key === 'greves_enabled' && !settings[key]) askPermission().then(setPerm);
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const data = { ...settings, last_check: new Date().toISOString() };
    delete data.id;
    delete data.created_date;
    delete data.updated_date;
    delete data.created_by;

    if (existingId) {
      await base44.entities.NotificationSettings.update(existingId, data);
    } else {
      const created = await base44.entities.NotificationSettings.create(data);
      setExistingId(created.id);
    }
    setSaving(false);
    setSaved(true);
    checkStrikeAlerts();
    setTimeout(() => setSaved(false), 2000);
  };

  const enabledCount = notifications.filter(n => settings[n.key]).length;

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await base44.entities.User.delete(user.id);
      await base44.auth.logout();
    } catch (error) {
      alert(t('Erro ao eliminar conta. Tente novamente.'));
      setDeleting(false);
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        {/* o título "Notificações" já está na secção das Definições: aqui fica só o contador */}
        <span />
        <span className="text-[10px] px-2 py-1 rounded-sm"
          style={{ background: 'rgb(var(--c) / 0.13)', color: 'rgb(var(--c))', border: '1px solid rgb(var(--c) / 0.2)' }}>
          {enabledCount}/{notifications.length}{' '}{t('ativas')}
        </span>
      </div>

      <div className="p-3 rounded-sm mb-4" style={{ background: 'rgb(var(--cd) / 0.2)', border: '1px solid rgb(var(--c) / 0.07)' }}>
        <p className="text-[10px]" style={{ color: 'rgb(var(--c) / 0.47)' }}>
          {t('🔔 Configure quais notificações deseja receber. Os dados são verificados de hora a hora e os avisos chegam como notificações no telemóvel, entre as 8h e as 23h.')}
        </p>
      </div>

      <div className="space-y-2 mb-6">
        {notifications.map((notif, i) => (
          <motion.div
            key={notif.key}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center justify-between p-3 rounded-sm transition-all"
            style={{
              background: settings[notif.key] ? 'rgb(var(--cd) / 0.4)' : 'rgb(var(--cd) / 0.13)',
              border: `1px solid ${settings[notif.key] ? notif.color + '33' : 'rgb(var(--c) / 0.07)'}`,
              borderLeft: `3px solid ${settings[notif.key] ? notif.color : 'rgb(var(--c) / 0.13)'}`,
            }}
          >
            <div className="flex items-start gap-3">
              <span className="text-lg">{notif.icon}</span>
              <div>
                <h3 className="text-xs font-bold" style={{ color: settings[notif.key] ? 'rgb(var(--c) / 0.8)' : 'rgb(var(--c) / 0.33)' }}>
                  {notif.label}
                </h3>
                <p className="text-[10px] mt-0.5" style={{ color: 'rgb(var(--c) / 0.33)' }}>{notif.desc}</p>
              </div>
            </div>
            <Switch
              checked={!!settings[notif.key]}
              onCheckedChange={() => handleToggle(notif.key)}
            />
          </motion.div>
        ))}
      </div>

      {/* Como funcionam os avisos: explicação, estado deste telemóvel, ativação e exemplo */}
      <div id="set-push" className="p-3 rounded-sm mb-4 text-[10px] leading-relaxed" style={{ background: 'rgb(var(--cd) / 0.2)', border: '1px solid rgb(var(--c) / 0.07)', color: 'rgb(var(--c) / 0.6)' }}>
        <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'rgb(var(--c) / 0.85)' }}>{t('Como funcionam os avisos')}</p>
        <ul className="space-y-1.5 mb-3">
          <li>{t('📲 Chegam como')}{' '}<b>{t('notificação no telemóvel')}</b>{t(', mesmo com a app fechada, entre as 8h e as 23h.')}</li>
          <li>✊ <b>{t('Greves:')}</b> {ANTECEDENCIA_DIAS}{' '}{t('dias antes e no próprio dia. Ex.: "ALERTA — Greve da Função Pública dia 26/11/26".')}</li>
          <li>🌧️ 🌋 ⚔️ 🌍 🍕 <b>{t('Restantes:')}</b>{' '}{t('só no próprio dia e só quando há algo importante. Ex.: "ALERTA AMARELO — Precipitação em Braga hoje".')}</li>
          <li>{t('✅ Só recebes as categorias')}{' '}<b>{t('ligadas acima')}</b>{t('. Depois de mudar, carrega em')}{' '}<b>{t('Guardar definições')}</b>.</li>
        </ul>

        {/* estado deste telemóvel */}
        <p className="mb-3 p-2 rounded-sm" style={{ background: 'rgb(var(--cb) / 0.5)', border: `1px solid ${perm === 'granted' ? 'rgb(var(--c) / 0.3)' : '#ffaa0055'}`, color: perm === 'granted' ? 'rgb(var(--c) / 0.85)' : '#ffaa00' }}>
          {perm === 'granted' && (registered ? t('✔ Notificações ativas neste telemóvel.') : t('⚠ Notificações autorizadas, mas falta ativar: carrega em "Ativar notificações no telemóvel".'))}
          {perm === 'default' && t('⚠ As notificações ainda não foram autorizadas neste telemóvel: carrega em "Ativar notificações no telemóvel".')}
          {perm === 'denied' && t('✖ As notificações estão bloqueadas nas definições do telemóvel. Desbloqueia-as para esta app; até lá os avisos só aparecem dentro da app.')}
          {perm === 'unsupported' && t('✖ Este browser não mostra notificações. Usa o Chrome com a app instalada no ecrã inicial; até lá os avisos só aparecem dentro da app.')}
        </p>

        <div className="space-y-3">
          {pushSupported() && (
            <div>
              <button type="button" onClick={activatePush} disabled={busy} className="px-2 py-1 rounded-sm text-[10px] uppercase tracking-wider"
                style={{ border: '1px solid #ffaa00', color: '#ffaa00', opacity: busy ? 0.6 : 1 }}>
                {busy ? t('A ativar…') : registered ? t('Notificações ativas ✔ (tocar para renovar)') : t('Ativar notificações no telemóvel')}
              </button>
              <p className="mt-1">{t('Um toque e fica feito: o telemóvel regista-se sozinho, sem códigos. Os interruptores acima passam a valer também com a app fechada.')}</p>
            </div>
          )}
          <div>
            <button type="button" onClick={runTest}
              className="px-2 py-1 rounded-sm text-[10px] uppercase tracking-wider" style={{ border: '1px solid rgb(var(--c) / 0.4)', color: 'rgb(var(--c))' }}>
              🔔 {t('Testar notificações')}
            </button>
            <p className="mt-1">{t('Envia agora para este telemóvel uma notificação de teste de uma categoria e outra do tempo, para veres se chegam.')}</p>
          </div>
        </div>
        {pushMsg && <p className="mt-2" style={{ color: '#ffaa00' }}>{pushMsg}</p>}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 p-3 rounded-sm text-xs uppercase tracking-wider font-bold transition-all"
        style={{
          background: saved ? 'rgb(var(--c) / 0.13)' : 'rgb(var(--c) / 0.07)',
          border: `1px solid ${saved ? 'rgb(var(--c) / 0.4)' : 'rgb(var(--c) / 0.2)'}`,
          color: 'rgb(var(--c))',
        }}
      >
        {saving ? (
          <><Loader2 size={14} className="animate-spin" />{' '}{t('A GUARDAR...')}</>
        ) : saved ? (
          <><Check size={14} />{' '}{t('GUARDADO!')}</>
        ) : (
          <><Save size={14} />{' '}{t('GUARDAR DEFINIÇÕES')}</>
        )}
      </button>

      {/* Delete Account Section */}
      {user && (
        <div className="mt-6 pt-6" style={{ borderTop: '1px solid #ff000022' }}>
          <h3 className="text-xs uppercase tracking-wider font-bold mb-3" style={{ color: '#ff0000cc' }}>
            {t('⚠️ Zona de Perigo')}
          </h3>
          
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-sm text-xs uppercase tracking-wider font-bold transition-all"
              style={{
                background: '#ff000011',
                border: '1px solid #ff000033',
                color: '#ff0000cc',
              }}
            >
              <UserX size={14} />{' '}{t('Eliminar Conta')}
            </button>
          ) : (
            <div className="p-4 rounded-sm" style={{ background: '#ff000022', border: '1px solid #ff000044' }}>
              <div className="flex items-start gap-2 mb-3">
                <AlertTriangle size={16} style={{ color: '#ff0000' }} className="flex-shrink-0 mt-0.5" />
                <p className="text-xs leading-relaxed" style={{ color: '#ff0000cc' }}>
                  {t('Esta ação é PERMANENTE e não pode ser revertida. Todos os seus dados serão eliminados.')}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="flex-1 px-3 py-2 rounded-sm text-xs uppercase tracking-wider"
                  style={{
                    background: 'rgb(var(--cd) / 0.2)',
                    border: '1px solid rgb(var(--c) / 0.2)',
                    color: 'rgb(var(--c) / 0.53)',
                  }}
                >
                  {t('Cancelar')}
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-sm text-xs uppercase tracking-wider font-bold"
                  style={{
                    background: '#ff0000',
                    border: '1px solid #ff0000',
                    color: '#fff',
                  }}
                >
                  {deleting ? (
                    <><Loader2 size={14} className="animate-spin" />{' '}{t('A Eliminar...')}</>
                  ) : (
                    <>{t('Confirmar Eliminação')}</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
