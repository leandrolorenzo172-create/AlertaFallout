// Contrato do menu ≡ (HotBar). Cada aba = 1 ficheiro em ./tabs/<aba>.config.js(x), registado por ordem em ./tabs/index.js.
// As abas só são criadas no código; o utilizador escolhe quais vê (e a ordem) em Definições > Separadores.

/**
 * Estado da aba devolvido por `useContext()` (qualquer objeto). É passado a todas as funções dinâmicas.
 * @typedef {Record<string, any>} HotBarCtx
 *
 * API que o motor entrega às ações (ver ../hotbarActions.js).
 * @typedef {Object} HotBarApi
 * @property {() => void} close                       fecha o menu
 * @property {(path: string) => void} navigate        fecha e muda de aba
 * @property {(id: string, ms?: number) => void} focus      destaca um cartão (focusCard) depois de `ms` (150)
 * @property {(id: string) => void} goSection          fecha + desliza até ao cartão e destaca-o
 * @property {(elementId: string) => void} scrollTo    desliza até um elemento (painéis abertos no topo da aba)
 * @property {(fn: Function, ms?: number) => void} later   executa depois de `ms` (120)
 * @property {() => void} playSelect                   som de seleção (as ações do motor já o tocam)
 *
 * Opção de um submenu.
 * @typedef {Object} HotBarOption
 * @property {string|null} id
 * @property {string} label                 texto PT (o motor traduz)
 * @property {string} [key]                 chave React (por omissão: id ou 'all')
 * @property {number|null} [count]          contador à direita
 * @property {boolean} [selected]           mostra ✓ e aria-pressed
 * @property {boolean} [disabled]
 * @property {import('react').ComponentType} [icon]   (layout 'list')
 * @property {(ctx: HotBarCtx, api: HotBarApi) => void} [run]  ação própria (senão usa submenu.onPick)
 *
 * Submenu (abre por baixo do item; o item fica com aria-expanded).
 * @typedef {Object} HotBarSubmenu
 * @property {(ctx: HotBarCtx) => boolean} isOpen
 * @property {(ctx: HotBarCtx) => void} toggle
 * @property {'chips'|'list'|'grid'} [layout]               por omissão 'chips'
 * @property {(ctx: HotBarCtx) => HotBarOption[]} [options]
 * @property {(opt: HotBarOption, ctx: HotBarCtx, api: HotBarApi) => void} [onPick]
 * @property {(ctx: HotBarCtx, api: HotBarApi) => import('react').ReactNode} [render]  conteúdo próprio (casos especiais)
 *
 * Item do menu ≡.
 * @typedef {Object} HotBarItemConfig
 * @property {string} id
 * @property {'item'|'separator'} [type]                    por omissão 'item'
 * @property {string | ((ctx: HotBarCtx) => string)} [label]  texto PT (o motor traduz com t()) ou função para rótulos dinâmicos
 * @property {import('react').ComponentType | ((ctx: HotBarCtx) => import('react').ComponentType)} [icon]
 * @property {string} [symbol]                              texto no lugar do ícone (ex.: '>>|')
 * @property {string} [symbolColor]
 * @property {(ctx: HotBarCtx, api: HotBarApi) => void} [run]   ação direta
 * @property {boolean | ((ctx: HotBarCtx) => boolean)} [keepOpen]  true = o menu fica aberto (estado visível)
 * @property {number} [runDelay]                            ms entre fechar e executar (deixa o menu sair antes do scroll)
 * @property {boolean} [toggle]                             é um interruptor: aria-pressed = isActive
 * @property {(ctx: HotBarCtx) => boolean} [isActive]       realce
 * @property {(ctx: HotBarCtx) => (string | {text: string, color?: string} | null)} [badge]  texto/contador à direita
 * @property {(ctx: HotBarCtx) => boolean} [alert]          borda e texto vermelhos + ponto a pulsar
 * @property {(ctx: HotBarCtx) => boolean} [dot]            só o ponto vermelho (filtro/modo ativo)
 * @property {(ctx: HotBarCtx) => boolean} [busy]           ícone a rodar (a atualizar)
 * @property {'default'|'warn'|'danger'|'rec' | ((ctx: HotBarCtx) => string)} [tone]
 * @property {(ctx: HotBarCtx) => boolean} [visibleWhen]
 * @property {(ctx: HotBarCtx) => boolean} [disabledWhen]
 * @property {string} [shortcut]                            tecla com o menu aberto (ex.: 'r')
 * @property {HotBarSubmenu} [submenu]
 *
 * Metadados do separador (barra inferior, rotas e Definições).
 * @typedef {Object} HotBarTabMeta
 * @property {string} id
 * @property {string} path
 * @property {string} label
 * @property {import('react').ComponentType} icon
 * @property {boolean} [alert]
 *
 * Configuração de uma aba.
 * @typedef {Object} HotBarTabConfig
 * @property {HotBarTabMeta} tab
 * @property {string} ariaLabel                             rótulo do botão ≡ nesta aba
 * @property {string} [title]                               título do menu (por omissão "Ferramentas · <aba>")
 * @property {string} [titleColor]                          cor do título (ex.: vermelho no ecrã SOS)
 * @property {() => HotBarCtx} [useContext]                 hook com o estado da aba (só corre com a aba ativa)
 * @property {(ctx: HotBarCtx) => void} [onEnter]           ao entrar na aba
 * @property {(ctx: HotBarCtx) => ({text: string, color?: string} | null)} [status]  linha de estado acima dos itens
 * @property {(ctx: HotBarCtx) => boolean} [fabAlert]       ponto vermelho no botão ≡
 * @property {number} [minWidth]                            largura mínima dos itens (px)
 * @property {HotBarItemConfig[]} [items]                   sem itens -> o menu mostra a navegação entre abas
 */

const fail = (where, msg) => { throw new Error(`[HotBar] ${where}: ${msg}`); };
const isFn = (v) => typeof v === 'function';
const isComp = (v) => isFn(v) || (v && typeof v === 'object' && '$$typeof' in v);

/** Valida uma aba (em desenvolvimento rebenta logo, para o erro não chegar ao utilizador). */
export function validateTabConfig(cfg) {
  const where = cfg?.tab?.id || '(sem id)';
  if (!cfg?.tab?.id || !cfg.tab.path?.startsWith('/') || !cfg.tab.label || !isComp(cfg.tab.icon)) fail(where, 'tab precisa de id, path ("/…"), label e icon');
  if (!cfg.ariaLabel) fail(where, 'falta ariaLabel');
  for (const k of ['useContext', 'onEnter', 'status', 'fabAlert']) if (cfg[k] != null && !isFn(cfg[k])) fail(where, `${k} tem de ser função`);
  if (!cfg.items) return cfg;
  const ids = new Set();
  for (const it of cfg.items) {
    const w = `${where}.${it.id}`;
    if (!it.id) fail(where, 'item sem id');
    if (ids.has(it.id)) fail(w, 'id repetido'); ids.add(it.id);
    if (it.type === 'separator') continue;
    if (!it.label) fail(w, 'falta label');
    if (!it.icon && !it.symbol) fail(w, 'falta icon ou symbol');
    if (!it.run && !it.submenu) fail(w, 'precisa de run ou submenu');
    if (it.submenu && (!isFn(it.submenu.isOpen) || !isFn(it.submenu.toggle))) fail(w, 'submenu precisa de isOpen e toggle');
    if (it.submenu && !it.submenu.render && !isFn(it.submenu.options)) fail(w, 'submenu precisa de options ou render');
    for (const k of ['isActive', 'badge', 'alert', 'dot', 'busy', 'visibleWhen', 'disabledWhen']) if (it[k] != null && !isFn(it[k])) fail(w, `${k} tem de ser função`);
    if (it.shortcut && it.shortcut.length !== 1) fail(w, 'shortcut é uma só tecla');
  }
  return cfg;
}

/** Valida o registo inteiro: ids e caminhos únicos. */
export function validateRegistry(list) {
  const ids = new Set(); const paths = new Set();
  for (const c of list) {
    validateTabConfig(c);
    if (ids.has(c.tab.id)) fail(c.tab.id, 'aba registada duas vezes');
    if (paths.has(c.tab.path)) fail(c.tab.id, `caminho ${c.tab.path} repetido`);
    ids.add(c.tab.id); paths.add(c.tab.path);
  }
  return list;
}

// Avalia um campo que pode ser valor ou função(ctx)
export const val = (v, ctx, fallback) => (v === undefined ? fallback : isFn(v) ? v(ctx) : v);
