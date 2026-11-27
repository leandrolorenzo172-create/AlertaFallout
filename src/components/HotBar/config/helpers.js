// Formatações partilhadas pelos badges das abas
import { t, locale } from '@/i18n';

export const hhmm = (ms) => new Date(ms).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' });
export const mmss = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
// «pesquisa» (até 12 letras)
export const queryBadge = (q) => (q?.trim() ? `«${q.trim().slice(0, 12)}»` : '');
// "A ATUALIZAR" enquanto carrega, depois a hora da última sincronização
export const syncBadge = (s) => (s.loading ? t('A ATUALIZAR') : s.lastSync ? hhmm(s.lastSync) : '');
// interruptor com contador: ON quando ligado, senão o número de alertas
export const countBadge = (on, n) => (on ? 'ON' : String(n));
// opção "Todas/Todos" no início de um submenu de filtro
export const allOption = (label, selected) => ({ id: null, key: 'all', label, selected });
