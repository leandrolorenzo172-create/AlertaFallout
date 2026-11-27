// REGISTO DAS ABAS — a ordem desta lista é a ordem por omissão da barra inferior (o utilizador pode reordenar/ocultar em Definições).
//
// As abas são criadas só no código. O utilizador não cria abas: apenas escolhe, em Definições > Separadores,
// quais das abas registadas aqui quer ver e por que ordem (useVisibleTabs aplica essa escolha).
//
// ── Criar uma aba nova ───────────────────────────────────────────────────────────────────────────
// 1. Criar  src/components/HotBar/config/tabs/<id>.config.js  (copiar um existente, ex.: manual.config.js):
//      export default {
//        tab: { id: '<id>', path: '/<id>', label: 'Nome PT', icon: IconeLucide },
//        ariaLabel: 'Ferramentas de …',
//        useContext: useEstadoDaAba,          // opcional: hook com o estado (store da aba)
//        items: [ { id, label, icon, run: (ctx, api) => … }, … ],   // sem items => menu de navegação
//      };
//    (contrato completo e opções em ../hotbarSchema.js)
// 2. Importar e acrescentar à lista REGISTRY abaixo, na posição desejada.
// 3. Acrescentar o ecrã da aba em src/App.jsx (objeto `elements`, chave = id).
// 4. Traduções EN dos textos novos em src/i18n/en.js.
// Não é preciso mexer em HotBar.jsx, HotBarMenu.jsx nem HotBarMenuItem.jsx.
//
// ── Alterar uma aba ──────────────────────────────────────────────────────────────────────────────
// Editar apenas o ficheiro dessa aba. Sessões a trabalhar em abas diferentes não tocam nos mesmos ficheiros.
import { useSettings, orderTabs } from '@/theme';
import { validateRegistry } from '../hotbarSchema';
import dashboard from './dashboard.config';
import guerra from './guerra.config';
import economia from './economia.config';
import ciber from './ciber.config';
import greves from './greves.config';
import catastrofes from './catastrofes.config';
import meteo from './meteo.config';
import radio from './radio.config';
import musica from './musica.config';
import minijogo from './minijogo.config';
import pizza from './pizza.config';
import assistente from './assistente.config';
import conhecimento from './conhecimento.config';
import manual from './manual.config';
import mapa from './mapa.config';
import idu from './idu.config';
import definicoes from './definicoes.config';

export const REGISTRY = [dashboard, guerra, economia, ciber, greves, catastrofes, meteo, radio, musica, minijogo, pizza, assistente, conhecimento, manual, mapa, idu, definicoes];
if (import.meta.env.DEV) validateRegistry(REGISTRY); // erros de configuração aparecem logo em desenvolvimento

// Metadados dos separadores (barra inferior, rotas, Definições) — mesma forma de sempre: { id, path, label, icon, alert }
export const TABS = REGISTRY.map((c) => c.tab);

const BY_PATH = new Map(REGISTRY.map((c) => [c.tab.path, c]));
export const getTabByPath = (path) => BY_PATH.get(path) || dashboard;
export const getTabConfig = (id) => REGISTRY.find((c) => c.tab.id === id) || null;

// Separadores visíveis, pela ordem escolhida pelo utilizador nas Definições
export function useVisibleTabs() {
  const s = useSettings();
  return orderTabs(TABS, s.order).filter((tab) => !s.hidden.includes(tab.id));
}
