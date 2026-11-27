import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, Menu, Shield, Skull, AlertTriangle, Cloud, TrendingUp, Bot, Book, MapPin, Bell, Radio as RadioIcon, BrainCircuit, Disc3, Settings, Gamepad2, TrendingDown, Megaphone, ShieldAlert, Info, Languages, BellRing, Send, RotateCcw, LocateFixed, Layers, Ruler, Footprints, RefreshCw, ArrowUpToLine, Filter, ArrowDownUp, StickyNote, FilePlus, Trash2, Play, Pause, SkipForward, SkipBack, SlidersHorizontal, AudioLines, Shuffle, RotateCw, Volume2, VolumeX, Maximize, Trophy, HelpCircle, ChevronsDown, Anchor, CalendarDays, ChevronRight, Check, Siren, Tag, Search, LineChart, BarChart3, PlusCircle, Globe, Calculator } from 'lucide-react';
import { useRadioRemote, onToggleRadio, onNextStation, onPrevStation, onToggleRecordMp3, requestRadioState } from './audio/radioRemote';
import { Power, Circle } from 'lucide-react';
import { useAiTools, onNewChat, onToggleHistory, onToggleAiMode, toggleAiSub, selectedModel, loadAvailableModels, onSelectAiModel } from './lib/ai/aiTools';
import { useAiConfig } from './lib/ai/config';
import { IS_ARTIFACT } from './api/base44Client';
import { SquarePen, History, BrainCog, Cpu } from 'lucide-react';
import { usePizzaTools, onRefreshPizzaIndex, onTogglePizzaAlert, PIZZA_PEAK, PIZZA_SOURCES_ID } from './pizza/pizzaTools';
import { Newspaper } from 'lucide-react';
import { useCatTools, toggleActiveOnly, openProtocol, cycleCatFilter, openCatSearch, onRefreshCat, CAT_FILTERS } from './catastrophe/catTools';
import { useCyberTools, onRefreshCyber, onRecalcRisk, setThreatType, toggleCritical, toggleCyberSub } from './cyber/cyberTools';
import { THREAT_TYPES } from './lib/cyberRisk';
import { useWarTools, toggleAlerts, cycleSeverity, setWarRegion, openWarSearch, onRefreshWar, toggleWarSub } from './war/warTools';
import { useEconomyTools, toggleUrgent, toggleEcoSub, setEcoTheme, openEcoSearch, onRefreshEconomy, requestAddAsset, ECO_THEMES } from './economy/economyTools';
import { useStrikesTools, toggleOnlyActive, toggleStrikeSub, setSector as setStrikeSector, openSearch, onRefreshStrikes, STRIKE_SECTIONS } from './strikes/strikesTools';
import { useMeteoTools, onRefreshWeather, toggleSub, METEO_SECTIONS, MAIN_CITIES } from './weather/weatherTools';
import { useLoc, LOCATIONS, setLocManual } from './location';
import { focusCard } from './settingsActions';
import { onTogglePause, onRestart, onSwitchGame, onToggleSound, onFullscreen, openGamePanel, bumpSound, GAME_LABEL } from './game/gameRemote';
import { useGameRemote } from './game/useGameRemote';
import { getPrefs as getGamePrefs } from './game/eraWar/audio';
import { getSound as getLcdSound } from './game/lcd/engine';
import { useMusicRemote, onTogglePlay, onNextTrack, onPrevTrack, onCycleEq, onCycleBoost, onToggleShuffle, EQ_LABEL, BOOST_LABEL } from './music/musicRemote';
import { useFilesView, openFilesPanel, requestImport, askReset } from './files/filesTools';
import { useManualView, refreshView, scrollTop, openPanel, filtersActive } from './manual/manualTools';
import { useMapTools, toggleMode, nextLayer, openRoute, runMapAction, LAYER_LABEL } from './map/mapTools';
import { runSettingsAction } from './settingsActions';
import { usePipBoySound } from './usePipBoySound';
import { useSettings, orderTabs } from './theme';
import { t, isEn, locale } from '@/i18n';

// Separadores visíveis, pela ordem escolhida nas Definições
export function useVisibleTabs() {
  const s = useSettings();
  return orderTabs(TABS, s.order).filter((t) => !s.hidden.includes(t.id));
}

export const TABS = [
  { id: 'dashboard', path: '/dashboard', label: 'Painel', icon: Shield, alert: true },
  { id: 'guerra', path: '/guerra', label: 'Guerra', icon: Skull, alert: true },
  { id: 'economia', path: '/economia', label: 'Economia', icon: TrendingDown },
  { id: 'ciber', path: '/ciber', label: 'Ciberataques', icon: ShieldAlert },
  { id: 'greves', path: '/greves', label: 'Greves', icon: Megaphone },
  { id: 'catastrofes', path: '/catastrofes', label: 'Catástrofes', icon: AlertTriangle },
  { id: 'meteo', path: '/meteo', label: 'Meteo', icon: Cloud },
  { id: 'radio', path: '/radio', label: 'Rádio FM', icon: RadioIcon },
  { id: 'musica', path: '/musica', label: 'Música', icon: Disc3 },
  { id: 'minijogo', path: '/minijogo', label: 'Mini Jogo', icon: Gamepad2 },
  { id: 'pizza', path: '/pizza', label: 'Pizza', icon: TrendingUp },
  { id: 'assistente', path: '/assistente', label: 'IA', icon: Bot },
  { id: 'conhecimento', path: '/conhecimento', label: 'Ficheiros IA', icon: BrainCircuit },
  { id: 'manual', path: '/manual', label: 'Manual', icon: Book },
  { id: 'mapa', path: '/mapa', label: 'Mapa', icon: MapPin },
  { id: 'definicoes', path: '/definicoes', label: 'Definições', icon: Settings },
];

// Na aba DEFINIÇÕES, o menu ≡ mostra estas 7 ferramentas rápidas (pela ordem pedida) em vez da navegação.
// Cada uma envia uma ação tratada pelos cartões das Definições (src/settingsActions.js) e o menu fecha.
export const SETTINGS_TOOLS = [
  { id: 'sobre', label: 'Sobre o sistema', icon: Info },
  { id: 'idioma', label: 'Idioma', icon: Languages },
  { id: 'localizacao', label: 'Localização', icon: MapPin },
  { id: 'notificacoes', label: 'Notificações', icon: Bell },
  { id: 'ativar', label: 'Ativar notificação', icon: BellRing },
  { id: 'teste', label: 'Teste', icon: Send },
  { id: 'repor', label: 'Repor predefinições', icon: RotateCcw, warn: true },
];

// Na aba MAPA, o menu ≡ mostra estas 5 ferramentas (src/map/mapTools.js). Os modos (pinos, medir) são exclusivos.
export const MAP_TOOLS = [
  { id: 'center', label: 'Centrar posição', icon: LocateFixed },
  { id: 'pin', label: 'Marcadores / Pins', icon: MapPin, mode: true },
  { id: 'layers', label: 'Alternar camadas', icon: Layers, keepOpen: true },
  { id: 'measure', label: 'Medir distância', icon: Ruler, mode: true },
  { id: 'route', label: 'Rota', icon: Footprints, mode: true }, // rota a pé no mapa online (A -> B pelas ruas)
];

// Na aba MANUAL, o menu ≡ mostra estas 4 ferramentas (src/manual/manualTools.js)
export const MANUAL_TOOLS = [
  { id: 'refresh', label: 'Atualizar vista', icon: RefreshCw },
  { id: 'top', label: 'Voltar ao topo', icon: ArrowUpToLine },
  { id: 'filter', label: 'Filtrar por tipo', icon: Filter, panel: true },
  { id: 'organize', label: 'Organizar documentos', icon: ArrowDownUp, panel: true },
];

// Na aba FICHEIROS, o menu ≡ gere a base de conhecimento da IA (src/files/filesTools.js)
export const FILES_TOOLS = [
  { id: 'note', label: 'Notas', icon: StickyNote, panel: true },
  { id: 'import', label: 'Importar ficheiro', icon: FilePlus },
  { id: 'filter', label: 'Filtrar por tipo', icon: Filter, panel: true },
  { id: 'sort', label: 'Ordenar', icon: ArrowDownUp, panel: true },
  { id: 'reset', label: 'Eliminar biblioteca', icon: Trash2, danger: true },
];

// Na aba MÚSICA, o menu ≡ controla o leitor (src/music/musicRemote.js). Fica aberto para se verem os estados.
export const MUSIC_TOOLS = [
  { id: 'play', label: 'Play / Pause', icon: Play, run: onTogglePlay },
  { id: 'next', label: 'Próxima faixa', icon: SkipForward, run: onNextTrack },
  { id: 'prev', label: 'Faixa anterior', icon: SkipBack, run: onPrevTrack },
  { id: 'eq', label: 'Equalizador', icon: SlidersHorizontal, run: onCycleEq },
  { id: 'boost', label: 'Bass / Loudness', icon: AudioLines, run: onCycleBoost },
  { id: 'shuffle', label: 'Aleatório', icon: Shuffle, run: onToggleShuffle },
];

// Na aba MINI JOGO, o menu ≡ controla a partida, o som e o ecrã (src/game/gameRemote.js)
export const GAME_TOOLS = [
  { id: 'pause', label: 'Pausar / Retomar', icon: Pause },
  { id: 'restart', label: 'Reiniciar partida', icon: RotateCw },
  { id: 'switch', label: 'Trocar de jogo', icon: Gamepad2 },
  { id: 'sound', label: 'Áudio do jogo', icon: Volume2 },
  { id: 'fullscreen', label: 'Ecrã inteiro', icon: Maximize },
  { id: 'stats', label: 'Recordes', icon: Trophy },
  { id: 'help', label: 'Ajuda / Controlos', icon: HelpCircle },
];

// Na aba METEO, o menu ≡ atualiza, salta entre secções e muda a cidade de referência (src/weather/weatherTools.js)
export const METEO_TOOLS = [
  { id: 'refresh', label: 'Atualizar agora', icon: RefreshCw },
  { id: 'jump', label: 'Saltar para secção', icon: ChevronsDown, sub: true },
  { id: 'city', label: 'Cidade principal', icon: MapPin, sub: true },
  { id: 'sea', label: 'Avisos marítimos', icon: Anchor },
  { id: 'forecast', label: 'Previsão 15 dias', icon: CalendarDays },
];

// Na aba GREVES, o menu ≡ filtra, pesquisa e navega na lista (src/strikes/strikesTools.js)
export const STRIKE_TOOLS = [
  { id: 'active', label: 'Alertas ativos', icon: Siren },
  { id: 'jump', label: 'Saltar para secção', icon: ChevronsDown, sub: true },
  { id: 'sector', label: 'Filtrar por setor', icon: Tag, sub: true },
  { id: 'search', label: 'Pesquisar', icon: Search },
  { id: 'refresh', label: 'Atualizar dados', icon: RefreshCw },
  { id: 'top', label: 'Topo da lista', icon: ArrowUpToLine },
];

// Na aba ECONOMIA, o menu ≡ filtra notícias, gere os "Meus ativos" e atualiza (src/economy/economyTools.js)
export const ECO_TOOLS = [
  { id: 'urgent', label: 'Alertas urgentes', icon: Siren },
  { id: 'assets', label: 'Meus ativos', icon: LineChart, sub: true },
  { id: 'theme', label: 'Filtrar por tema', icon: BarChart3, sub: true },
  { id: 'search', label: 'Pesquisar', icon: Search },
  { id: 'refresh', label: 'Atualizar dados', icon: RefreshCw },
  { id: 'top', label: 'Topo da lista', icon: ArrowUpToLine },
];

// Na aba GUERRA, o menu ≡ filtra alertas, gravidade e região, pesquisa e atualiza (src/war/warTools.js)
export const WAR_TOOLS = [
  { id: 'alerts', label: 'Alertas ativos', icon: Siren },
  { id: 'severity', label: 'Filtrar gravidade', icon: SlidersHorizontal },
  { id: 'region', label: 'Filtrar por região', icon: Globe, sub: true },
  { id: 'search', label: 'Pesquisar', icon: Search },
  { id: 'refresh', label: 'Atualizar agora', icon: RefreshCw },
  { id: 'top', label: 'Voltar ao topo', icon: ArrowUpToLine },
];

// Na aba CIBERATAQUES, o menu ≡ atualiza o feed, filtra ameaças/gravidade e recalcula o risco (src/cyber/cyberTools.js)
export const CYBER_TOOLS = [
  { id: 'refresh', label: 'Atualizar feed', icon: RefreshCw },
  { id: 'type', label: 'Filtrar ameaça', icon: Filter, sub: true },
  { id: 'critical', label: 'Alertas críticos', icon: Siren },
  { id: 'recalc', label: 'Recalcular risco', icon: Calculator },
];

// Na aba CATÁSTROFES, o menu ≡ filtra alertas, abre o protocolo de emergência, pesquisa e atualiza (src/catastrophe/catTools.js)
export const CAT_TOOLS = [
  { id: 'active', label: 'Alertas ativos', icon: Siren },
  { id: 'protocol', label: 'Protocolo de emergência', icon: ShieldAlert },
  { id: 'filter', label: 'Filtrar gravidade / tipo', icon: SlidersHorizontal },
  { id: 'search', label: 'Pesquisar', icon: Search },
  { id: 'refresh', label: 'Atualizar agora', icon: RefreshCw },
  { id: 'top', label: 'Voltar ao topo', icon: ArrowUpToLine },
];

// Na aba RÁDIO, o menu ≡ controla o sintonizador e grava (src/audio/radioRemote.js). Fica aberto para se ver o estado.
export const RADIO_TOOLS = [
  { id: 'power', label: 'Ligar / Desligar', icon: Power, sym: '⏻', run: onToggleRadio },
  { id: 'next', label: 'Próxima estação', icon: SkipForward, sym: '>>|', run: onNextStation },
  { id: 'prev', label: 'Estação anterior', icon: SkipBack, sym: '|<<', run: onPrevStation },
  { id: 'rec', label: 'Rec', icon: Circle, sym: '●', run: onToggleRecordMp3 },
];

// Na aba PIZZA, o menu ≡ atualiza o índice, mostra as fontes do cálculo e liga o alerta de pico (src/pizza/pizzaTools.js)
export const PIZZA_TOOLS = [
  { id: 'refresh', label: 'Atualizar índice', icon: RefreshCw },
  { id: 'sources', label: 'Fontes do cálculo', icon: Newspaper },
  { id: 'alert', label: 'Alerta', icon: Siren },
];

// Na aba IA (MR. STEEL), o menu ≡ gere a conversa, o modo e o modelo de IA (src/lib/ai/aiTools.js)
export const AI_TOOLS = [
  { id: 'new', label: 'Novo chat', icon: SquarePen },
  { id: 'history', label: 'Histórico', icon: History },
  { id: 'mode', label: 'Modo IA', icon: BrainCog },
  { id: 'model', label: 'Modelo IA', icon: Cpu, sub: true },
];

export default function HotBar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { playTabSound, playSelectSound } = usePipBoySound();
  const tabs = useVisibleTabs();

  const activeTab = TABS.find(tab => location.pathname === tab.path)?.id || 'dashboard';

  const handleToggle = () => {
    playTabSound();
    setOpen(!open);
  };

  const handleSelect = (tab) => {
    playSelectSound();
    navigate(tab.path);
    setOpen(false);
  };
  const inSettings = activeTab === 'definicoes';
  const inMap = activeTab === 'mapa';
  const inManual = activeTab === 'manual';
  const inFiles = activeTab === 'conhecimento';
  const inMusic = activeTab === 'musica';
  const inGame = activeTab === 'minijogo';
  const inMeteo = activeTab === 'meteo';
  const inStrikes = activeTab === 'greves';
  const inEco = activeTab === 'economia';
  const inWar = activeTab === 'guerra';
  const inCyber = activeTab === 'ciber';
  const inCat = activeTab === 'catastrofes';
  const inRadio = activeTab === 'radio';
  const inPizza = activeTab === 'pizza';
  const inAi = activeTab === 'assistente';
  const aiTools = useAiTools();
  useAiConfig(); // volta a desenhar quando a chave ou o modelo mudam
  const model = selectedModel();
  const runAiTool = (tool) => {
    playSelectSound();
    if (tool.id === 'mode') { onToggleAiMode(); return; }                  // fica aberto: mostra o modo novo
    if (tool.id === 'model') {                                              // abre a lista real de modelos da API
      if (!aiTools.sub) loadAvailableModels();
      toggleAiSub('model'); return;
    }
    setOpen(false);
    if (tool.id === 'new') onNewChat();
    else if (tool.id === 'history') onToggleHistory();
  };
  const pizza = usePizzaTools();
  const pizzaPeak = (pizza.level || 0) >= PIZZA_PEAK;
  // onShowCalculationSources: vai até "Indicadores Atuais" e destaca as contagens e manchetes que pesam no índice
  const onShowCalculationSources = () => { setOpen(false); setTimeout(() => focusCard(PIZZA_SOURCES_ID), 150); };
  const runPizzaTool = (tool) => {
    playSelectSound();
    if (tool.id === 'refresh') onRefreshPizzaIndex();        // fica aberto: "A ATUALIZAR" e depois a variação
    else if (tool.id === 'sources') onShowCalculationSources();
    else if (tool.id === 'alert') onTogglePizzaAlert();      // ON/OFF; o ponto vermelho acende com alerta ativo ou índice >= 7,5
  };
  const radio = useRadioRemote();
  React.useEffect(() => { if (inRadio) requestRadioState(); }, [inRadio]); // estado real do sintonizador ao entrar na aba
  const [recTick, setRecTick] = useState(0); // relógio da gravação (mm:ss)
  React.useEffect(() => { if (!radio.isRecording) return undefined; const id = setInterval(() => setRecTick((x) => x + 1), 1000); return () => clearInterval(id); }, [radio.isRecording]);
  const mmss = (ms) => { const s2 = Math.max(0, Math.floor(ms / 1000)); return `${String(Math.floor(s2 / 60)).padStart(2, '0')}:${String(s2 % 60).padStart(2, '0')}`; };
  const cat = useCatTools();
  const runCatTool = (tool) => {
    playSelectSound();
    if (tool.id === 'filter') { cycleCatFilter(); return; }        // Todas -> Críticas -> Sismos -> Incêndios -> Meteorologia/Cheias (fica aberto)
    if (tool.id === 'refresh') { onRefreshCat(); return; }          // fica aberto: "A ATUALIZAR" e depois a hora
    setOpen(false);
    if (tool.id === 'active') { toggleActiveOnly(); setTimeout(() => focusCard('cat-lista'), 150); }
    else if (tool.id === 'protocol') openProtocol(true);
    else if (tool.id === 'search') { openCatSearch(true); setTimeout(() => focusCard('cat-lista'), 150); }
    else if (tool.id === 'top') setTimeout(scrollTop, 120);
  };
  const cyber = useCyberTools();
  const runCyberTool = (tool) => {
    playSelectSound();
    if (tool.sub) { toggleCyberSub(tool.id); return; }                 // sublista de tipos de ameaça
    if (tool.id === 'refresh') { onRefreshCyber(); return; }            // volta a ler as 13 fontes; fica aberto
    if (tool.id === 'recalc') { onRecalcRisk(); setTimeout(() => focusCard('ciber-risco'), 100); return; } // mostra a pontuação nova
    setOpen(false);
    if (tool.id === 'critical') { toggleCritical(); setTimeout(() => focusCard('ciber-lista'), 150); }
  };
  const war = useWarTools();
  const runWarTool = (tool) => {
    playSelectSound();
    if (tool.sub) { toggleWarSub(tool.id); return; }              // sublista de regiões
    if (tool.id === 'severity') { cycleSeverity(); return; }       // Todas -> >= 5 -> >= 7 (fica aberto)
    if (tool.id === 'refresh') { onRefreshWar(); return; }         // fica aberto: "A ATUALIZAR" e depois a hora
    setOpen(false);
    if (tool.id === 'alerts') { toggleAlerts(); setTimeout(() => focusCard('guerra-lista'), 150); }
    else if (tool.id === 'search') { openWarSearch(true); setTimeout(() => focusCard('guerra-lista'), 150); }
    else if (tool.id === 'top') setTimeout(scrollTop, 120);
  };
  const eco = useEconomyTools();
  const runEcoTool = (tool) => {
    playSelectSound();
    if (tool.sub) { toggleEcoSub(tool.id); return; }               // sublista (ativos / temas)
    if (tool.id === 'refresh') { onRefreshEconomy(); return; }      // índice, notícias e cotações; fica aberto
    setOpen(false);
    if (tool.id === 'urgent') { toggleUrgent(); setTimeout(() => focusCard('eco-noticias'), 150); }
    else if (tool.id === 'search') { openEcoSearch(true); setTimeout(() => focusCard('eco-noticias'), 150); }
    else if (tool.id === 'top') setTimeout(scrollTop, 120);
  };
  const strikes = useStrikesTools();
  const runStrikeTool = (tool) => {
    playSelectSound();
    if (tool.sub) { toggleStrikeSub(tool.id); return; }               // sublista (secções / setores)
    if (tool.id === 'refresh') { onRefreshStrikes(); return; }       // fica aberto: "A ATUALIZAR" e depois a hora
    setOpen(false);
    if (tool.id === 'active') { toggleOnlyActive(); setTimeout(() => focusCard('greves-proximas'), 150); }
    else if (tool.id === 'search') { openSearch(true); setTimeout(() => focusCard('greves-lista'), 150); }
    else if (tool.id === 'top') setTimeout(scrollTop, 120);
  };
  const meteo = useMeteoTools();
  const loc = useLoc();
  const goSection = (id) => { setOpen(false); setTimeout(() => focusCard(id), 150); }; // scroll suave + destaque breve
  const runMeteoTool = (tool) => {
    playSelectSound();
    if (tool.id === 'refresh') onRefreshWeather();            // fica aberto: mostra "A ATUALIZAR" e depois a hora
    else if (tool.sub) toggleSub(tool.id);                     // abre a sublista (secções / cidades)
    else if (tool.id === 'sea') goSection('meteo-mar');
    else if (tool.id === 'forecast') goSection('meteo-15dias');
  };
  const pickCity = (name) => {
    const l = LOCATIONS.find((x) => x.name === name); if (!l) return;
    playSelectSound(); setLocManual(l.id); toggleSub('city');
    goSection('meteo-15dias'); // a previsão de 15 dias recarrega para a cidade nova
  };
  const hhmm = (ms) => new Date(ms).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' });
  const gameState = useGameRemote();
  const gameSound = () => {
    if (gameState.game === 'erawar') { const p = getGamePrefs(); return p.music && p.sfx ? ['SOM ON', true] : p.music ? ['SÓ MÚSICA', true] : p.sfx ? ['SÓ EFEITOS', true] : ['SOM OFF', false]; }
    return getLcdSound() ? ['SOM ON', true] : ['SOM OFF', false];
  };
  const runGameTool = (tool) => {
    playSelectSound();
    if (tool.id === 'pause') onTogglePause();
    else if (tool.id === 'restart') { setOpen(false); onRestart(); }
    else if (tool.id === 'switch') onSwitchGame();               // fica aberto: vê-se o jogo escolhido
    else if (tool.id === 'sound') { onToggleSound(); setTimeout(bumpSound, 120); }
    else if (tool.id === 'fullscreen') { setOpen(false); onFullscreen(); }
    else { setOpen(false); openGamePanel(tool.id); }            // stats / help
  };
  const music = useMusicRemote();
  // estado de cada ferramenta de música: [texto à direita, ativo?]
  const musicInfo = (id) => ({
    play: [music.isPlaying ? 'PAUSE' : 'PLAY', music.isPlaying],
    next: ['>>|', false],
    prev: ['|<<', false],
    eq: [t(EQ_LABEL[music.eq]).toUpperCase(), music.eq !== 'normal'],
    boost: [BOOST_LABEL[music.boost], music.boost !== 'off'],
    shuffle: [music.shuffle ? 'ON' : 'OFF', music.shuffle],
  }[id]);
  const filesView = useFilesView();
  const runFilesTool = (tool) => {
    playSelectSound();
    setOpen(false);
    if (tool.id === 'import') requestImport();            // síncrono: o seletor de ficheiros precisa do gesto do utilizador
    else if (tool.id === 'reset') askReset(true);           // abre a confirmação SIM / NÃO
    else if (tool.panel) {
      const willOpen = filesView.panel !== tool.id;
      openFilesPanel(tool.id);
      if (willOpen) setTimeout(() => document.getElementById('files-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    }
  };
  const manualView = useManualView();
  const runManualTool = (tool) => {
    playSelectSound();
    setOpen(false);
    if (tool.id === 'refresh') refreshView();
    else if (tool.id === 'top') setTimeout(scrollTop, 120);
    else if (tool.panel) {
      const willOpen = manualView.panel !== tool.id;
      openPanel(tool.id);
      // o painel abre no topo da estante: leva o utilizador até ele
      if (willOpen) setTimeout(() => document.getElementById('manual-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    }
  };
  const mapState = useMapTools();
  const runMapTool = (tool) => {
    playSelectSound();
    if (tool.id === 'layers') { nextLayer(); return; } // fica aberto para ver/alternar a camada
    setOpen(false);
    if (tool.id === 'center') setTimeout(() => runMapAction('center'), 120);
    else if (tool.mode) toggleMode(tool.id);
    else if (tool.id === 'route') openRoute(true);
  };
  const runTool = (tool) => {
    playSelectSound();
    setOpen(false); // fecha primeiro, para o scroll e o destaque ficarem visíveis
    setTimeout(() => runSettingsAction(tool.id), 120);
  };

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40"
            style={{ background: '#00000088' }}
          />
        )}
      </AnimatePresence>

      {/* Expanded menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.18 }}
            data-hotbar-menu=""
            className="fixed z-50 right-4 flex flex-col gap-1.5 no-scrollbar"
            style={{ bottom: '136px', maxHeight: '62vh', overflowY: 'auto' }}
          >
            {(inAi || inPizza || inRadio || inCat || inCyber || inWar || inEco || inStrikes || inMeteo || inGame || inMusic || inFiles || inManual || inMap || inSettings) && (
              <p className="px-1 text-[10px] uppercase tracking-widest text-right" style={{ color: 'rgb(var(--c) / 0.6)' }}>
                {t('Ferramentas')} · {t(TABS.find((x) => x.id === activeTab)?.label || '')}
              </p>
            )}
            {inAi && AI_TOOLS.map((tool, index) => {
              const modelLabel = IS_ARTIFACT ? 'CLAUDE.AI' : model ? model.label.toUpperCase() : t('BASE LOCAL');
              const info = {
                mode: aiTools.aiMode === 'local' ? t('BASE LOCAL') : t('IA COMPLETA'),
                model: modelLabel, new: '', history: '',
              }[tool.id];
              const open2 = tool.sub && aiTools.sub === tool.id;
              const active = open2 || (tool.id === 'mode' && aiTools.aiMode === 'full');
              const Icon = tool.icon;
              return (
                <React.Fragment key={tool.id}>
                  <motion.button
                    type="button"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => runAiTool(tool)}
                    aria-expanded={tool.sub ? open2 : undefined}
                    aria-pressed={tool.id === 'mode' ? aiTools.aiMode === 'full' : undefined}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded whitespace-nowrap transition-all"
                    style={{
                      background: active ? 'rgb(var(--c) / 0.16)' : 'rgb(var(--cd) / 0.95)',
                      border: `1px solid ${active ? 'rgb(var(--c))' : 'rgb(var(--c) / 0.3)'}`,
                      color: active ? 'rgb(var(--c))' : 'rgb(var(--c) / 0.85)',
                      backdropFilter: 'blur(10px)', boxShadow: active ? '0 0 12px rgb(var(--c) / 0.45)' : '0 0 8px rgb(var(--c) / 0.12)', minWidth: '240px',
                    }}
                  >
                    <Icon size={16} />
                    <span className="text-xs uppercase tracking-wider flex-1 text-left">{t(tool.label)}</span>
                    {info && <span className="text-[10px] uppercase tracking-wider truncate max-w-[120px]" style={{ opacity: active ? 1 : 0.65 }}>{info}</span>}
                    {tool.sub && <ChevronRight size={13} style={{ transform: open2 ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />}
                  </motion.button>
                  {open2 && tool.id === 'model' && (
                    <div className="ml-6 flex flex-col gap-1 max-w-[280px] max-h-[40vh] overflow-y-auto no-scrollbar">
                      {IS_ARTIFACT ? (
                        <p className="px-3 py-2 rounded text-[10px]" style={{ background: 'rgb(var(--cd) / 0.95)', border: '1px solid rgb(var(--c) / 0.2)', color: 'rgb(var(--c) / 0.75)' }}>{t('Dentro do claude.ai a IA usada é a do próprio claude.ai.')}</p>
                      ) : !model ? (
                        <button type="button" onClick={() => { setOpen(false); toggleAiSub('model'); navigate('/definicoes'); setTimeout(() => focusCard('ai-key') || document.getElementById('ai-key')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 400); }}
                          className="px-3 py-2 rounded text-[10px] uppercase tracking-wider text-left" style={{ background: 'rgb(var(--cd) / 0.95)', border: '1px solid #ffaa0088', color: '#ffaa00' }}>
                          {t('Sem chave de IA: configura-a nas Definições →')}
                        </button>
                      ) : aiTools.modelsLoading ? (
                        <p className="px-3 py-2 rounded text-[10px] uppercase tracking-wider" style={{ background: 'rgb(var(--cd) / 0.95)', border: '1px solid rgb(var(--c) / 0.2)', color: 'rgb(var(--c) / 0.7)' }}>{t('A consultar os modelos da API…')}</p>
                      ) : (
                        <>
                          {aiTools.modelsError && aiTools.modelsError !== 'fallback' && <p className="px-2 text-[9px]" style={{ color: '#ffaa00' }}>{t('Não consegui ler a lista da API: mostro os modelos conhecidos.')}</p>}
                          {aiTools.availableModels.map((m) => (
                            <button key={m.id} type="button" onClick={() => { playSelectSound(); onSelectAiModel(m.id); }} aria-pressed={model.model === m.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] text-left"
                              style={{ background: model.model === m.id ? 'rgb(var(--c) / 0.16)' : 'rgb(var(--cd) / 0.95)', border: `1px solid rgb(var(--c) / ${model.model === m.id ? 0.9 : 0.2})`, color: 'rgb(var(--c))' }}>
                              {model.model === m.id ? <Check size={11} className="shrink-0" /> : <span className="w-[11px] shrink-0" />}<span className="truncate">{m.label}</span>
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
            {inPizza && PIZZA_TOOLS.map((tool, index) => {
              const delta = pizza.delta == null ? '' : `${pizza.delta > 0 ? '+' : ''}${pizza.delta.toFixed(1)}`;
              const info = {
                refresh: pizza.loading ? t('A ATUALIZAR') : pizza.level != null ? `${Number(pizza.level).toFixed(1)}/10${delta ? ` (${delta})` : ''}` : '',
                sources: '', alert: pizza.isPizzaAlertActive ? 'ON' : 'OFF',
              }[tool.id];
              const active = tool.id === 'alert' && pizza.isPizzaAlertActive;
              const alert = tool.id === 'alert' && (pizza.isPizzaAlertActive || pizzaPeak);
              const Icon = tool.icon;
              return (
                <motion.button
                  key={tool.id}
                  type="button"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => runPizzaTool(tool)}
                  aria-pressed={tool.id === 'alert' ? pizza.isPizzaAlertActive : undefined}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded whitespace-nowrap transition-all"
                  style={{
                    background: active ? 'rgb(var(--c) / 0.16)' : 'rgb(var(--cd) / 0.95)',
                    border: `1px solid ${alert ? '#ef444499' : active ? 'rgb(var(--c))' : 'rgb(var(--c) / 0.3)'}`,
                    color: active ? 'rgb(var(--c))' : 'rgb(var(--c) / 0.85)',
                    backdropFilter: 'blur(10px)', boxShadow: active ? '0 0 12px rgb(var(--c) / 0.45)' : '0 0 8px rgb(var(--c) / 0.12)', minWidth: '230px',
                  }}
                >
                  <Icon size={16} className={tool.id === 'refresh' && pizza.loading ? 'animate-spin' : ''} />
                  <span className="text-xs uppercase tracking-wider flex-1 text-left">{t(tool.label)}</span>
                  {info && <span className="text-[10px] uppercase tracking-wider tabular-nums" style={{ color: tool.id === 'refresh' && pizza.delta > 0 ? '#ff6600' : undefined, opacity: active ? 1 : 0.7 }}>{info}</span>}
                  {alert && <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#ff0000', boxShadow: '0 0 8px #ff0000' }} aria-label={pizzaPeak ? t('índice acima do limiar') : t('alerta ativo')} />}
                </motion.button>
              );
            })}
            {inRadio && (radio.station || radio.recMsg) && (
              <p className="px-3 py-1.5 rounded text-[10px] uppercase tracking-wider truncate" style={{ background: 'rgb(var(--cd) / 0.95)', border: '1px solid rgb(var(--c) / 0.2)', color: radio.isRecording ? '#ef4444' : 'rgb(var(--c) / 0.7)', maxWidth: 260 }}>
                {radio.recMsg && (radio.isRecording || !radio.station) ? radio.recMsg : `${radio.isRadioOn ? '▶' : '■'} ${radio.station}${radio.freq ? ` · ${radio.band === 'AM' ? Math.round(radio.freq) : Number(radio.freq).toFixed(1)}` : ''}`}
              </p>
            )}
            {inRadio && RADIO_TOOLS.map((tool, index) => {
              const rec = tool.id === 'rec' && radio.isRecording;
              const on = tool.id === 'power' && radio.isRadioOn;
              const info = { power: radio.isRadioOn ? 'ON' : 'OFF', next: '', prev: '', rec: rec ? mmss(Date.now() - radio.recStart + recTick * 0) : 'REC' }[tool.id];
              const color = rec ? '#ef4444' : on ? 'rgb(var(--c))' : 'rgb(var(--c) / 0.85)';
              return (
                <motion.button
                  key={tool.id}
                  type="button"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => { playSelectSound(); tool.run(); }}
                  aria-pressed={tool.id === 'power' ? radio.isRadioOn : tool.id === 'rec' ? radio.isRecording : undefined}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded whitespace-nowrap transition-all ${rec ? 'animate-pulse' : ''}`}
                  style={{
                    background: rec ? '#ef444418' : on ? 'rgb(var(--c) / 0.16)' : 'rgb(var(--cd) / 0.95)',
                    border: `1px solid ${rec ? '#ef4444' : on ? 'rgb(var(--c))' : 'rgb(var(--c) / 0.3)'}`,
                    color, backdropFilter: 'blur(10px)',
                    boxShadow: rec ? '0 0 14px #ef444466' : on ? '0 0 12px rgb(var(--c) / 0.45)' : '0 0 8px rgb(var(--c) / 0.12)', minWidth: '230px',
                  }}
                >
                  <span className="w-8 text-center text-sm font-bold tabular-nums" aria-hidden="true" style={{ color: tool.id === 'rec' ? '#ef4444' : undefined, textShadow: rec ? '0 0 8px #ef4444' : undefined }}>{tool.sym}</span>
                  <span className="text-xs uppercase tracking-wider flex-1 text-left">{t(tool.label)}</span>
                  <span className="text-[10px] uppercase tracking-wider tabular-nums" style={{ opacity: on || rec ? 1 : 0.6 }}>{info}</span>
                  {rec && <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#ff0000', boxShadow: '0 0 8px #ff0000' }} />}
                </motion.button>
              );
            })}
            {inCat && CAT_TOOLS.map((tool, index) => {
              const info = {
                active: cat.activeOnly ? 'ON' : String(cat.activeCount),
                protocol: '', top: '', search: cat.query.trim() ? `«${cat.query.trim().slice(0, 12)}»` : '',
                filter: t(CAT_FILTERS.find((f) => f.id === cat.filter)?.label || 'Todas').toUpperCase(),
                refresh: cat.loading ? t('A ATUALIZAR') : cat.lastSync ? hhmm(cat.lastSync) : '',
              }[tool.id];
              const active = (tool.id === 'active' && cat.activeOnly) || (tool.id === 'filter' && !!cat.filter) || (tool.id === 'search' && !!cat.query.trim());
              const alert = tool.id === 'active' && cat.activeCount > 0;
              const Icon = tool.icon;
              return (
                <motion.button
                  key={tool.id}
                  type="button"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => runCatTool(tool)}
                  aria-pressed={tool.id === 'active' ? cat.activeOnly : undefined}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded whitespace-nowrap transition-all"
                  style={{
                    background: active ? 'rgb(var(--c) / 0.16)' : 'rgb(var(--cd) / 0.95)',
                    border: `1px solid ${alert ? '#ef444499' : active ? 'rgb(var(--c))' : 'rgb(var(--c) / 0.3)'}`,
                    color: active ? 'rgb(var(--c))' : 'rgb(var(--c) / 0.85)',
                    backdropFilter: 'blur(10px)', boxShadow: active ? '0 0 12px rgb(var(--c) / 0.45)' : '0 0 8px rgb(var(--c) / 0.12)', minWidth: '240px',
                  }}
                >
                  <Icon size={16} className={tool.id === 'refresh' && cat.loading ? 'animate-spin' : ''} />
                  <span className="text-xs uppercase tracking-wider flex-1 text-left">{t(tool.label)}</span>
                  {info && <span className="text-[10px] uppercase tracking-wider truncate max-w-[110px]" style={{ color: alert ? '#ef4444' : undefined, opacity: alert || active ? 1 : 0.6 }}>{info}</span>}
                  {alert && <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#ff0000', boxShadow: '0 0 8px #ff0000' }} />}
                </motion.button>
              );
            })}
            {inCyber && CYBER_TOOLS.map((tool, index) => {
              const info = {
                refresh: cyber.loading ? t('A ATUALIZAR') : cyber.lastSync ? hhmm(cyber.lastSync) : '',
                type: cyber.type ? t(THREAT_TYPES.find((x) => x.id === cyber.type)?.label).toUpperCase() : t('TODAS'),
                critical: cyber.criticalOnly ? 'ON' : String(cyber.criticalCount),
                recalc: cyber.risk ? `${cyber.risk.score}/100 · ${t(cyber.risk.level).toUpperCase()}` : '',
              }[tool.id];
              const open2 = tool.sub && cyber.sub === tool.id;
              const active = open2 || (tool.id === 'type' && !!cyber.type) || (tool.id === 'critical' && cyber.criticalOnly);
              const alert = tool.id === 'critical' && cyber.criticalCount > 0;
              const Icon = tool.icon;
              return (
                <React.Fragment key={tool.id}>
                  <motion.button
                    type="button"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => runCyberTool(tool)}
                    aria-expanded={tool.sub ? open2 : undefined}
                    aria-pressed={tool.id === 'critical' ? cyber.criticalOnly : undefined}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded whitespace-nowrap transition-all"
                    style={{
                      background: active ? 'rgb(var(--c) / 0.16)' : 'rgb(var(--cd) / 0.95)',
                      border: `1px solid ${alert ? '#ef444499' : active ? 'rgb(var(--c))' : 'rgb(var(--c) / 0.3)'}`,
                      color: active ? 'rgb(var(--c))' : 'rgb(var(--c) / 0.85)',
                      backdropFilter: 'blur(10px)', boxShadow: active ? '0 0 12px rgb(var(--c) / 0.45)' : '0 0 8px rgb(var(--c) / 0.12)', minWidth: '240px',
                    }}
                  >
                    <Icon size={16} className={tool.id === 'refresh' && cyber.loading ? 'animate-spin' : ''} />
                    <span className="text-xs uppercase tracking-wider flex-1 text-left">{t(tool.label)}</span>
                    {info && <span className="text-[10px] uppercase tracking-wider truncate max-w-[120px]" style={{ color: alert ? '#ef4444' : undefined, opacity: alert || active ? 1 : 0.6 }}>{info}</span>}
                    {alert && <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#ff0000', boxShadow: '0 0 8px #ff0000' }} />}
                    {tool.sub && <ChevronRight size={13} style={{ transform: open2 ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />}
                  </motion.button>
                  {open2 && tool.id === 'type' && (
                    <div className="ml-6 flex flex-wrap gap-1.5 max-w-[260px]">
                      {[{ id: null, label: 'Todas' }, ...THREAT_TYPES].map((tp) => (
                        <button key={tp.id || 'all'} type="button" aria-pressed={cyber.type === tp.id}
                          onClick={() => { playSelectSound(); setThreatType(tp.id); toggleCyberSub('type'); goSection('ciber-lista'); }}
                          className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] uppercase tracking-wider"
                          style={{ background: cyber.type === tp.id ? 'rgb(var(--c) / 0.16)' : 'rgb(var(--cd) / 0.95)', border: `1px solid rgb(var(--c) / ${cyber.type === tp.id ? 0.9 : 0.25})`, color: 'rgb(var(--c))' }}>
                          {cyber.type === tp.id && <Check size={10} />}{t(tp.label)}
                        </button>
                      ))}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
            {inWar && WAR_TOOLS.map((tool, index) => {
              const info = {
                alerts: war.alertsOnly ? 'ON' : String(war.alertCount),
                severity: war.minSev ? `≥ ${war.minSev}/10` : t('TODAS'),
                region: war.region ? t(war.region).toUpperCase() : t('TODAS'),
                search: war.query.trim() ? `«${war.query.trim().slice(0, 12)}»` : '',
                refresh: war.loading ? t('A ATUALIZAR') : war.lastSync ? hhmm(war.lastSync) : '', top: '',
              }[tool.id];
              const open2 = tool.sub && war.sub === tool.id;
              const active = open2 || (tool.id === 'alerts' && war.alertsOnly) || (tool.id === 'severity' && war.minSev > 0) || (tool.id === 'region' && !!war.region) || (tool.id === 'search' && !!war.query.trim());
              const alert = tool.id === 'alerts' && war.alertCount > 0;
              const Icon = tool.icon;
              return (
                <React.Fragment key={tool.id}>
                  <motion.button
                    type="button"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => runWarTool(tool)}
                    aria-expanded={tool.sub ? open2 : undefined}
                    aria-pressed={tool.id === 'alerts' ? war.alertsOnly : undefined}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded whitespace-nowrap transition-all"
                    style={{
                      background: active ? 'rgb(var(--c) / 0.16)' : 'rgb(var(--cd) / 0.95)',
                      border: `1px solid ${alert ? '#ef444499' : active ? 'rgb(var(--c))' : 'rgb(var(--c) / 0.3)'}`,
                      color: active ? 'rgb(var(--c))' : 'rgb(var(--c) / 0.85)',
                      backdropFilter: 'blur(10px)', boxShadow: active ? '0 0 12px rgb(var(--c) / 0.45)' : '0 0 8px rgb(var(--c) / 0.12)', minWidth: '230px',
                    }}
                  >
                    <Icon size={16} className={tool.id === 'refresh' && war.loading ? 'animate-spin' : ''} />
                    <span className="text-xs uppercase tracking-wider flex-1 text-left">{t(tool.label)}</span>
                    {info && <span className="text-[10px] uppercase tracking-wider truncate max-w-[100px]" style={{ color: alert ? '#ef4444' : undefined, opacity: alert || active ? 1 : 0.6 }}>{info}</span>}
                    {alert && <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#ff0000', boxShadow: '0 0 8px #ff0000' }} />}
                    {tool.sub && <ChevronRight size={13} style={{ transform: open2 ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />}
                  </motion.button>
                  {open2 && tool.id === 'region' && (
                    <div className="ml-6 flex flex-wrap gap-1.5 max-w-[260px]">
                      {[[null, null], ...war.regions].map(([name, n]) => (
                        <button key={name || 'all'} type="button" aria-pressed={war.region === name}
                          onClick={() => { playSelectSound(); setWarRegion(name); toggleWarSub('region'); goSection('guerra-lista'); }}
                          className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] uppercase tracking-wider"
                          style={{ background: war.region === name ? 'rgb(var(--c) / 0.16)' : 'rgb(var(--cd) / 0.95)', border: `1px solid rgb(var(--c) / ${war.region === name ? 0.9 : 0.25})`, color: 'rgb(var(--c))' }}>
                          {war.region === name && <Check size={10} />}{name ? t(name) : t('Todas as regiões')}{n != null && <span className="opacity-60">{n}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
            {inEco && ECO_TOOLS.map((tool, index) => {
              const info = {
                urgent: eco.urgentOnly ? 'ON' : String(eco.urgentCount),
                assets: t('{n}/6', { n: 6 - eco.freeSlots }),
                theme: eco.theme ? t(ECO_THEMES.find((x) => x.id === eco.theme)?.label).toUpperCase() : t('TODOS'),
                search: eco.query.trim() ? `«${eco.query.trim().slice(0, 12)}»` : '',
                refresh: eco.loading ? t('A ATUALIZAR') : eco.lastSync ? hhmm(eco.lastSync) : '', top: '',
              }[tool.id];
              const open2 = tool.sub && eco.sub === tool.id;
              const active = open2 || (tool.id === 'urgent' && eco.urgentOnly) || (tool.id === 'theme' && !!eco.theme) || (tool.id === 'search' && !!eco.query.trim());
              const alert = tool.id === 'urgent' && eco.urgentCount > 0;
              const Icon = tool.icon;
              const subBtn = { background: 'rgb(var(--cd) / 0.95)', border: '1px solid rgb(var(--c) / 0.2)', color: 'rgb(var(--c) / 0.85)' };
              return (
                <React.Fragment key={tool.id}>
                  <motion.button
                    type="button"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => runEcoTool(tool)}
                    aria-expanded={tool.sub ? open2 : undefined}
                    aria-pressed={tool.id === 'urgent' ? eco.urgentOnly : undefined}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded whitespace-nowrap transition-all"
                    style={{
                      background: active ? 'rgb(var(--c) / 0.16)' : 'rgb(var(--cd) / 0.95)',
                      border: `1px solid ${alert ? '#ef444499' : active ? 'rgb(var(--c))' : 'rgb(var(--c) / 0.3)'}`,
                      color: active ? 'rgb(var(--c))' : 'rgb(var(--c) / 0.85)',
                      backdropFilter: 'blur(10px)', boxShadow: active ? '0 0 12px rgb(var(--c) / 0.45)' : '0 0 8px rgb(var(--c) / 0.12)', minWidth: '230px',
                    }}
                  >
                    <Icon size={16} className={tool.id === 'refresh' && eco.loading ? 'animate-spin' : ''} />
                    <span className="text-xs uppercase tracking-wider flex-1 text-left">{t(tool.label)}</span>
                    {info && <span className="text-[10px] uppercase tracking-wider truncate max-w-[100px]" style={{ color: alert ? '#ef4444' : undefined, opacity: alert || active ? 1 : 0.6 }}>{info}</span>}
                    {alert && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#ff0000' }} />}
                    {tool.sub && <ChevronRight size={13} style={{ transform: open2 ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />}
                  </motion.button>
                  {open2 && tool.id === 'assets' && (
                    <>
                      <button type="button" onClick={() => { playSelectSound(); toggleEcoSub('assets'); goSection('eco-ativos'); }} className="ml-6 flex items-center gap-2 px-3 py-2 rounded text-[11px] uppercase tracking-wider text-left" style={subBtn}>
                        <ChevronsDown size={12} /> {t('Ir para os meus ativos')}
                      </button>
                      <button type="button" disabled={!eco.freeSlots} onClick={() => { playSelectSound(); toggleEcoSub('assets'); setOpen(false); setTimeout(() => { focusCard('eco-ativos'); requestAddAsset(); }, 150); }}
                        className="ml-6 flex items-center gap-2 px-3 py-2 rounded text-[11px] uppercase tracking-wider text-left disabled:opacity-40" style={subBtn}>
                        <PlusCircle size={12} /> {eco.freeSlots ? t('Adicionar ativo') : t('Espaços cheios')}
                      </button>
                    </>
                  )}
                  {open2 && tool.id === 'theme' && (
                    <div className="ml-6 flex flex-wrap gap-1.5 max-w-[260px]">
                      {[{ id: null, label: 'Todos os temas' }, ...ECO_THEMES].map((th) => (
                        <button key={th.id || 'all'} type="button" aria-pressed={eco.theme === th.id}
                          onClick={() => { playSelectSound(); setEcoTheme(th.id); toggleEcoSub('theme'); goSection('eco-noticias'); }}
                          className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] uppercase tracking-wider"
                          style={{ background: eco.theme === th.id ? 'rgb(var(--c) / 0.16)' : 'rgb(var(--cd) / 0.95)', border: `1px solid rgb(var(--c) / ${eco.theme === th.id ? 0.9 : 0.25})`, color: 'rgb(var(--c))' }}>
                          {eco.theme === th.id && <Check size={10} />}{t(th.label)}
                        </button>
                      ))}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
            {inStrikes && STRIKE_TOOLS.map((tool, index) => {
              const info = {
                active: strikes.onlyActive ? 'ON' : String(strikes.activeCount),
                jump: '', top: '',
                sector: strikes.sector === 'Todos' ? t('TODOS') : t(strikes.sector).toUpperCase(),
                search: strikes.query.trim() ? `«${strikes.query.trim().slice(0, 12)}»` : '',
                refresh: strikes.loading ? t('A ATUALIZAR') : strikes.lastSync ? hhmm(strikes.lastSync) : '',
              }[tool.id];
              const open2 = tool.sub && strikes.sub === tool.id;
              const active = open2 || (tool.id === 'active' && strikes.onlyActive) || (tool.id === 'sector' && strikes.sector !== 'Todos') || (tool.id === 'search' && !!strikes.query.trim());
              const alert = tool.id === 'active' && strikes.activeCount > 0;
              const Icon = tool.icon;
              return (
                <React.Fragment key={tool.id}>
                  <motion.button
                    type="button"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => runStrikeTool(tool)}
                    aria-expanded={tool.sub ? open2 : undefined}
                    aria-pressed={tool.id === 'active' ? strikes.onlyActive : undefined}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded whitespace-nowrap transition-all"
                    style={{
                      background: active ? 'rgb(var(--c) / 0.16)' : 'rgb(var(--cd) / 0.95)',
                      border: `1px solid ${alert ? '#ef444499' : active ? 'rgb(var(--c))' : 'rgb(var(--c) / 0.3)'}`,
                      color: active ? 'rgb(var(--c))' : 'rgb(var(--c) / 0.85)',
                      backdropFilter: 'blur(10px)', boxShadow: active ? '0 0 12px rgb(var(--c) / 0.45)' : '0 0 8px rgb(var(--c) / 0.12)', minWidth: '230px',
                    }}
                  >
                    <Icon size={16} className={tool.id === 'refresh' && strikes.loading ? 'animate-spin' : ''} />
                    <span className="text-xs uppercase tracking-wider flex-1 text-left">{t(tool.label)}</span>
                    {info && <span className="text-[10px] uppercase tracking-wider truncate max-w-[90px]" style={{ color: alert ? '#ef4444' : undefined, opacity: alert || active ? 1 : 0.6 }}>{info}</span>}
                    {alert && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#ff0000' }} />}
                    {tool.sub && <ChevronRight size={13} style={{ transform: open2 ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />}
                  </motion.button>
                  {open2 && tool.id === 'jump' && STRIKE_SECTIONS.map((sec) => (
                    <button key={sec.id} type="button" onClick={() => { playSelectSound(); toggleStrikeSub('jump'); goSection(sec.id); }}
                      className="ml-6 flex items-center gap-2 px-3 py-2 rounded text-[11px] uppercase tracking-wider text-left"
                      style={{ background: 'rgb(var(--cd) / 0.95)', border: '1px solid rgb(var(--c) / 0.2)', color: 'rgb(var(--c) / 0.85)' }}>
                      <ChevronsDown size={12} /> {t(sec.label)}
                    </button>
                  ))}
                  {open2 && tool.id === 'sector' && (
                    <div className="ml-6 flex flex-wrap gap-1.5 max-w-[260px]">
                      {[['Todos', null], ...strikes.sectors].map(([name, n]) => (
                        <button key={name} type="button" aria-pressed={strikes.sector === name}
                          onClick={() => { playSelectSound(); setStrikeSector(name); toggleStrikeSub('sector'); goSection('greves-lista'); }}
                          className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] uppercase tracking-wider"
                          style={{ background: strikes.sector === name ? 'rgb(var(--c) / 0.16)' : 'rgb(var(--cd) / 0.95)', border: `1px solid rgb(var(--c) / ${strikes.sector === name ? 0.9 : 0.25})`, color: 'rgb(var(--c))' }}>
                          {strikes.sector === name && <Check size={10} />}{name === 'Todos' ? t('Todos os setores') : t(name)}{n != null && <span className="opacity-60">{n}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
            {inMeteo && METEO_TOOLS.map((tool, index) => {
              const info = {
                refresh: meteo.loading ? t('A ATUALIZAR') : meteo.lastSync ? hhmm(meteo.lastSync) : '',
                jump: '', city: loc.name.toUpperCase(), forecast: loc.name.toUpperCase(),
                sea: meteo.seaTotal ? (meteo.seaActive ? t('{n} ATIVO(S)', { n: meteo.seaActive }) : String(meteo.seaTotal)) : t('SEM AVISOS'),
              }[tool.id];
              const open2 = tool.sub && meteo.sub === tool.id;
              const alert = tool.id === 'sea' && meteo.seaActive > 0;
              const Icon = tool.icon;
              return (
                <React.Fragment key={tool.id}>
                  <motion.button
                    type="button"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => runMeteoTool(tool)}
                    aria-expanded={tool.sub ? open2 : undefined}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded whitespace-nowrap transition-all"
                    style={{
                      background: open2 ? 'rgb(var(--c) / 0.16)' : 'rgb(var(--cd) / 0.95)',
                      border: `1px solid ${alert ? '#ef444488' : open2 ? 'rgb(var(--c))' : 'rgb(var(--c) / 0.3)'}`,
                      color: open2 ? 'rgb(var(--c))' : 'rgb(var(--c) / 0.85)',
                      backdropFilter: 'blur(10px)', boxShadow: '0 0 8px rgb(var(--c) / 0.12)', minWidth: '230px',
                    }}
                  >
                    <Icon size={16} className={tool.id === 'refresh' && meteo.loading ? 'animate-spin' : ''} />
                    <span className="text-xs uppercase tracking-wider flex-1 text-left">{t(tool.label)}</span>
                    {info && <span className="text-[10px] uppercase tracking-wider" style={{ color: alert ? '#ef4444' : undefined, opacity: alert ? 1 : 0.6 }}>{info}</span>}
                    {alert && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#ff0000' }} />}
                    {tool.sub && <ChevronRight size={13} style={{ transform: open2 ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />}
                  </motion.button>
                  {open2 && tool.id === 'jump' && METEO_SECTIONS.map((sec) => (
                    <button key={sec.id} type="button" onClick={() => { playSelectSound(); toggleSub('jump'); goSection(sec.id); }}
                      className="ml-6 flex items-center gap-2 px-3 py-2 rounded text-[11px] uppercase tracking-wider text-left"
                      style={{ background: 'rgb(var(--cd) / 0.95)', border: '1px solid rgb(var(--c) / 0.2)', color: 'rgb(var(--c) / 0.85)' }}>
                      <ChevronsDown size={12} /> {t(sec.label)}
                    </button>
                  ))}
                  {open2 && tool.id === 'city' && (
                    <div className="ml-6 grid grid-cols-2 gap-1.5">
                      {MAIN_CITIES.map((name) => (
                        <button key={name} type="button" onClick={() => pickCity(name)} aria-pressed={loc.name === name}
                          className="flex items-center gap-1 px-2 py-1.5 rounded text-[11px] uppercase tracking-wider text-left"
                          style={{ background: loc.name === name ? 'rgb(var(--c) / 0.16)' : 'rgb(var(--cd) / 0.95)', border: `1px solid rgb(var(--c) / ${loc.name === name ? 0.9 : 0.2})`, color: 'rgb(var(--c))' }}>
                          {loc.name === name && <Check size={11} />}{name}
                        </button>
                      ))}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
            {inGame && GAME_TOOLS.map((tool, index) => {
              const [snd, sndOn] = gameSound();
              const lcdIdle = gameState.game !== 'erawar' && gameState.lcdMode && gameState.lcdMode !== 'play';
              const info = {
                pause: !gameState.inMatch ? 'SEM PARTIDA' : lcdIdle ? 'NO MENU' : gameState.paused ? 'PAUSADO' : 'EM JOGO',
                restart: gameState.inMatch ? '↻' : 'JOGAR',
                switch: t(GAME_LABEL[gameState.game]).toUpperCase(),
                sound: snd, fullscreen: gameState.fullscreen ? 'ON' : 'OFF', stats: '', help: '',
              }[tool.id];
              const active = (tool.id === 'pause' && gameState.paused) || (tool.id === 'sound' && sndOn) || (tool.id === 'fullscreen' && gameState.fullscreen);
              const Icon = tool.id === 'pause' ? (gameState.paused ? Play : Pause) : tool.id === 'sound' ? (sndOn ? Volume2 : VolumeX) : tool.icon;
              const off = tool.id === 'pause' && (!gameState.inMatch || lcdIdle); // sem partida a decorrer, não há o que pausar
              return (
                <motion.button
                  key={tool.id}
                  type="button"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => runGameTool(tool)}
                  disabled={off}
                  aria-pressed={['pause', 'sound', 'fullscreen'].includes(tool.id) ? active : undefined}
                  className="flex items-center gap-2.5 px-3 py-2 rounded whitespace-nowrap transition-all disabled:opacity-40"
                  style={{
                    background: active ? 'rgb(var(--c) / 0.16)' : 'rgb(var(--cd) / 0.95)',
                    border: `1px solid ${active ? 'rgb(var(--c))' : 'rgb(var(--c) / 0.3)'}`,
                    color: active ? 'rgb(var(--c))' : 'rgb(var(--c) / 0.85)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: active ? '0 0 12px rgb(var(--c) / 0.45)' : '0 0 8px rgb(var(--c) / 0.12)',
                    minWidth: '220px',
                  }}
                >
                  <Icon size={16} />
                  <span className="text-xs uppercase tracking-wider flex-1 text-left">{t(tool.label)}</span>
                  {info && <span className="text-[10px] uppercase tracking-wider" style={{ opacity: active ? 1 : 0.6 }}>{t(info)}</span>}
                </motion.button>
              );
            })}
            {inMusic && (
              <p className="px-3 py-1.5 rounded text-[10px] uppercase tracking-wider truncate" style={{ background: 'rgb(var(--cd) / 0.95)', border: '1px solid rgb(var(--c) / 0.2)', color: 'rgb(var(--c) / 0.7)', maxWidth: 240 }}>
                {music.track ? `${music.isPlaying ? '▶' : '||'} ${music.track}` : t('Sem faixas: adiciona músicas no leitor')}
              </p>
            )}
            {inMusic && MUSIC_TOOLS.map((tool, index) => {
              const [info, active] = musicInfo(tool.id);
              const Icon = tool.id === 'play' && music.isPlaying ? Pause : tool.icon;
              const off = !music.hasTracks && ['play', 'next', 'prev'].includes(tool.id);
              return (
                <motion.button
                  key={tool.id}
                  type="button"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => { playSelectSound(); tool.run(); }}
                  disabled={off}
                  aria-pressed={['eq', 'boost', 'shuffle', 'play'].includes(tool.id) ? active : undefined}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded whitespace-nowrap transition-all disabled:opacity-40"
                  style={{
                    background: active ? 'rgb(var(--c) / 0.16)' : 'rgb(var(--cd) / 0.95)',
                    border: `1px solid ${active ? 'rgb(var(--c))' : 'rgb(var(--c) / 0.3)'}`,
                    color: active ? 'rgb(var(--c))' : 'rgb(var(--c) / 0.85)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: active ? '0 0 12px rgb(var(--c) / 0.45)' : '0 0 8px rgb(var(--c) / 0.12)',
                    minWidth: '210px',
                  }}
                >
                  <Icon size={16} />
                  <span className="text-xs uppercase tracking-wider flex-1 text-left">{t(tool.label)}</span>
                  <span className="text-[10px] uppercase tracking-wider" style={{ opacity: active ? 1 : 0.6 }}>{info}</span>
                </motion.button>
              );
            })}
            {inFiles && FILES_TOOLS.map((tool, index) => {
              const active = tool.panel && filesView.panel === tool.id;
              const dot = (tool.id === 'filter' && filesView.types.length > 0) || (tool.id === 'sort' && filesView.sort !== 'new');
              return (
                <motion.button
                  key={tool.id}
                  type="button"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => runFilesTool(tool)}
                  aria-pressed={tool.panel ? active : undefined}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded whitespace-nowrap transition-all"
                  style={{
                    background: active ? 'rgb(var(--c) / 0.16)' : 'rgb(var(--cd) / 0.95)',
                    border: `1px solid ${tool.danger ? '#ef444488' : active ? 'rgb(var(--c))' : 'rgb(var(--c) / 0.3)'}`,
                    color: tool.danger ? '#ef4444' : active ? 'rgb(var(--c))' : 'rgb(var(--c) / 0.85)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: active ? '0 0 12px rgb(var(--c) / 0.45)' : tool.danger ? '0 0 8px #ef444433' : '0 0 8px rgb(var(--c) / 0.12)',
                    minWidth: '200px',
                  }}
                >
                  <tool.icon size={16} />
                  <span className="text-xs uppercase tracking-wider flex-1 text-left">{t(tool.label)}</span>
                  {dot && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#ff0000' }} aria-label={t('ativo')} />}
                </motion.button>
              );
            })}
            {inManual && MANUAL_TOOLS.map((tool, index) => {
              const active = tool.panel && manualView.panel === tool.id;
              const dot = (tool.id === 'filter' && manualView.themes.length > 0) || (tool.id === 'organize' && (manualView.sort !== 'default' || manualView.types.length > 0 || manualView.group));
              return (
                <motion.button
                  key={tool.id}
                  type="button"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => runManualTool(tool)}
                  aria-pressed={tool.panel ? active : undefined}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded whitespace-nowrap transition-all"
                  style={{
                    background: active ? 'rgb(var(--c) / 0.16)' : 'rgb(var(--cd) / 0.95)',
                    border: `1px solid ${active ? 'rgb(var(--c))' : 'rgb(var(--c) / 0.3)'}`,
                    color: active ? 'rgb(var(--c))' : 'rgb(var(--c) / 0.85)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: active ? '0 0 12px rgb(var(--c) / 0.45)' : '0 0 8px rgb(var(--c) / 0.12)',
                    minWidth: '200px',
                  }}
                >
                  <tool.icon size={16} />
                  <span className="text-xs uppercase tracking-wider flex-1 text-left">{t(tool.label)}</span>
                  {dot && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#ff0000' }} aria-label={t('ativo')} />}
                </motion.button>
              );
            })}
            {inMap && MAP_TOOLS.map((tool, index) => {
              const active = tool.mode && mapState.mode === tool.id;
              return (
                <motion.button
                  key={tool.id}
                  type="button"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => runMapTool(tool)}
                  aria-pressed={tool.mode ? active : undefined}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded whitespace-nowrap transition-all"
                  style={{
                    background: active ? 'rgb(var(--c) / 0.16)' : 'rgb(var(--cd) / 0.95)',
                    border: `1px solid ${active ? 'rgb(var(--c))' : 'rgb(var(--c) / 0.3)'}`,
                    color: active ? 'rgb(var(--c))' : 'rgb(var(--c) / 0.85)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: active ? '0 0 12px rgb(var(--c) / 0.45)' : '0 0 8px rgb(var(--c) / 0.12)',
                    minWidth: '200px',
                  }}
                >
                  <tool.icon size={16} />
                  <span className="text-xs uppercase tracking-wider flex-1 text-left">{t(tool.label)}</span>
                  {tool.id === 'layers' && <span className="text-[10px] uppercase opacity-80">{t(LAYER_LABEL[mapState.layer])}</span>}
                  {active && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#ff0000' }} aria-label={t('ativo')} />}
                </motion.button>
              );
            })}
            {inSettings && SETTINGS_TOOLS.map((tool, index) => (
              <motion.button
                key={tool.id}
                type="button"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => runTool(tool)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded whitespace-nowrap transition-all"
                style={{
                  background: 'rgb(var(--cd) / 0.93)',
                  border: `1px solid ${tool.warn ? '#ffaa0066' : 'rgb(var(--c) / 0.3)'}`,
                  color: tool.warn ? '#ffaa00' : 'rgb(var(--c) / 0.85)',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 0 8px rgb(var(--c) / 0.12)',
                  minWidth: '190px',
                }}
              >
                <tool.icon size={16} />
                <span className="text-xs uppercase tracking-wider flex-1 text-left">{t(tool.label)}</span>
                {tool.id === 'idioma' && <span className="text-[10px] opacity-70">{isEn() ? 'US → PT' : 'PT → US'}</span>}
              </motion.button>
            ))}
            {!inSettings && !inMap && !inManual && !inFiles && !inMusic && !inGame && !inMeteo && !inStrikes && !inEco && !inWar && !inCyber && !inCat && !inRadio && !inPizza && !inAi && tabs.map((tab, index) => (
              <motion.button
                key={tab.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => handleSelect(tab)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded whitespace-nowrap transition-all"
                style={{
                  background: activeTab === tab.id ? 'rgb(var(--c) / 0.13)' : 'rgb(var(--cd) / 0.93)',
                  border: `1px solid ${activeTab === tab.id ? 'rgb(var(--c))' : 'rgb(var(--c) / 0.2)'}`,
                  color: activeTab === tab.id ? 'rgb(var(--c))' : 'rgb(var(--c) / 0.67)',
                  backdropFilter: 'blur(10px)',
                  minWidth: '140px',
                }}
              >
                {tab.icon && <tab.icon size={16} />}
                <span className="text-xs uppercase tracking-wider flex-1 text-left">{t(tab.label)}</span>
                {tab.alert && (
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#ff0000' }} />
                )}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating toggle button */}
      <motion.button
        onClick={handleToggle}
        whileTap={{ scale: 0.9 }}
        aria-label={inSettings ? t('Ferramentas rápidas das definições') : inMap ? t('Ferramentas do mapa') : inManual ? t('Ferramentas do manual') : inFiles ? t('Ferramentas da base de conhecimento') : inMusic ? t('Controlo de música') : inGame ? t('Ferramentas do jogo') : inMeteo ? t('Ferramentas da meteorologia') : inStrikes ? t('Ferramentas das greves') : inEco ? t('Ferramentas da economia') : inWar ? t('Ferramentas da guerra') : inCyber ? t('Ferramentas de ciberataques') : inCat ? t('Ferramentas das catástrofes') : inRadio ? t('Ferramentas do rádio') : inPizza ? t('Ferramentas do Índice Pizza') : inAi ? t('Ferramentas da IA') : t('Menu de navegação rápida')}
        className="fixed z-50 flex items-center justify-center"
        style={{
          right: '16px',
          bottom: '80px',
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: 'rgb(var(--cd) / 0.87)',
          border: '1px solid rgb(var(--c) / 0.4)',
          color: 'rgb(var(--c))',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 0 14px rgb(var(--c) / 0.27)',
        }}
      >
        {((inPizza && (pizza.isPizzaAlertActive || pizzaPeak)) || (radio.isRecording) || (inCat && cat.activeCount > 0) || (inCyber && cyber.criticalCount > 0) || (inWar && war.alertCount > 0) || (inEco && eco.urgentCount > 0) || (inStrikes && strikes.activeCount > 0) || (inMap && mapState.mode) || (inManual && filtersActive(manualView)) || (inFiles && filesView.types.length > 0)) && !open && <span className="absolute top-1 right-1 w-2 h-2 rounded-full animate-pulse" style={{ background: '#ff0000' }} />}
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X size={20} />
            </motion.span>
          ) : (
            <motion.span key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <Menu size={20} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  );
}
