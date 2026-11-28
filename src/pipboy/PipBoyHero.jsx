import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Mascot from './Mascot';
import { IS_ARTIFACT } from '@/api/base44Client';
import { fetchWeather } from '@/api/liveData';
import { useLoc } from '@/location';
import { t, locale, tempVal, windVal, windUnit, tempUnit } from '@/i18n';
import { useSettings } from '@/theme';
import { useNowPlaying, toggleNowPlaying } from '@/audio/useNowPlaying';

const levelColor = (v) => (v >= 8 ? '#ff0000' : v >= 6 ? '#ff6600' : v >= 4 ? '#ffaa00' : 'rgb(var(--c))');

function Bar({ value }) {
  const pct = Math.min(100, Math.max(0, (value / 10) * 100));
  const col = levelColor(value);
  return (
    <div className="h-2.5 rounded-sm overflow-hidden" style={{ border: '1px solid rgb(var(--c) / 0.45)', background: 'rgb(var(--cb))' }}>
      <div className="h-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, #ff6600, ${value >= 4 ? '#ffcc00' : col})`, transition: 'width 1s ease-out', boxShadow: `0 0 8px ${value >= 4 ? '#ffaa0088' : 'rgb(var(--c) / 0.5)'}` }} />
    </div>
  );
}
// Bloco tocável (barra + rótulo): abre o separador do indicador. Funciona com toque, rato e teclado.
// go: um caminho ('/guerra') ou uma função (ex.: descer até ao resumo do painel)
function useGo() {
  const navigate = useNavigate();
  return (go) => (typeof go === 'function' ? go() : navigate(go));
}
function Tap({ go, label, className = '', style, children }) {
  const open = useGo();
  return (
    <div role="button" tabIndex={0} aria-label={label} className={`th-link ${className}`} style={style}
      onClick={() => open(go)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(go); } }}
      onTouchStart={() => {}} /* ativa o :active no Safari do iPhone */>
      {children}
    </div>
  );
}
function Metric({ label, value, align = 'left', go, hint }) {
  return (
    <Tap go={go} label={`${label}: ${value.toFixed(1)}/10. ${hint}`} className="min-w-0" style={{ textAlign: align }}>
      <p className="text-[11px] sm:text-xs uppercase tracking-wide font-bold leading-tight" style={{ color: 'rgb(var(--c) / 0.75)' }}>{label}</p>
      <p className="text-[11px] sm:text-xs uppercase mb-1" style={{ color: '#ffaa00' }}>{t('Nível:')}{' '}{value.toFixed(1)}/10</p>
      <Bar value={value} />
    </Tap>
  );
}
// Desce até ao resumo do painel (visão geral), por baixo dos indicadores
const toSummary = () => document.getElementById('painel-resumo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

// Efeitos animados de cada estado do tempo. Ficam dentro da caixa do painel, que os corta nos limites.
const seq = (n) => Array.from({ length: n }, (_, i) => i);
function WeatherFx({ mode }) {
  let fx = null;
  if (mode === 'rain') {
    fx = seq(26).map((i) => <i key={i} className="fx-drop" style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i * 0.137) % 1.2}s`, animationDuration: `${0.7 + ((i * 7) % 5) / 10}s` }} />);
  } else if (mode === 'wind') {
    fx = seq(14).map((i) => <i key={i} className="fx-gust" style={{ top: `${6 + ((i * 29) % 88)}%`, width: `${18 + ((i * 13) % 30)}px`, animationDelay: `${(i * 0.23) % 1.6}s`, animationDuration: `${0.8 + ((i * 5) % 7) / 10}s` }} />);
  } else if (mode === 'fog') {
    fx = seq(4).map((i) => <i key={i} className="fx-fog" style={{ top: `${8 + i * 23}%`, animationDelay: `${i * -3.5}s`, animationDuration: `${13 + i * 3}s` }} />);
  } else if (mode === 'cold') {
    fx = seq(16).map((i) => <i key={i} className="fx-snow" style={{ left: `${(i * 41 + 5) % 100}%`, fontSize: `${10 + ((i * 3) % 8)}px`, animationDelay: `${(i * 0.61) % 6}s`, animationDuration: `${5 + ((i * 7) % 5)}s` }}>✱</i>);
  } else if (mode === 'sun') {
    fx = <i className="fx-sunglow" />;
  }
  // a chave faz o efeito novo entrar com uma transição suave sempre que o modo muda
  return <div key={mode} className="pb-fx" aria-hidden="true">{fx}</div>;
}

// Escolhe o estado do painel a partir do tempo real na cidade do utilizador
function modeFromWeather(city) {
  if (!city) return 'base';
  const c = (city.condition || '').toLowerCase();
  if (/chuva|aguaceiro|chuvisco|trovoada|granizo/.test(c)) return 'rain';
  if (/neve|geada/.test(c) || city.temp <= 3) return 'cold';
  if (/nevoeiro|neblina/.test(c)) return 'fog';
  if (Number(city.wind_kmh) >= 40) return 'wind';
  if (/limpo|pouco nublado|sol/.test(c)) return 'sun';
  return 'cloud';
}
const MODES = [
  { id: 'auto', label: 'Auto' }, { id: 'rain', label: 'Chuva' }, { id: 'sun', label: 'Sol' },
  { id: 'wind', label: 'Vento' }, { id: 'fog', label: 'Nevoeiro' }, { id: 'cold', label: 'Frio' },
];
const NO_ALERT = {
  sun: t('Não há alertas ativos. Aproveita o dia de sol ao ar livre!'),
  rain: t('Não há alertas ativos, mas leva impermeável.'),
  wind: t('Não há alertas ativos. Atenção a objetos soltos com o vento.'),
  fog: t('Não há alertas ativos. Visibilidade reduzida: cuidado na estrada.'),
  cold: t('Não há alertas ativos. Agasalha-te bem.'),
  cloud: t('Não há alertas ativos.'), base: t('Não há alertas ativos.'),
};
const UV_TXT = (u) => (u >= 8 ? t('Muito alto') : u >= 6 ? t('Alto') : u >= 3 ? t('Moderado') : t('Baixo'));

export default function PipBoyHero({ data }) {
  const [now, setNow] = useState(new Date());
  const [weather, setWeather] = useState(null);
  const [wxError, setWxError] = useState(false);
  const [test, setTest] = useState('auto');
  const loc = useLoc(); // cidade do telemóvel (ou escolhida nas Definições)
  const { theme } = useSettings(); // muda em tempo real quando se troca de tema
  const fem = theme === 'lilac'; // tema lilás = mascote feminina
  const name = fem ? 'Mrs. Steel' : 'Mr.Steel';

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => {
    if (IS_ARTIFACT) { setWxError(true); return undefined; } // no claude.ai não há acesso a dados externos
    let alive = true;
    if (!loc.ready) return undefined; // à espera do país
    const load = () => fetchWeather(loc).then((w) => { if (alive) { setWeather(w); setWxError(false); } }).catch(() => { if (alive) setWxError(true); });
    load();
    const t = setInterval(load, 15 * 60000);
    return () => { alive = false; clearInterval(t); };
  }, [loc.key]); // muda com o país/posição detetados

  const g = Number(data?.global_threat_level) || 0;
  const braga = weather?.here || null; // tempo atual na cidade do utilizador
  const alerts = weather?.here_alerts || [];
  const auto = modeFromWeather(braga);
  const mode = test === 'auto' ? auto : test;
  const playingNow = useNowPlaying();
  // formato pedido: "Aba Radio a tocar - [Estação] - [Música]" / "Aba Musica - [Música]"
  // formato compacto: "musica on - [faixa]" / "radio on - [estação] - [música]" (ou "pause" em vez de "on")
  // 2 linhas (como as horas e a data): em cima o estado ("radio on" / "musica pause"),
  // em baixo "[estação] - [música]" (rádio) ou "[faixa]" (música), numa linha cortada com "…"
  const onOff = playingNow?.paused ? 'pause' : 'on';
  const playingState = !playingNow ? '' : `${playingNow.kind === 'radio' ? t('radio') : t('musica')} ${onOff}`;
  const playingDetail = !playingNow ? '' : playingNow.kind === 'radio'
    ? [playingNow.station, playingNow.paused ? '' : playingNow.track].filter(Boolean).join(' - ')
    : playingNow.track || '';
  const playingText = playingNow ? [playingState, playingDetail].filter(Boolean).join(' - ') : '';
  const date = now.toLocaleDateString(locale(), { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).replace(/\./g, '').toUpperCase();

  return (
    <div className="mb-6">
      {/* Relógio */}
      <div className="flex items-center gap-3 px-3 py-2 mb-3 rounded-md min-w-0" style={{ background: 'rgb(var(--cd) / 0.5)', border: '1px solid rgb(var(--c) / 0.2)' }}>
        <div className={`flex shrink-0 ${playingText ? 'flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-3' : 'items-baseline gap-3'}`}>
          <span className="text-4xl font-bold tabular-nums leading-none" style={{ textShadow: '0 0 12px rgb(var(--c) / 0.6)' }}>
            {now.toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit', hour12: false })}
          </span>
          <span className={`tracking-wider ${playingText ? 'text-[11px] sm:text-sm' : 'text-sm'}`} style={{ color: 'rgb(var(--c) / 0.8)' }}>{date}</span>
        </div>
        {/* A tocar (Rádio ou Música): só aparece com reprodução ativa, à direita da linha âmbar */}
        {playingText && (
          <>
            <span aria-hidden="true" className="self-stretch shrink-0" style={{ width: 2, background: '#ffaa00', boxShadow: '0 0 6px #ffaa00, 0 0 12px #ffaa0066', borderRadius: 1 }} />
            {/* toque = Play / Pause da fonte ativa (Música ou Rádio); 2 linhas alinhadas à direita */}
            <button type="button" onClick={() => toggleNowPlaying(playingNow)} title={playingText}
              aria-label={`${playingText}. ${playingNow.paused ? t('Tocar') : t('Pausar')}`}
              className="flex-1 min-w-0 self-stretch flex flex-col justify-center items-end gap-0.5 text-right cursor-pointer"
              style={{ color: '#ffaa00', textShadow: '0 0 10px #ffaa0066' }}> {/* mesma cor e brilho do "Nível de ameaça global" */}
              <span className="flex items-center gap-1.5 max-w-full text-base sm:text-xl font-bold tracking-wider leading-none" aria-live="polite"
>
                <span className={`shrink-0 w-2 h-2 rounded-full ${playingNow.paused ? '' : 'animate-pulse'}`} style={{ background: playingNow.paused ? '#ffaa0040' : '#ffaa00', boxShadow: playingNow.paused ? 'none' : '0 0 6px #ffaa00' }} />
                <span className="truncate">{playingState}</span>
              </span>
              {playingDetail && <span className="block max-w-full truncate text-[11px] sm:text-sm tracking-wider">{playingDetail}</span>}
            </button>
          </>
        )}
      </div>

      {/* Nível global: toque abre a visão geral (resumo e eventos críticos do painel) */}
      <Tap go={toSummary} label={`${t('Nível de ameaça global:')} ${g.toFixed(1)}. ${t('Ver visão geral')}`} className="mb-5">
        <p className="text-center text-base sm:text-xl font-bold uppercase tracking-wider mb-2" style={{ color: '#ffaa00', textShadow: '0 0 10px #ffaa0066' }}>
          {t('Nível de ameaça global:')}{' '}{g.toFixed(1)}
        </p>
        <Bar value={g} />
      </Tap>

      {/* Indicadores à volta da mascote: 3 à esquerda, 3 à direita */}
      <div className="grid items-center gap-x-2 gap-y-6" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(84px,30%) minmax(0,1fr)' }}>
        <Metric label={t('Risco de guerra')} value={Number(data?.war_risk) || 0} go="/guerra" hint={t('Abrir separador Guerra')} />
        <div className="flex flex-col items-center min-w-0" style={{ gridRow: 'span 3' }}>
          <Mascot mode="base" fem={fem} className="w-full" style={{ maxHeight: 240 }} />
          {/* nome da mascote, conforme o tema (Mr.Steel / Mrs. Steel no tema lilás) */}
          <p className="pb-name text-center text-sm sm:text-base font-bold tracking-wider mt-1 whitespace-nowrap" aria-live="polite"
            style={{ color: 'rgb(var(--c))', textShadow: fem ? '0 0 10px rgb(var(--c) / 0.9), 0 0 2px #fff' : '0 0 8px rgb(var(--c) / 0.6)' }}>{name}</p>
        </div>
        <Metric label={t('Tensão geopolítica')} value={Number(data?.geopolitical_tension) || 0} align="right" go="/guerra" hint={t('Abrir separador Guerra')} />
        <Metric label={t('Catástrofes')} value={Number(data?.natural_disaster_risk) || 0} go="/catastrofes" hint={t('Abrir separador Catástrofes')} />
        <Metric label={t('Risco cibernético')} value={Number(data?.cyber_risk) || 0} align="right" go="/ciber" hint={t('Abrir separador Ciberataques')} />
        <Metric label={t('Instab. económica')} value={Number(data?.economic_instability) || 0} go="/economia" hint={t('Abrir separador Economia')} />
        <Metric label={t('Greves')} value={Number(data?.strike_index) || 0} align="right" go="/greves" hint={t('Abrir separador Greves')} />
      </div>
      <p className="text-center text-sm uppercase mt-3 mb-4" style={{ color: '#ffaa00' }}>{t('Índice:')}{' '}{g.toFixed(1)}</p>

      {/* Alertas e clima */}
      <div className="pb-wx relative overflow-hidden rounded-xl p-3" style={{ background: 'linear-gradient(rgb(var(--c) / 0.16), rgb(var(--cd) / 0.7))', border: '1px solid rgb(var(--c) / 0.35)' }}>
        <WeatherFx mode={mode} />
        <h3 className="relative text-base font-bold uppercase tracking-wider mb-2" style={{ textShadow: '0 0 8px rgb(var(--c) / 0.5)' }}>{t('Alertas e clima')}</h3>
        <div className="relative flex gap-3 items-center">
          <Mascot key={mode} mode={mode} className="shrink-0 pb-swap" style={{ width: 96 }} />
          <div className="min-w-0 flex-1 text-xs leading-snug">
            <p className="font-bold uppercase" style={{ color: 'rgb(var(--c))' }}>{t('Alertas de última hora ({c}):', { c: loc.name })}</p>
            {wxError && !weather ? (
              <p style={{ color: 'rgb(var(--c) / 0.7)' }}>{t('Sem dados meteorológicos neste momento.')}</p>
            ) : alerts.length ? alerts.slice(0, 2).map((a, i) => (
              <p key={i} style={{ color: '#ffcc00' }}>⚠️ <b className="uppercase">{t('Alerta')}{' '}{a.severity}</b> ({a.alert_type}): {a.description}</p>
            )) : (
              <p style={{ color: 'rgb(var(--c) / 0.85)' }}>{weather ? NO_ALERT[mode] : t('A carregar...')}</p>
            )}
            <p className="font-bold uppercase mt-2" style={{ color: 'rgb(var(--c))' }}>{t('Clima em tempo real:')}</p>
            {braga ? (
              <>
                <p className="text-sm" style={{ color: 'rgb(var(--c) / 0.9)' }}>{loc.name.toUpperCase()} —{' '}{tempVal(braga.temp)}{tempUnit()} ({braga.condition})</p>
                <p className="text-[10px]" style={{ color: 'rgb(var(--c) / 0.7)' }}>
                  {t('Hr:')}{' '}{braga.humidity}{t('% | Vento:')}{' '}{windVal(braga.wind_kmh)}{' '}{windUnit()}{' '}{braga.wind_direction}{' '}{t('| UV:')}{' '}{braga.uv_index} ({UV_TXT(braga.uv_index)}{t(') | Term:')}{' '}{tempVal(braga.min_temp)}°/{tempVal(braga.max_temp)}°
                </p>
              </>
            ) : (
              <p style={{ color: 'rgb(var(--c) / 0.7)' }}>{wxError ? t('Indisponível.') : t('A carregar...')}</p>
            )}
            {test !== 'auto' && <p className="text-[10px] mt-1" style={{ color: '#ffaa00' }}>{t('Modo de teste: a mascote não segue o tempo real.')}</p>}
          </div>
        </div>
        {/* Botões de teste do tempo: só no artefacto do claude.ai (a app publicada fica sempre em Auto) */}
        {IS_ARTIFACT && (
        <div className="relative flex flex-wrap items-center gap-1.5 mt-3">
            <span className="text-[10px] uppercase tracking-wider" style={{ color: 'rgb(var(--c) / 0.55)' }}>{t('Testar:')}</span>
            {MODES.map((m) => (
              <button key={m.id} type="button" onClick={() => setTest(m.id)} aria-pressed={test === m.id}
                className="px-2 py-1 rounded-sm text-[10px] uppercase tracking-wider"
                style={{ background: test === m.id ? 'rgb(var(--c))' : 'rgb(var(--cb) / 0.6)', color: test === m.id ? 'rgb(var(--cb))' : 'rgb(var(--c) / 0.8)', border: '1px solid rgb(var(--c) / 0.4)' }}>
                {t(m.label)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
