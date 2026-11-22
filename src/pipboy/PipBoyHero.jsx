import React, { useEffect, useState } from 'react';
import Mascot from './Mascot';
import { IS_ARTIFACT } from '@/api/base44Client';
import { fetchWeather } from '@/api/liveData';
import { t, locale } from '@/i18n';

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
function Metric({ label, value, align = 'left' }) {
  return (
    <div className="min-w-0" style={{ textAlign: align }}>
      <p className="text-[11px] sm:text-xs uppercase tracking-wide font-bold leading-tight" style={{ color: 'rgb(var(--c) / 0.75)' }}>{label}</p>
      <p className="text-[11px] sm:text-xs uppercase mb-1" style={{ color: '#ffaa00' }}>{t('Nível:')}{' '}{value.toFixed(1)}/10</p>
      <Bar value={value} />
    </div>
  );
}

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

// Escolhe o estado do painel a partir do tempo real em Braga
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

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => {
    if (IS_ARTIFACT) { setWxError(true); return undefined; } // no claude.ai não há acesso a dados externos
    let alive = true;
    const load = () => fetchWeather().then((w) => { if (alive) { setWeather(w); setWxError(false); } }).catch(() => { if (alive) setWxError(true); });
    load();
    const t = setInterval(load, 15 * 60000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const g = Number(data?.global_threat_level) || 0;
  const braga = weather?.cities?.find((c) => c.name === 'Braga');
  const alerts = (weather?.alerts || []).filter((a) => /braga/i.test(a.city));
  const auto = modeFromWeather(braga);
  const mode = test === 'auto' ? auto : test;
  const date = now.toLocaleDateString(locale(), { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).replace(/\./g, '').toUpperCase();

  return (
    <div className="mb-6">
      {/* Relógio */}
      <div className="flex items-baseline gap-3 px-3 py-2 mb-3 rounded-md" style={{ background: 'rgb(var(--cd) / 0.5)', border: '1px solid rgb(var(--c) / 0.2)' }}>
        <span className="text-4xl font-bold tabular-nums leading-none" style={{ textShadow: '0 0 12px rgb(var(--c) / 0.6)' }}>
          {now.toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit', hour12: false })}
        </span>
        <span className="text-sm tracking-wider" style={{ color: 'rgb(var(--c) / 0.8)' }}>{date}</span>
      </div>

      {/* Nível global */}
      <p className="text-center text-base sm:text-xl font-bold uppercase tracking-wider mb-2" style={{ color: '#ffaa00', textShadow: '0 0 10px #ffaa0066' }}>
        {t('Nível de ameaça global:')}{' '}{g.toFixed(1)}
      </p>
      <div className="mb-5"><Bar value={g} /></div>

      {/* Indicadores à volta da mascote: 3 à esquerda, 3 à direita */}
      <div className="grid items-center gap-x-2 gap-y-6" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(84px,30%) minmax(0,1fr)' }}>
        <Metric label={t('Risco de guerra')} value={Number(data?.war_risk) || 0} />
        <Mascot mode="base" className="w-full" style={{ gridRow: 'span 3', maxHeight: 260 }} />
        <Metric label={t('Tensão geopolítica')} value={Number(data?.geopolitical_tension) || 0} align="right" />
        <Metric label={t('Catástrofes')} value={Number(data?.natural_disaster_risk) || 0} />
        <Metric label={t('Risco cibernético')} value={Number(data?.cyber_risk) || 0} align="right" />
        <Metric label={t('Instab. económica')} value={Number(data?.economic_instability) || 0} />
        <Metric label={t('Greves')} value={Number(data?.strike_index) || 0} align="right" />
      </div>
      <p className="text-center text-sm font-bold uppercase tracking-wider mt-3" style={{ color: 'rgb(var(--c) / 0.85)' }}>{t('Ameaça global')}</p>
      <p className="text-center text-sm uppercase mb-4" style={{ color: '#ffaa00' }}>{t('Índice:')}{' '}{g.toFixed(1)}</p>

      {/* Alertas e clima */}
      <div className="pb-wx relative overflow-hidden rounded-xl p-3" style={{ background: 'linear-gradient(rgb(var(--c) / 0.16), rgb(var(--cd) / 0.7))', border: '1px solid rgb(var(--c) / 0.35)' }}>
        <WeatherFx mode={mode} />
        <h3 className="relative text-base font-bold uppercase tracking-wider mb-2" style={{ textShadow: '0 0 8px rgb(var(--c) / 0.5)' }}>{t('Alertas e clima')}</h3>
        <div className="relative flex gap-3 items-center">
          <Mascot key={mode} mode={mode} className="shrink-0 pb-swap" style={{ width: 96 }} />
          <div className="min-w-0 flex-1 text-xs leading-snug">
            <p className="font-bold uppercase" style={{ color: 'rgb(var(--c))' }}>{t('Alertas de última hora (Braga):')}</p>
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
                <p className="text-sm" style={{ color: 'rgb(var(--c) / 0.9)' }}>{t('BRAGA —')}{' '}{braga.temp}°C ({braga.condition})</p>
                <p className="text-[10px]" style={{ color: 'rgb(var(--c) / 0.7)' }}>
                  {t('Hr:')}{' '}{braga.humidity}{t('% | Vento:')}{' '}{braga.wind_kmh}{' '}{t('km/h')}{' '}{braga.wind_direction}{' '}{t('| UV:')}{' '}{braga.uv_index} ({UV_TXT(braga.uv_index)}{t(') | Term:')}{' '}{braga.min_temp}°/{braga.max_temp}°
                </p>
              </>
            ) : (
              <p style={{ color: 'rgb(var(--c) / 0.7)' }}>{wxError ? t('Indisponível.') : t('A carregar...')}</p>
            )}
            {test !== 'auto' && <p className="text-[10px] mt-1" style={{ color: '#ffaa00' }}>{t('Modo de teste: a mascote não segue o tempo real.')}</p>}
          </div>
        </div>
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
      </div>
    </div>
  );
}
