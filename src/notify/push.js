// Notificações push (chegam com a app fechada): o telemóvel regista-se aqui e o GitHub Actions envia os avisos
// de greve (scripts/send-push.mjs). O código gerado tem de ser guardado no repositório (secret PUSH_SUBSCRIPTIONS).
// Chave pública VAPID (não é secreta); a privada está só no GitHub (secret VAPID_PRIVATE_KEY).
export const VAPID_PUBLIC = 'BJUMloYPF_iiynd3u8ispKS3NqXUXDwR2Nc7-MIy0BcBF5d9TaNQaYNkvXQFpj-PtuBMzZcbNLaQTg0UAcj9xi0';

const toBytes = (b64) => { const s = (b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'); return Uint8Array.from(atob(s), (c) => c.charCodeAt(0)); };
export const pushSupported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && typeof Notification !== 'undefined';

// Devolve o código deste telemóvel (JSON) para colar no GitHub, criando a subscrição se ainda não existir.
export async function getPushCode() {
  if (!pushSupported()) throw new Error('Este browser não suporta notificações push. No Android usa o Chrome com a app instalada no ecrã inicial.');
  const perm = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
  if (perm !== 'granted') throw new Error('As notificações estão bloqueadas. Ativa-as nas definições do telemóvel para esta app.');
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toBytes(VAPID_PUBLIC) });
  return JSON.stringify(sub.toJSON());
}
