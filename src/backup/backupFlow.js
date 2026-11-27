// Fluxos de backup reutilizáveis fora das Definições (ex.: menu ≡ da aba IDU):
// exportar para o dispositivo, enviar por email e importar com confirmação Fundir / Substituir.
import { useSyncExternalStore } from 'react';
import { createBackup, saveBackupFile, shareBackupByEmail, readBackup, restoreBackup } from './backupManager';
import { t } from '@/i18n';

// { busy: '' | texto de progresso, msg: { text, err } | null, pending: backup lido à espera de confirmação | null }
let state = { busy: '', msg: null, pending: null };
const subs = new Set();
const set = (p) => { state = { ...state, ...p }; subs.forEach((f) => f()); };
const subscribe = (f) => { subs.add(f); return () => subs.delete(f); };
export const useBackupFlow = () => useSyncExternalStore(subscribe, () => state);

let msgTimer = null;
const say = (text, err = false) => { clearTimeout(msgTimer); set({ msg: { text, err } }); msgTimer = setTimeout(() => set({ msg: null }), 8000); };
const MB = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const make = () => createBackup({ includeMaps: false, onProgress: (m) => set({ busy: m }) }); // sem mapas: ficheiro pequeno

// Backup completo para o dispositivo (pasta escolhida ou Transferências)
export async function exportToDevice() {
  if (state.busy) return;
  set({ busy: t('A preparar o backup…'), msg: null });
  try {
    const { file } = await make();
    const r = await saveBackupFile(file);
    if (r.method === 'cancelled') say(t('Cancelado.'));
    else say(r.method === 'folder' ? t('✔ Backup guardado em {p} ({s}).', { p: r.path, s: MB(file.size) }) : t('✔ Backup descarregado: {p} ({s}). Guarda-o num sítio seguro (nuvem, PC ou cartão).', { p: r.path, s: MB(file.size) }));
  } catch (e) { say(t('Não foi possível criar o backup: {e}', { e: e.message }), true); } finally { set({ busy: '' }); }
}

// Backup completo por email (partilha com anexo; senão email + descarga)
export async function emailBackup() {
  if (state.busy) return;
  set({ busy: t('A preparar o backup…'), msg: null });
  try {
    const { file, summary } = await make();
    const r = await shareBackupByEmail(file, summary);
    say(r.method === 'share' ? t('✔ Backup partilhado.') : r.method === 'mailto' ? t('Abri o email com o assunto preenchido. O ficheiro foi descarregado: anexa-o antes de enviar.') : t('Cancelado.'));
  } catch (e) { say(e.message, true); } finally { set({ busy: '' }); }
}

// Abre o seletor de ficheiros (tem de ser chamado diretamente no clique) e valida o .zip
export function pickBackupFile() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.zip,application/zip'; input.style.display = 'none';
  input.onchange = async () => {
    const file = input.files?.[0]; input.remove();
    if (!file) return;
    set({ busy: t('A verificar o ficheiro…'), msg: null });
    try { set({ pending: await readBackup(file) }); } catch (e) { say(e.message, true); } finally { set({ busy: '' }); }
  };
  document.body.appendChild(input);
  input.click();
}

export const cancelRestore = () => set({ pending: null });

// Restaura ('merge' | 'replace') e recarrega a app com os dados novos
export async function confirmRestore(mode) {
  const b = state.pending; if (!b) return;
  set({ pending: null, busy: t('A restaurar…') });
  try {
    const r = await restoreBackup(b, mode, (m) => set({ busy: m }));
    say(t('✔ Restauro concluído ({n} registos). A app vai recarregar…', { n: r.written }));
    setTimeout(() => location.reload(), 1500);
  } catch (e) { say(t('O restauro falhou: {e}', { e: e.message }), true); } finally { set({ busy: '' }); }
}
