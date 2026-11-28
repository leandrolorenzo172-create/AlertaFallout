import React from 'react';
import { Settings, Languages, MapPin, LocateFixed, Palette, LayoutGrid, ArrowUp, ArrowDown, Eye, EyeOff, RotateCcw, Bell, Info, ChevronDown } from 'lucide-react';
import { THEMES, useSettings, setSettings, resetSettings, orderTabs } from '../theme';
import { TABS } from '../HotBar';
import NotificationsTab from './NotificationsTab';
import AiSettings from '../pipboy/AiSettings';
import BackupSection from '../backup/BackupSection';
import { t, LANGS, useLang } from '@/i18n';
import { LOCATIONS, useLoc, locMode, setLocManual, setLocAuto, detectLocation } from '@/location';
import { useCountry, countryName } from '@/geo/country';
import { useNetwork } from '@/lib/ai/net';
import { useAiConfig, activeProvider } from '@/lib/ai/config';
import { PROVIDERS } from '@/lib/ai/providers';
import { IS_ARTIFACT } from '@/api/base44Client';
import { CARD_IDS, onSettingsAction, focusCard, focusAfterReload, takePendingFocus } from '@/settingsActions';

// Nome da aplicação mostrado em "Sobre o sistema"
export const APP_NAME = 'SteelDeck -Terminal by:PandaSteel';

// Troca de idioma (o mesmo handler dos botões do cartão Idioma e da ferramenta rápida do menu ≡).
// As traduções são lidas ao arrancar, por isso a app recarrega; o cartão Idioma fica destacado ao voltar.
export function switchLang(id) {
  setSettings({ lang: id });
  focusAfterReload(CARD_IDS.idioma);
  setTimeout(() => location.reload(), 50);
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

// Localização: país e posição detetados automaticamente (GPS -> IP -> idioma do telemóvel).
// Em Portugal pode escolher-se uma cidade do IPMA à mão para o tempo e os avisos.
function LocationSection() {
  const loc = useLoc();
  const c = useCountry();
  const [msg, setMsg] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const mode = locMode();
  const SRC = { gps: t('GPS (posição exata)'), ip: t('endereço de internet (aproximada)'), locale: t('idioma do telemóvel (sem posição)'), manual: t('escolhida à mão') };
  const PERM = { granted: t('autorizada'), denied: t('bloqueada'), prompt: t('por autorizar'), unavailable: t('indisponível neste aparelho') };
  const auto = async () => {
    setBusy(true); setMsg('');
    try { const l = await detectLocation(); setMsg(t('✔ Localização encontrada: {c}.', { c: `${l.name}, ${countryName(l.country)}` })); }
    catch (e) { setMsg(e.message === 'denied' ? t('A localização está bloqueada para esta app. Ativa-a nas definições do telemóvel. Entretanto uso o país pelo endereço de internet.') : t('Não foi possível usar o GPS. Uso o país pelo endereço de internet ou pelo idioma do telemóvel.')); }
    finally { setBusy(false); }
  };
  const flag = c.code ? String.fromCodePoint(...[...c.code].map((ch) => 127397 + ch.charCodeAt(0))) : '';
  return (
    <section id={CARD_IDS.localizacao} className="p-3 rounded-sm mb-4" style={box}>
      <Title icon={MapPin}>{t('Localização')}</Title>
      <p className="text-[10px] mb-3" style={{ color: 'rgb(var(--c) / 0.6)' }}>
        {t('O país é detetado automaticamente e muda o número de emergência do SOS, as notícias, o tempo, as unidades e as rádios. Quem viaja vê o novo país ao voltar à app.')}
      </p>
      {c.status === 'loading' ? (
        <p className="text-xs mb-3 animate-pulse" style={{ color: 'rgb(var(--c))' }}>{t('A detetar o país…')}</p>
      ) : (
        <div className="text-xs mb-3 space-y-1" style={{ color: 'rgb(var(--c))' }}>
          <p>{flag} <b>{countryName(c.code) || '—'}</b>{c.code ? ` (${c.code})` : ''}{loc.name && loc.name !== countryName(c.code) ? ` · 📍 ${loc.name}` : ''}</p>
          <p style={{ color: 'rgb(var(--c) / 0.6)' }}>{t('Origem:')} {SRC[mode === 'manual' && c.code === 'PT' ? 'manual' : c.source] || '—'} · {t('GPS:')} {PERM[c.permission]}</p>
          {c.error && <p style={{ color: '#ef4444' }}>{t(c.error)}</p>}
        </div>
      )}
      <div className="flex flex-wrap gap-2 items-center">
        <button type="button" onClick={auto} disabled={busy} className="flex items-center gap-2 px-3 py-2 rounded-sm text-xs uppercase tracking-wider" style={{ ...btn, opacity: busy ? 0.6 : 1 }}>
          <LocateFixed size={13} /> {busy ? t('A localizar…') : t('Usar a minha localização')}
        </button>
        {c.code === 'PT' && (
          <select aria-label={t('Escolher cidade')} value={mode === 'manual' ? loc.id ?? '' : ''} onChange={(e) => { if (e.target.value) setLocManual(e.target.value); else setLocAuto(); setMsg(''); }}
            className="px-2 py-2 rounded-sm text-xs" style={{ ...btn, background: 'rgb(var(--cb))' }}>
            <option value="">{t('Cidade automática')}</option>
            {LOCATIONS.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        )}
      </div>
      {msg && <p className="text-[10px] mt-2" style={{ color: '#ffaa00' }}>{msg}</p>}
    </section>
  );
}

// Sobre o sistema: aplicação, idioma, rede, IA online, modo da IA, instalação (PWA) e armazenamento usado
function SystemInfoSection({ open, setOpen }) {
  const lang = useLang();
  const net = useNetwork();
  useAiConfig(); // atualiza quando a IA online é configurada
  const prov = activeProvider();
  const [storage, setStorage] = React.useState(null);
  React.useEffect(() => {
    if (!open || !navigator.storage?.estimate) return;
    navigator.storage.estimate().then((e) => setStorage(e)).catch(() => setStorage(null));
  }, [open]);
  const standalone = typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true);
  const mb = (b) => `${(b / 1048576).toFixed(1)} MB`;
  const aiOnline = IS_ARTIFACT ? 'Claude (claude.ai)' : prov ? PROVIDERS[prov.id]?.label : t('não configurada');
  const aiMode = net === 'online' && (IS_ARTIFACT || prov) ? t('Online (IA ligada)') : t('Offline (base local e documentos)');
  const rows = [
    [t('Aplicação'), APP_NAME],
    [t('Idioma'), LANGS.find((l) => l.id === lang)?.label || lang],
    [t('Rede'), net === 'online' ? t('Online') : t('Sem ligação')],
    [t('IA online'), aiOnline],
    [t('Modo IA'), aiMode],
    [t('Modo instalado (PWA)'), standalone ? t('Sim, instalada no ecrã inicial') : t('Não (aberta no browser)')],
    [t('Armazenamento usado'), storage ? `${mb(storage.usage || 0)}${storage.quota ? ` / ${mb(storage.quota)}` : ''}` : '—'],
  ];
  return (
    <section id={CARD_IDS.sobre} className="p-3 rounded-sm mb-4" style={box}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="w-full flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold" style={{ color: 'rgb(var(--c))' }}><Info size={14} /> {t('Sobre o sistema')}</span>
        <ChevronDown size={14} style={{ color: 'rgb(var(--c))', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
      </button>
      {open && (
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[11px]">
          {rows.map(([k, v]) => (
            <React.Fragment key={k}>
              <dt className="uppercase tracking-wider" style={{ color: 'rgb(var(--c) / 0.55)' }}>{k}</dt>
              <dd className="min-w-0 break-words" style={{ color: 'rgb(var(--c))' }}>{v}</dd>
            </React.Fragment>
          ))}
        </dl>
      )}
    </section>
  );
}

// Confirmação antes de repor as predefinições (evita reposições acidentais a partir do menu ≡)
function ConfirmReset({ onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4" style={{ background: '#000000aa' }} role="dialog" aria-modal="true" aria-labelledby="reset-title" onClick={onCancel}>
      <div className="w-full max-w-sm p-4 rounded-sm" style={{ background: 'rgb(var(--cd))', border: '1px solid rgb(var(--c) / 0.6)', boxShadow: '0 0 18px rgb(var(--c) / 0.35)' }} onClick={(e) => e.stopPropagation()}>
        <p id="reset-title" className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold mb-2" style={{ color: 'rgb(var(--c))' }}><RotateCcw size={14} /> {t('Repor predefinições')}</p>
        <p className="text-[11px] mb-4" style={{ color: 'rgb(var(--c) / 0.75)' }}>{t('O tema, a ordem e os separadores escondidos da barra e as categorias de notificações voltam aos valores originais. O idioma, a cidade, a IA e os teus documentos ficam como estão.')}</p>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onCancel} autoFocus className="px-3 py-2 rounded-sm text-xs uppercase tracking-wider" style={btn}>{t('Cancelar')}</button>
          <button type="button" onClick={onConfirm} className="px-3 py-2 rounded-sm text-xs uppercase tracking-wider font-bold" style={{ ...btn, border: '1px solid #ffaa00', color: '#ffaa00' }}>{t('Repor')}</button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsTab() {
  const s = useSettings();
  const lang = useLang();
  const tabs = orderTabs(TABS, s.order);
  const [aboutOpen, setAboutOpen] = React.useState(false);
  const [confirmReset, setConfirmReset] = React.useState(false);
  const [resetMsg, setResetMsg] = React.useState('');

  // Ferramentas rápidas do menu ≡ (ver src/settingsActions.js)
  React.useEffect(() => onSettingsAction((id) => {
    if (id === 'sobre') { setAboutOpen(true); setTimeout(() => focusCard(CARD_IDS.sobre), 60); } // abre se estiver recolhido
    else if (id === 'idioma') { focusCard(CARD_IDS.idioma); switchLang(lang === 'pt' ? 'en' : 'pt'); }
    else if (id === 'localizacao') focusCard(CARD_IDS.localizacao);
    else if (id === 'notificacoes') focusCard(CARD_IDS.notificacoes);
    else if (id === 'repor') setConfirmReset(true);
  }), [lang]);
  // depois de mudar de idioma (a app recarrega), destaca o cartão Idioma
  React.useEffect(() => { const id = takePendingFocus(); if (id) setTimeout(() => focusCard(id), 400); }, []);

  const doReset = () => {
    setConfirmReset(false);
    resetSettings(); // tema e barra (o mesmo handler do botão "Repor tema e barra originais")
    window.dispatchEvent(new CustomEvent('steeldeck:settings-action', { detail: { id: 'repor-notificacoes' } })); // categorias de notificações
    setResetMsg(t('✔ Predefinições repostas.'));
    setTimeout(() => setResetMsg(''), 4000);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
      {resetMsg && <p role="status" className="text-[11px] mb-3 px-3 py-2 rounded-sm" style={{ ...box, color: '#ffaa00' }}>{resetMsg}</p>}

      <SystemInfoSection open={aboutOpen} setOpen={setAboutOpen} />

      {/* Idioma da app */}
      <section id={CARD_IDS.idioma} className="p-3 rounded-sm mb-4" style={box}>
        <Title icon={Languages}>{t('Idioma')}</Title>
        <div className="grid grid-cols-2 gap-2">
          {LANGS.map((l) => {
            const on = lang === l.id;
            return (
              <button key={l.id} type="button" onClick={() => { if (lang !== l.id) switchLang(l.id); }} aria-pressed={on}
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
          {t('Usa as setas para mudar a ordem e o olho para esconder separadores que não usas. Vale para a barra de baixo e para o menu rápido.')}
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

      <AiSettings />

      {/* Cópia de segurança: exportar / enviar por email / importar tudo */}
      <BackupSection />

      {/* Notificações (antigo separador Alertas) */}
      <section id={CARD_IDS.notificacoes} className="rounded-sm" style={box}>
        <div className="px-3 pt-3"><Title icon={Bell}>{t('Notificações')}</Title></div>
        <NotificationsTab />
      </section>
      {confirmReset && <ConfirmReset onCancel={() => setConfirmReset(false)} onConfirm={doReset} />}
    </div>
  );
}
