// Ferramentas do menu ≡ por separador (ids iguais aos de TABS em HotBar.jsx).
// Cada item: { id, label (português; traduzido com t()), icon (lucide-react), badge? }
//  - id: nome da ação recebido pelo handler do separador (useQuickTools) ou por DEFAULT_ACTIONS no HotBar.
//  - badge: true = mostra o ponto vermelho quando o separador o ativar com setToolBadge(tab, id, true).
// Separadores sem entrada aqui usam DEFAULT_TOOLS.
import {
  SquarePen, History, Cpu, Eraser,
  LocateFixed, ShieldCheck, Layers, Ruler,
  FilePlus, Upload, Filter, ArrowDownWideNarrow,
  Activity, CalendarRange, Share2,
  Siren, ShieldAlert, SlidersHorizontal, RefreshCw,
  KeyRound, Volume2, RotateCcw, Info,
  ArrowUpToLine, Settings, LayoutGrid,
} from 'lucide-react';

export const TOOL_MENUS = {
  // Aba IA (Mr. Steel)
  assistente: [
    { id: 'novo', label: 'Novo chat', icon: SquarePen },
    { id: 'historico', label: 'Histórico', icon: History },
    { id: 'modo', label: 'Modo IA', icon: Cpu },
    { id: 'limpar', label: 'Limpar conversa', icon: Eraser },
  ],
  mapa: [
    { id: 'centrar', label: 'Centrar na posição', icon: LocateFixed },
    { id: 'marcadores', label: 'Marcadores / zonas seguras', icon: ShieldCheck },
    { id: 'camadas', label: 'Alternar camadas', icon: Layers },
    { id: 'medir', label: 'Medir distância', icon: Ruler },
  ],
  // Aba FICHEIROS (Ficheiros IA / Base de Conhecimento)
  conhecimento: [
    { id: 'nota', label: 'Novo ficheiro / nota', icon: FilePlus },
    { id: 'importar', label: 'Importar ficheiro', icon: Upload },
    { id: 'filtrar', label: 'Filtrar por tipo', icon: Filter },
    { id: 'ordenar', label: 'Ordenar recentes', icon: ArrowDownWideNarrow },
  ],
  pizza: [
    { id: 'leitura', label: 'Nova leitura', icon: Activity },
    { id: 'historico', label: 'Histórico de dados', icon: History },
    { id: 'periodo', label: 'Alternar período', icon: CalendarRange },
    { id: 'exportar', label: 'Exportar resumo', icon: Share2 },
  ],
  catastrofes: [
    { id: 'alertas', label: 'Alertas ativos', icon: Siren, badge: true },
    { id: 'protocolo', label: 'Protocolo de emergência', icon: ShieldAlert },
    { id: 'gravidade', label: 'Filtrar gravidade', icon: SlidersHorizontal },
    { id: 'atualizar', label: 'Atualizar agora', icon: RefreshCw },
  ],
  definicoes: [
    { id: 'chave', label: 'Chave de API / IA', icon: KeyRound },
    { id: 'audio', label: 'Áudio e alertas', icon: Volume2 },
    { id: 'repor', label: 'Repor predefinições', icon: RotateCcw },
    { id: 'sobre', label: 'Sobre o sistema', icon: Info },
  ],
};

// Conjunto por omissão (Guerra, Economia, Greves, Meteo, Rádio, Música, Mini Jogo, Manual): útil em qualquer vista.
// O Painel (aba principal) não usa ferramentas: o ≡ mostra a lista de abas (ver HotBar.jsx, MAIN_TAB).
export const DEFAULT_TOOLS = [
  { id: 'atualizar', label: 'Atualizar vista', icon: RefreshCw },
  { id: 'topo', label: 'Voltar ao topo', icon: ArrowUpToLine },
  { id: 'partilhar', label: 'Partilhar ligação', icon: Share2 },
  { id: 'definicoes', label: 'Definições', icon: Settings },
  { id: 'painel', label: 'Ir para o Painel', icon: LayoutGrid }, // no Painel, o ≡ abre a navegação entre abas
];

export const toolsFor = (tabId) => TOOL_MENUS[tabId] || DEFAULT_TOOLS;
