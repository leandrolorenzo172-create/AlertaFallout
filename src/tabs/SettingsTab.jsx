import React from 'react';
import { Settings, Languages, MapPin, LocateFixed, Palette, LayoutGrid, ArrowUp, ArrowDown, Eye, EyeOff, RotateCcw, Bell, Info, X } from 'lucide-react';
import { THEMES, useSettings, setSettings, resetSettings, orderTabs } from '../theme';
import { TABS } from '../HotBar';
import NotificationsTab from './NotificationsTab';
import AiSettings from '../pipboy/AiSettings';
import { t, LANGS, useLang } from '@/i18n';
import { LOCATIONS, useLoc, locMode, setLocManual, detectLocation } from '@/location';
import { useQuickTools, showToolToast } from '../tools/quickTools';
import { onlineProvider, providerName } from '@/lib/ai/aiService';
import { getAiMode, AI_MODE_LABEL } from '@/lib/ai/mode';
import { getNetwork } from '@/lib/ai/net';

const scrollToId = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

// "Sobre o sistema" (ferramenta do menu ≡): estado da app neste dispositivo
function AboutPanel({ onClose }) {
  const [storage, setStorage] = React.useState(null);
  React.useEffect(() => {
    navigator.storage?.estimate?.().then((e) => setStorage(e)).catch(() => {});
  }, []);
  const mb = (b) => `${(b / 1048576).toFixed(1)} MB`;
  const prov = onlineProvider();
  const rows = [
    [t('Aplicação'), 'SteelDeck · Pip-Boy Terminal'],
    [t('Idioma'), LANGS.find((l) => l.id === useLang())?.label || ''],
    [t('Rede'), getNetwork() === 'online' ? t('Online') : t('Offline')],
    [t('IA online'), prov ? providerName(prov) : t('não configurada')],
    [t('Modo IA'), t(AI_MODE_LABEL[getAiMode()])],
    [t('Modo instalado (PWA)'), window.matchMedia?.('(display-mode: standalone)').matches ? t('sim') : t('não')],
    [t('Armazenamento usado'), storage ? `${mb(storage.usage || 0)} / ${mb(storage.quota || 0)}` : '—'],
  ];
  return (
    <section id="set-about" className="p-3 rounded-sm mb-4" style={{ ...box, scrollMarginTop: 90 }}>
      <div className="flex items-center justify-between">
        <Title icon={Info}>{t('Sobre o sistema')}</Title>
        <button type="button" onClick={onClose} aria-label={t('Fechar')} className="p-1 -mt-3"><X size={14} /></button>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px]">
        {rows.map(([k, v]) => (
          <React.Fragment key={k}>
            <dt style={{ color: 'rgb(var(--c) / 0.55)' }}>{k}</dt>
            <dd className="min-w-0" style={{ color: 'rgb(var(--c))', overflowWrap: 'anywhere' }}>{v}</dd>
          </React.Fragment>
        ))}
      </dl>
    </section>
  );
}

const box = { background: 'rgb(var(--cd) / 0.4)', border: '1px solid rgb(var(--c) / 0.2)' };
const btn = { background: 'rgb(var(--cb) / 0.6)', border: '1px solid rgb(var(--c) / 0.3)', color: 'rgb(var(--c))' };

function Title({ icon: Icon, children }) {
  return (
    <h3 className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold mb-3" style={{ color: 'rgb(var(--c))' }}>
      <Icon size={14} /> {children}
    </h3>
  );
}

// Localização: cidade do tempo, dos avisos e das notificações
function LocationSection() {
  const loc = useLoc();
  const [msg, setMsg] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const mode = locMode();
  const auto = async () => {
    setBusy(true); setMsg('');
    try { const l = await detectLocation(); setMsg(t('✔ Localização encontrada: {c}.', { c: l.name })); }
    catch (e) { setMsg(e.message === 'denied' ? t('A localização está bloqueada para esta app. Ativa-a nas definições do telemóvel ou escolhe a cidade na lista.') : t('Não foi possível obter a localização. Escolhe a cidade na lista.')); }
    finally { setBusy(false); }
  };
  return (
    <section className="p-3 rounded-sm mb-4" style={box}>
      <Title icon={MapPin}>{t('Localização')}</Title>
      <p className="text-[10px] mb-3" style={{ color: 'rgb(var(--c) / 0.6)' }}>
        {t('O tempo, os alertas do IPMA e as notificações do tempo são da cidade escolhida. A posição exata fica só no telemóvel; só se usa a cidade.')}
      </p>
      <p className="text-xs mb-3" style={{ color: 'rgb(var(--c))' }}>
        📍 {loc.name}{' '}<span style={{ color: 'rgb(var(--c) / 0.55)' }}>({mode === 'auto' ? t('automática') : mode === 'manual' ? t('escolhida à mão') : t('por omissão')})</span>
      </p>
      <div className="flex flex-wrap gap-2 items-center">
        <button type="button" onClick={auto} disabled={busy} className="flex items-center gap-2 px-3 py-2 rounded-sm text-xs uppercase tracking-wider" style={{ ...btn, opacity: busy ? 0.6 : 1 }}>
          <LocateFixed size={13} /> {busy ? t('A localizar…') : t('Usar a minha localização')}
        </button>
        <select aria-label={t('Escolher cidade')} value={loc.id} onChange={(e) => { setLocManual(e.target.value); setMsg(''); }}
          className="px-2 py-2 rounded-sm text-xs" style={{ ...btn, background: 'rgb(var(--cb))' }}>
          {LOCATIONS.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>
      {msg && <p className="text-[10px] mt-2" style={{ color: '#ffaa00' }}>{msg}</p>}
    </section>
  );
}

export default function SettingsTab() {
  const s = useSettings();
  const lang = useLang();
  const tabs = orderTabs(TABS, s.order);
  const [about, setAbout] = React.useState(false);

  // Ferramentas do menu ≡ (src/tools/toolMenus.js → definicoes)
  useQuickTools('definicoes', {
    chave: () => scrollToId('set-ai'),
    audio: () => scrollToId('set-notif'),
    repor: () => {
      if (!window.confirm(t('Repor o tema, a ordem e a visibilidade dos separadores? O idioma, a chave de IA e os teus dados ficam iguais.'))) return;
      resetSettings();
      showToolToast(t('Predefinições repostas.'));
    },
    sobre: () => { setAbout(true); setTimeout(() => scrollToId('set-about'), 50); },
  });

  const move = (id, dir) => {
    const ids = tabs.map((x) => x.id);
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
        <h2 className="text-sm uppercase tracking-wider font-bold" style={{ color: 'rgb(var(--c))' }}>{t('Definições')}</h2>
      </div>

      {about && <AboutPanel onClose={() => setAbout(false)} />}

      {/* Idioma da app */}
      <section className="p-3 rounded-sm mb-4" style={box}>
        <Title icon={Languages}>{t('Idioma')}</Title>
        <div className="grid grid-cols-2 gap-2">
          {LANGS.map((l) => {
            const on = lang === l.id;
            return (
              <button key={l.id} type="button" onClick={() => { if (lang === l.id) return; setSettings({ lang: l.id }); setTimeout(() => location.reload(), 50); }} aria-pressed={on}
                className="flex items-center gap-2 px-3 py-2.5 rounded-sm text-xs text-left"
                style={{ ...btn, border: `1px solid rgb(var(--c) / ${on ? 1 : 0.3})`, boxShadow: on ? '0 0 10px rgb(var(--c) / 0.5)' : 'none' }}>
                <span className="text-base leading-none">{l.flag}</span>
                <span className="min-w-0">{l.label}{on ? ' ✓' : ''}</span>
              </button>
            );
          })}
        </div>
      </section>

      <LocationSection />

      {/* Tema de cores */}
      <section className="p-3 rounded-sm mb-4" style={box}>
        <Title icon={Palette}>{t('Tema de cores')}</Title>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {THEMES.map((th) => {
            const on = s.theme === th.id;
            return (
              <button key={th.id} type="button" onClick={() => setSettings({ theme: th.id })} aria-pressed={on}
                className="flex items-center gap-2 px-3 py-2.5 rounded-sm text-xs text-left"
                style={{ background: `rgb(${th.cd})`, border: `1px solid rgb(${th.c} / ${on ? 1 : 0.35})`, color: `rgb(${th.c})`, boxShadow: on ? `0 0 10px rgb(${th.c} / 0.5)` : 'none' }}>
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: `rgb(${th.c})`, boxShadow: `0 0 6px rgb(${th.c})` }} />
                <span className="min-w-0">{t(th.label)}{on ? ' ✓' : ''}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Barra de navegação */}
      <section className="p-3 rounded-sm mb-4" style={box}>
        <Title icon={LayoutGrid}>{t('Barra de navegação')}</Title>
        <p className="text-[10px] mb-3" style={{ color: 'rgb(var(--c) / 0.6)' }}>
          {t('Usa as setas para mudar a ordem e o olho para esconder separadores que não usas. O botão ≡ mostra as ferramentas do separador aberto.')}
        </p>
        <ul className="flex flex-col gap-1.5">
          {tabs.map((tb, i) => {
            const hidden = s.hidden.includes(tb.id);
            const Icon = tb.icon;
            return (
              <li key={tb.id} className="flex items-center gap-2 px-2 py-1.5 rounded-sm" style={{ ...btn, opacity: hidden ? 0.45 : 1 }}>
                <Icon size={15} />
                <span className="flex-1 min-w-0 text-xs uppercase tracking-wider truncate">{t(tb.label)}</span>
                <button type="button" onClick={() => move(tb.id, -1)} disabled={i === 0} aria-label={t('Subir {x}', { x: t(tb.label) })} className="p-1.5 rounded-sm disabled:opacity-25" style={btn}><ArrowUp size={14} /></button>
                <button type="button" onClick={() => move(tb.id, 1)} disabled={i === tabs.length - 1} aria-label={t('Descer {x}', { x: t(tb.label) })} className="p-1.5 rounded-sm disabled:opacity-25" style={btn}><ArrowDown size={14} /></button>
                <button type="button" onClick={() => toggle(tb.id)} disabled={tb.id === 'definicoes'} aria-label={`${hidden ? t('Mostrar') : t('Esconder')} ${t(tb.label)}`} aria-pressed={!hidden} className="p-1.5 rounded-sm disabled:opacity-25" style={btn}>
                  {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </li>
            );
          })}
        </ul>
        <label className="flex items-center gap-2 mt-3 text-xs cursor-pointer" style={{ color: 'rgb(var(--c) / 0.85)' }}>
          <input id="set-compact" type="checkbox" checked={s.compact} onChange={(e) => setSettings({ compact: e.target.checked })} style={{ accentColor: 'rgb(var(--c))' }} />
          {t('Modo compacto: só ícones na barra de baixo (melhor em ecrãs pequenos)')}
        </label>
        <button type="button" onClick={resetSettings} className="flex items-center gap-2 mt-3 px-3 py-2 rounded-sm text-xs uppercase tracking-wider" style={btn}>
          <RotateCcw size={13} />{' '}{t('Repor tema e barra originais')}
        </button>
      </section>

      <div id="set-ai" style={{ scrollMarginTop: 90 }}><AiSettings /></div>

      {/* Notificações (antigo separador Alertas) */}
      <section id="set-notif" className="rounded-sm" style={{ ...box, scrollMarginTop: 90 }}>
        <div className="px-3 pt-3"><Title icon={Bell}>{t('Notificações')}</Title></div>
        <NotificationsTab />
      </section>
    </div>
  );
}
