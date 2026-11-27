// Definições > Cópia de segurança: ID do utilizador, Exportar tudo (pasta ou descarga), Enviar por email e Importar tudo.
import React, { useRef, useState } from 'react';
import { DatabaseBackup, Download, Upload, Mail, Pencil, Check, X, FolderDown } from 'lucide-react';
import { getUserId, setUserId, createBackup, saveBackupFile, shareBackupByEmail, readBackup, restoreBackup } from './backupManager';
import { t } from '@/i18n';
import RestoreDialog from './RestoreDialog';

const box = { background: 'rgb(var(--cd) / 0.4)', border: '1px solid rgb(var(--c) / 0.2)' };
const btn = { background: 'rgb(var(--cb) / 0.6)', border: '1px solid rgb(var(--c) / 0.3)', color: 'rgb(var(--c))' };
const MB = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

export default function BackupSection() {
  const [uid, setUid] = useState(getUserId);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(uid);
  const [includeMaps, setIncludeMaps] = useState(false);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null); // { text, err }
  const [pending, setPending] = useState(null); // backup lido, à espera de Substituir / Fundir
  const fileRef = useRef(null);
  const say = (text, err = false) => setMsg({ text, err });

  const saveId = () => { try { setUid(setUserId(draft)); setEditing(false); say(t('✔ ID atualizado.')); } catch (e) { say(e.message, true); } };
  const make = async () => createBackup({ includeMaps, onProgress: (m) => setBusy(m) });

  const exportAll = async () => {
    setBusy(t('A preparar o backup…')); setMsg(null);
    try {
      const { file } = await make();
      const r = await saveBackupFile(file);
      if (r.method === 'cancelled') say(t('Cancelado.'));
      else say(r.method === 'folder' ? t('✔ Backup guardado em {p} ({s}).', { p: r.path, s: MB(file.size) }) : t('✔ Backup descarregado: {p} ({s}). Guarda-o num sítio seguro (nuvem, PC ou cartão).', { p: r.path, s: MB(file.size) }));
    } catch (e) { say(t('Não foi possível criar o backup: {e}', { e: e.message }), true); } finally { setBusy(''); }
  };
  const email = async () => {
    setBusy(t('A preparar o backup…')); setMsg(null);
    try {
      const { file, summary } = await make();
      const r = await shareBackupByEmail(file, summary);
      say(r.method === 'share' ? t('✔ Backup partilhado.') : r.method === 'mailto' ? t('Abri o email com o assunto preenchido. O ficheiro foi descarregado: anexa-o antes de enviar.') : t('Cancelado.'));
    } catch (e) { say(e.message, true); } finally { setBusy(''); }
  };
  const pick = async (file) => {
    if (!file) return; setMsg(null); setBusy(t('A verificar o ficheiro…'));
    try { setPending(await readBackup(file)); } catch (e) { say(e.message, true); } finally { setBusy(''); if (fileRef.current) fileRef.current.value = ''; }
  };
  const restore = async (mode) => {
    const b = pending; setPending(null); setBusy(t('A restaurar…'));
    try {
      const r = await restoreBackup(b, mode, (m) => setBusy(m));
      say(t('✔ Restauro concluído ({n} registos). A app vai recarregar…', { n: r.written }));
      setTimeout(() => location.reload(), 1500);
    } catch (e) { say(t('O restauro falhou: {e}', { e: e.message }), true); } finally { setBusy(''); }
  };

  return (
    <section id="set-backup" className="p-3 rounded-sm mb-4" style={box}>
      <h3 className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold mb-2" style={{ color: 'rgb(var(--c))' }}><DatabaseBackup size={14} /> {t('Cópia de segurança')}</h3>
      <p className="text-[10px] mb-3" style={{ color: 'rgb(var(--c) / 0.6)' }}>{t('Tudo o que guardas (pinos, notas, conversas, ativos, documentos, músicas e definições) vive só neste browser. Limpar os dados ou trocar de telemóvel apaga tudo: faz backups regulares.')}</p>

      {/* ID do utilizador */}
      <div className="flex items-center gap-2 p-2 rounded-sm mb-3" style={btn}>
        <span className="text-[10px] uppercase tracking-wider shrink-0" style={{ color: 'rgb(var(--c) / 0.6)' }}>{t('ID')}</span>
        {editing ? (
          <>
            <input value={draft} onChange={(e) => setDraft(e.target.value)} className="flex-1 min-w-0 bg-transparent outline-none text-xs" style={{ color: 'rgb(var(--c))' }} autoFocus aria-label={t('ID do utilizador')} />
            <button type="button" onClick={saveId} aria-label={t('Guardar')} className="p-1"><Check size={13} /></button>
            <button type="button" onClick={() => { setEditing(false); setDraft(uid); }} aria-label={t('Cancelar')} className="p-1"><X size={13} /></button>
          </>
        ) : (
          <>
            <code className="flex-1 min-w-0 truncate text-xs">{uid}</code>
            <button type="button" onClick={() => { setDraft(uid); setEditing(true); }} aria-label={t('Personalizar ID')} className="p-1"><Pencil size={12} /></button>
          </>
        )}
      </div>

      <label className="flex items-center gap-2 text-[11px] mb-3 cursor-pointer" style={{ color: 'rgb(var(--c) / 0.85)' }}>
        <input type="checkbox" checked={includeMaps} onChange={(e) => setIncludeMaps(e.target.checked)} style={{ accentColor: 'rgb(var(--c))' }} />
        {t('Incluir mapas offline (pode ocupar centenas de MB)')}
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button type="button" disabled={!!busy} onClick={exportAll} className="flex items-center justify-center gap-2 py-2.5 rounded-sm text-[11px] uppercase tracking-wider disabled:opacity-40" style={btn}>
          {window.showDirectoryPicker ? <FolderDown size={13} /> : <Download size={13} />} {t('Exportar tudo')}
        </button>
        <button type="button" disabled={!!busy} onClick={email} className="flex items-center justify-center gap-2 py-2.5 rounded-sm text-[11px] uppercase tracking-wider disabled:opacity-40" style={btn}>
          <Mail size={13} /> {t('Enviar por email')}
        </button>
        <label className={`flex items-center justify-center gap-2 py-2.5 rounded-sm text-[11px] uppercase tracking-wider cursor-pointer ${busy ? 'opacity-40 pointer-events-none' : ''}`} style={btn}>
          <Upload size={13} /> {t('Importar tudo')}
          <input ref={fileRef} type="file" accept=".zip,application/zip" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
        </label>
      </div>
      <p className="text-[10px] mt-2" style={{ color: 'rgb(var(--c) / 0.5)' }}>
        {window.showDirectoryPicker ? t('Exportar pede uma pasta e cria lá «Backup_Sobrevivencia_{id}».', { id: uid }) : t('Neste browser o backup é descarregado (pasta Transferências).')}
      </p>

      {busy && <p role="status" className="text-[11px] mt-2 animate-pulse" style={{ color: '#ffaa00' }}>{busy}</p>}
      {msg && <p role="status" className="text-[11px] mt-2" style={{ color: msg.err ? '#ef4444' : '#ffaa00' }}>{msg.text}</p>}

      {/* Confirmação do restauro: substituir ou fundir */}
      <RestoreDialog pending={pending} onPick={restore} onCancel={() => setPending(null)} />
    </section>
  );
}
