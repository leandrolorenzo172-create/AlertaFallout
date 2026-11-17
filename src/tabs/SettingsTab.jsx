import React from 'react';
import { Settings, Palette, LayoutGrid, ArrowUp, ArrowDown, Eye, EyeOff, RotateCcw, Bell } from 'lucide-react';
import { THEMES, useSettings, setSettings, resetSettings, orderTabs } from '../theme';
import { TABS } from '../HotBar';
import NotificationsTab from './NotificationsTab';

const box = { background: 'rgb(var(--cd) / 0.4)', border: '1px solid rgb(var(--c) / 0.2)' };
const btn = { background: 'rgb(var(--cb) / 0.6)', border: '1px solid rgb(var(--c) / 0.3)', color: 'rgb(var(--c))' };

function Title({ icon: Icon, children }) {
  return (
    <h3 className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold mb-3" style={{ color: 'rgb(var(--c))' }}>
      <Icon size={14} /> {children}
    </h3>
  );
}

export default function SettingsTab() {
  const s = useSettings();
  const tabs = orderTabs(TABS, s.order);

  const move = (id, dir) => {
    const ids = tabs.map((t) => t.id);
    const i = ids.indexOf(id); const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    setSettings({ order: ids });
  };
  const toggle = (id) => {
    if (id === 'definicoes') return; // as definições nunca se escondem, senão não havia como voltar
    setSettings({ hidden: s.hidden.includes(id) ? s.hidden.filter((x) => x !== id) : [...s.hidden, id] });
  };

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Settings size={16} style={{ color: 'rgb(var(--c))' }} />
        <h2 className="text-sm uppercase tracking-wider font-bold" style={{ color: 'rgb(var(--c))' }}>Definições</h2>
      </div>

      {/* Tema de cores */}
      <section className="p-3 rounded-sm mb-4" style={box}>
        <Title icon={Palette}>Tema de cores</Title>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {THEMES.map((t) => {
            const on = s.theme === t.id;
            return (
              <button key={t.id} type="button" onClick={() => setSettings({ theme: t.id })} aria-pressed={on}
                className="flex items-center gap-2 px-3 py-2.5 rounded-sm text-xs text-left"
                style={{ background: `rgb(${t.cd})`, border: `1px solid rgb(${t.c} / ${on ? 1 : 0.35})`, color: `rgb(${t.c})`, boxShadow: on ? `0 0 10px rgb(${t.c} / 0.5)` : 'none' }}>
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: `rgb(${t.c})`, boxShadow: `0 0 6px rgb(${t.c})` }} />
                <span className="min-w-0">{t.label}{on ? ' ✓' : ''}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Barra de navegação */}
      <section className="p-3 rounded-sm mb-4" style={box}>
        <Title icon={LayoutGrid}>Barra de navegação</Title>
        <p className="text-[10px] mb-3" style={{ color: 'rgb(var(--c) / 0.6)' }}>
          Usa as setas para mudar a ordem e o olho para esconder separadores que não usas. Vale para a barra de baixo e para o menu rápido.
        </p>
        <ul className="flex flex-col gap-1.5">
          {tabs.map((t, i) => {
            const hidden = s.hidden.includes(t.id);
            const Icon = t.icon;
            return (
              <li key={t.id} className="flex items-center gap-2 px-2 py-1.5 rounded-sm" style={{ ...btn, opacity: hidden ? 0.45 : 1 }}>
                <Icon size={15} />
                <span className="flex-1 min-w-0 text-xs uppercase tracking-wider truncate">{t.label}</span>
                <button type="button" onClick={() => move(t.id, -1)} disabled={i === 0} aria-label={`Subir ${t.label}`} className="p-1.5 rounded-sm disabled:opacity-25" style={btn}><ArrowUp size={14} /></button>
                <button type="button" onClick={() => move(t.id, 1)} disabled={i === tabs.length - 1} aria-label={`Descer ${t.label}`} className="p-1.5 rounded-sm disabled:opacity-25" style={btn}><ArrowDown size={14} /></button>
                <button type="button" onClick={() => toggle(t.id)} disabled={t.id === 'definicoes'} aria-label={`${hidden ? 'Mostrar' : 'Esconder'} ${t.label}`} aria-pressed={!hidden} className="p-1.5 rounded-sm disabled:opacity-25" style={btn}>
                  {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </li>
            );
          })}
        </ul>
        <label className="flex items-center gap-2 mt-3 text-xs cursor-pointer" style={{ color: 'rgb(var(--c) / 0.85)' }}>
          <input id="set-compact" type="checkbox" checked={s.compact} onChange={(e) => setSettings({ compact: e.target.checked })} style={{ accentColor: 'rgb(var(--c))' }} />
          Modo compacto: só ícones na barra de baixo (melhor em ecrãs pequenos)
        </label>
        <button type="button" onClick={resetSettings} className="flex items-center gap-2 mt-3 px-3 py-2 rounded-sm text-xs uppercase tracking-wider" style={btn}>
          <RotateCcw size={13} /> Repor tema e barra originais
        </button>
      </section>

      {/* Notificações (antigo separador Alertas) */}
      <section className="rounded-sm" style={box}>
        <div className="px-3 pt-3"><Title icon={Bell}>Notificações</Title></div>
        <NotificationsTab />
      </section>
    </div>
  );
}
