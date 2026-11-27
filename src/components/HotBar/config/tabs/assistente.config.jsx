// IA (MR. STEEL) — novo chat, histórico, modo e modelo de IA (estado em src/lib/ai/aiTools.js)
import React from 'react';
import { Bot, SquarePen, History, BrainCog, Cpu, Check } from 'lucide-react';
import { useAiTools, onNewChat, onToggleHistory, onToggleAiMode, toggleAiSub, selectedModel, loadAvailableModels, onSelectAiModel } from '@/lib/ai/aiTools';
import { useAiConfig } from '@/lib/ai/config';
import { IS_ARTIFACT } from '@/api/base44Client';
import { focusCard } from '@/settingsActions';
import { t } from '@/i18n';

// volta a desenhar quando a chave ou o modelo mudam
const useAiContext = () => { const ai = useAiTools(); useAiConfig(); return { ...ai, model: selectedModel() }; };

const note = { background: 'rgb(var(--cd) / 0.95)', border: '1px solid rgb(var(--c) / 0.2)', color: 'rgb(var(--c) / 0.75)' };

// Lista real de modelos da API (casos: claude.ai, sem chave, a carregar, erro -> modelos conhecidos)
function ModelPicker({ ai, api }) {
  const { model } = ai;
  let body;
  if (IS_ARTIFACT) body = <p className="px-3 py-2 rounded text-[10px]" style={note}>{t('Dentro do claude.ai a IA usada é a do próprio claude.ai.')}</p>;
  else if (!model) {
    body = (
      <button type="button" data-hotbar-item=""
        onClick={() => { api.playSelect(); toggleAiSub('model'); api.navigate('/definicoes'); api.later(() => focusCard('ai-key') || document.getElementById('ai-key')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 400); }}
        className="px-3 py-2 rounded text-[10px] uppercase tracking-wider text-left" style={{ background: 'rgb(var(--cd) / 0.95)', border: '1px solid #ffaa0088', color: '#ffaa00' }}>
        {t('Sem chave de IA: configura-a nas Definições →')}
      </button>
    );
  } else if (ai.modelsLoading) body = <p className="px-3 py-2 rounded text-[10px] uppercase tracking-wider" style={note}>{t('A consultar os modelos da API…')}</p>;
  else {
    body = (
      <>
        {ai.modelsError && ai.modelsError !== 'fallback' && <p className="px-2 text-[9px]" style={{ color: '#ffaa00' }}>{t('Não consegui ler a lista da API: mostro os modelos conhecidos.')}</p>}
        {ai.availableModels.map((m) => {
          const sel = model.model === m.id;
          return (
            <button key={m.id} type="button" data-hotbar-item="" aria-pressed={sel} onClick={() => { api.playSelect(); onSelectAiModel(m.id); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] text-left"
              style={{ background: sel ? 'rgb(var(--c) / 0.16)' : 'rgb(var(--cd) / 0.95)', border: `1px solid rgb(var(--c) / ${sel ? 0.9 : 0.2})`, color: 'rgb(var(--c))' }}>
              {sel ? <Check size={11} className="shrink-0" /> : <span className="w-[11px] shrink-0" />}<span className="truncate">{m.label}</span>
            </button>
          );
        })}
      </>
    );
  }
  return <div className="ml-6 flex flex-col gap-1 max-w-[280px] max-h-[40vh] overflow-y-auto no-scrollbar">{body}</div>;
}

export default {
  tab: { id: 'assistente', path: '/assistente', label: 'IA', icon: Bot },
  ariaLabel: 'Ferramentas da IA',
  minWidth: 240,
  useContext: useAiContext,
  items: [
    { id: 'new', label: 'Novo chat', icon: SquarePen, shortcut: 'n', run: () => onNewChat() },
    { id: 'history', label: 'Histórico', icon: History, shortcut: 'h', run: () => onToggleHistory() },
    { id: 'mode', label: 'Modo IA', icon: BrainCog, keepOpen: true, toggle: true, isActive: (a) => a.aiMode === 'full', // fica aberto: mostra o modo novo
      badge: (a) => (a.aiMode === 'local' ? t('BASE LOCAL') : t('IA COMPLETA')), run: () => onToggleAiMode() },
    { id: 'model', label: 'Modelo IA', icon: Cpu,
      badge: (a) => (IS_ARTIFACT ? 'CLAUDE.AI' : a.model ? a.model.label.toUpperCase() : t('BASE LOCAL')),
      submenu: {
        isOpen: (a) => a.sub === 'model',
        toggle: (a) => { if (!a.sub) loadAvailableModels(); toggleAiSub('model'); }, // abre a lista real de modelos da API
        render: (a, api) => <ModelPicker ai={a} api={api} />,
      } },
  ],
};
