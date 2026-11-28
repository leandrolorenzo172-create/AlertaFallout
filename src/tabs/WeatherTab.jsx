import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Cloud, RefreshCw, Loader2, Thermometer, Wind, Droplets, Eye, Sun, CloudRain, Waves, Anchor, Compass, SunMedium } from 'lucide-react';
import { alpha } from '../theme';
import { t, locale, tempVal, windVal, windUnit, tempUnit } from '@/i18n';
import { useLoc } from '@/location';
import { countryName } from '@/geo/country';
import { reportMeteo, onWeatherRefresh } from '@/weather/weatherTools';

// Carrossel horizontal sem a barra nativa (branca): desliza com o dedo, roda do rato ou arrastar com o rato
function HScroll({ children, label }) {
  const ref = useRef(null);
  const [edge, setEdge] = useState({ l: false, r: false });
  const upd = () => { const el = ref.current; if (el) setEdge({ l: el.scrollLeft > 4, r: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 }); };
  useEffect(() => {
    const el = ref.current; if (!el) return undefined;
    upd();
    const onWheel = (e) => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && el.scrollWidth > el.clientWidth) { el.scrollLeft += e.deltaY; e.preventDefault(); } };
    el.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('resize', upd);
    return () => { el.removeEventListener('wheel', onWheel); window.removeEventListener('resize', upd); };
  }, []);
  const drag = useRef(null);
  const down = (e) => { if (e.pointerType !== 'mouse') return; drag.current = { x: e.clientX, s: ref.current.scrollLeft, moved: false }; };
  const move = (e) => { const d = drag.current; if (!d) return; const dx = e.clientX - d.x; if (Math.abs(dx) > 3) d.moved = true; ref.current.scrollLeft = d.s - dx; };
  const up = () => { drag.current = null; };
  const fade = (side) => ({ position: 'absolute', top: 0, bottom: 8, [side]: 0, width: 28, pointerEvents: 'none', background: `linear-gradient(to ${side === 'left' ? 'right' : 'left'}, rgb(var(--cb)), transparent)` });
  return (
    <div className="relative">
      <div ref={ref} onScroll={upd} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}
        className="flex gap-2 overflow-x-auto pb-2 no-scrollbar select-none" role="region" aria-label={label} tabIndex={0} style={{ cursor: 'grab' }}>
        {children}
      </div>
      {edge.l && <div style={fade('left')} />}
      {edge.r && <div style={fade('right')} />}
    </div>
  );
}

export default function WeatherTab() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loc = useLoc();
  const fetchWeather = async () => {
    setLoading(true);
    setError(null);
    reportMeteo({ loading: true });
    try {
    const data = await base44.integrations.Core.InvokeLLM({
      prompt: `Fornece dados meteorológicos reais para ${loc.name} (${countryName(loc.country)}${loc.lat != null ? `, coordenadas ${loc.lat.toFixed(3)}, ${loc.lon.toFixed(3)}` : ''}) obtidos do serviço meteorológico oficial desse país. Data atual: ${new Date().toISOString().split('T')[0]}.

Inclui:
1. Condições atuais para ${loc.name} e as principais cidades de ${countryName(loc.country)} (temperatura, humidade, vento km/h e direção do vento em rosa dos ventos, índice UV 0-11, mín/máx)
2. Alertas meteorológicos oficiais ativos nesse país
3. Previsão detalhada para 15 dias para ${loc.name} - para cada dia: data, condição, temp mín/máx, humidade, vento km/h, direção do vento, índice UV, probabilidade precipitação
4. Tempestades vindas do mar / avisos marítimos para a costa mais próxima de ${loc.name} (lista vazia se não houver costa) - inclui altura das ondas, direção, intensidade do vento marítimo, e se há tempestade ou agitação marítima prevista`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          alerts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                city: { type: "string" },
                alert_type: { type: "string" },
                severity: { type: "string" },
                description: { type: "string" }
              }
            }
          },
          cities: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                temp: { type: "number" },
                condition: { type: "string" },
                humidity: { type: "number" },
                wind_kmh: { type: "number" },
                wind_direction: { type: "string" },
                uv_index: { type: "number" },
                min_temp: { type: "number" },
                max_temp: { type: "number" }
              }
            }
          },
          forecast_days: {
            type: "array",
            items: {
              type: "object",
              properties: {
                day: { type: "string" },
                condition: { type: "string" },
                min_temp: { type: "number" },
                max_temp: { type: "number" }
              }
            }
          },
          braga_15day_forecast: {
            type: "array",
            items: {
              type: "object",
              properties: {
                date: { type: "string" },
                day_name: { type: "string" },
                condition: { type: "string" },
                min_temp: { type: "number" },
                max_temp: { type: "number" },
                humidity: { type: "number" },
                wind_kmh: { type: "number" },
                wind_direction: { type: "string" },
                uv_index: { type: "number" },
                precipitation_prob: { type: "number" }
              }
            }
          },
          sea_storms: {
            type: "array",
            items: {
              type: "object",
              properties: {
                region: { type: "string" },
                wave_height_m: { type: "number" },
                wind_direction: { type: "string" },
                wind_intensity: { type: "string" },
                severity: { type: "string" },
                description: { type: "string" },
                is_active: { type: "boolean" }
              }
            }
          }
        }
      }
    });
    
    setWeather(data);
    reportMeteo({ lastSync: Date.now(), seaTotal: data?.sea_storms?.length || 0, seaActive: (data?.sea_storms || []).filter((x) => x.is_active).length });
    } catch (err) {
      setError(err.message || t('Erro ao carregar meteorologia'));
    }
    setLoading(false);
    reportMeteo({ loading: false });
  };

  // a cidade escolhida (Definições ou menu ≡ > CIDADE PRINCIPAL) muda a previsão de 15 dias: volta a pedir os dados
  // espera pela deteção do país; recarrega quando o país/posição mudam (viagem) ou a cidade é escolhida à mão
  useEffect(() => { if (loc.ready) fetchWeather(); }, [loc.key]); // eslint-disable-line react-hooks/exhaustive-deps
  // menu ≡ > ATUALIZAR AGORA
  const refreshRef = useRef(fetchWeather); refreshRef.current = fetchWeather;
  useEffect(() => onWeatherRefresh(() => refreshRef.current()), []);

  const getWeatherIcon = (condition) => {
    if (!condition) return Sun;
    const c = condition.toLowerCase();
    if (c.includes('chuva') || c.includes('rain')) return CloudRain;
    if (c.includes('nublado') || c.includes('cloud') || c.includes('nuvens')) return Cloud;
    return Sun;
  };

  if (!loc.ready) { // ainda a detetar o país: não mostra dados de um país errado
    return (
      <div className="flex flex-col items-center py-12">
        <Loader2 size={24} className="animate-spin" style={{ color: 'rgb(var(--c))' }} />
        <p className="mt-3 text-[10px] uppercase tracking-widest" style={{ color: 'rgb(var(--c) / 0.4)' }}>{t('A DETETAR A TUA LOCALIZAÇÃO...')}</p>
      </div>
    );
  }
  if (loading && !weather) { // 1.ª carga: ecrã de espera; depois, a página fica e mostra "a atualizar"
    return (
      <div className="flex flex-col items-center py-12">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
          <Loader2 size={24} style={{ color: 'rgb(var(--c))' }} />
        </motion.div>
        <p className="mt-3 text-[10px] uppercase tracking-widest" style={{ color: 'rgb(var(--c) / 0.4)' }}>
          {t('A RECEBER DADOS METEOROLÓGICOS...')}
        </p>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="p-4 text-center py-12">
        <p className="text-xs" style={{ color: '#ff6600' }}>{t('⚠️ Sem dados meteorológicos:')}{' '}{error || 'resposta vazia'}</p>
        <button
          onClick={fetchWeather}
          className="mt-4 px-4 py-2 rounded-sm text-xs uppercase tracking-wider"
          style={{ background: 'rgb(var(--c) / 0.13)', border: '1px solid rgb(var(--c) / 0.2)', color: 'rgb(var(--c))' }}
        >
          {t('Tentar Novamente')}
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Cloud size={16} style={{ color: '#00aaff' }} />
          <h2 className="text-sm uppercase tracking-wider font-bold" style={{ color: 'rgb(var(--c))' }}>
            {t('Meteorologia · {p}', { p: countryName(loc.country) || '…' })}
          </h2>
        </div>
        <button onClick={fetchWeather} aria-label={t('Atualizar agora')} className="flex items-center gap-1.5 p-2 rounded-sm hover:bg-white/5 text-[10px] uppercase tracking-wider" style={{ color: 'rgb(var(--c) / 0.53)' }}>
          {loading ? t('A atualizar…') : null}
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Alerts */}
      {weather?.alerts?.length > 0 && (
        <div className="mb-4">
          {weather.alerts.map((alert, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-3 mb-2 rounded-sm"
              style={{ background: '#ff000015', border: '1px solid #ff000044', borderLeft: '3px solid #ff0000' }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] px-1.5 py-0.5 rounded-sm uppercase font-bold"
                  style={{ background: '#ff000022', color: '#ff6666' }}>
                  {t('⚠️ ALERTA')}{' '}{alert.severity}
                </span>
                <span className="text-[10px]" style={{ color: '#ff666688' }}>{alert.city}</span>
              </div>
              <p className="text-xs" style={{ color: '#ff6666cc' }}>{alert.description}</p>
            </motion.div>
          ))}
        </div>
      )}

      {weather && weather.alertsSource === null && (
        <p className="text-[10px] mb-3" style={{ color: 'rgb(var(--c) / 0.5)' }}>
          {t('Avisos oficiais: ainda não há uma fonte aberta para {p}. Consulta o serviço meteorológico nacional em caso de tempo severo.', { p: countryName(loc.country) })}
        </p>
      )}
      {/* Cities grid: a cidade de referência fica em primeiro e destacada */}
      <div id="meteo-cidades" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4 rounded-sm scroll-mt-20">
        {[...(weather?.cities || [])].sort((a, b) => (b.name === loc.name) - (a.name === loc.name)).map((city, i) => {
          const WeatherIcon = getWeatherIcon(city.condition);
          const ref = city.name === loc.name;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="p-3 rounded-sm"
              style={{ background: 'rgb(var(--cd) / 0.27)', border: `1px solid rgb(var(--c) / ${ref ? 0.6 : 0.13})`, boxShadow: ref ? '0 0 10px rgb(var(--c) / 0.25)' : 'none' }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase" style={{ color: 'rgb(var(--c) / 0.8)' }}>{ref ? '📍 ' : ''}{city.name}</span>
                <WeatherIcon size={16} style={{ color: '#00aaff88' }} />
              </div>
              <div className="text-2xl font-bold mb-1" style={{ color: 'rgb(var(--c))' }}>{tempVal(city.temp)}{tempUnit()}</div>
              <p className="text-[10px] mb-2 capitalize" style={{ color: 'rgb(var(--c) / 0.53)' }}>{city.condition}</p>
              <div className="flex gap-3 flex-wrap">
                <div className="flex items-center gap-1">
                  <Droplets size={10} style={{ color: '#00aaff66' }} />
                  <span className="text-[10px]" style={{ color: 'rgb(var(--c) / 0.4)' }}>{city.humidity}%</span>
                </div>
                <div className="flex items-center gap-1">
                  <Wind size={10} style={{ color: 'rgb(var(--c) / 0.4)' }} />
                  <span className="text-[10px]" style={{ color: 'rgb(var(--c) / 0.4)' }}>{windVal(city.wind_kmh)}{' '}{windUnit()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Compass size={10} style={{ color: 'rgb(var(--c) / 0.4)' }} />
                  <span className="text-[10px]" style={{ color: 'rgb(var(--c) / 0.4)' }}>{city.wind_direction || '-'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <SunMedium size={10} style={{ color: city.uv_index >= 8 ? '#ff0000' : city.uv_index >= 6 ? '#ff6600' : city.uv_index >= 3 ? '#ffaa00' : 'rgb(var(--c))' }} />
                  <span className="text-[10px]" style={{ color: 'rgb(var(--c) / 0.4)' }}>{t('UV')}{' '}{city.uv_index ?? '-'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Thermometer size={10} style={{ color: 'rgb(var(--c) / 0.4)' }} />
                  <span className="text-[10px]" style={{ color: 'rgb(var(--c) / 0.4)' }}>{tempVal(city.min_temp)}°/{tempVal(city.max_temp)}°</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Previsão 15 dias do local do utilizador (IPMA em Portugal, Open-Meteo noutros países) — logo abaixo das cidades */}
      {weather?.braga_15day_forecast?.length > 0 && (
        <div id="meteo-15dias" className="mb-4 rounded-sm scroll-mt-20">
          <div className="flex items-center gap-2 mb-3">
            <Cloud size={14} style={{ color: 'rgb(var(--c))' }} />
            <h3 className="text-xs uppercase tracking-wider font-bold" style={{ color: 'rgb(var(--c))' }}>
              {t('Previsão 15 Dias - {c} ({s})', { c: weather?.place || loc.name, s: weather?.source || 'Open-Meteo' })}
            </h3>
          </div>
          <HScroll label={t('Previsão 15 Dias - {c} ({s})', { c: weather?.place || loc.name, s: weather?.source || 'Open-Meteo' })}>
            {weather.braga_15day_forecast.map((day, i) => {
              const DayIcon = getWeatherIcon(day.condition);
              const precipColor = day.precipitation_prob >= 70 ? '#00aaff' : day.precipitation_prob >= 40 ? '#00aaff88' : 'rgb(var(--c) / 0.4)';
              return (
                <div key={i} className="flex-shrink-0 p-3 rounded-sm min-w-[110px]"
                  style={{ background: 'rgb(var(--cd) / 0.2)', border: '1px solid rgb(var(--c) / 0.07)' }}>
                  <p className="text-[10px] uppercase mb-0.5" style={{ color: 'rgb(var(--c) / 0.53)' }}>{day.day_name}</p>
                  <p className="text-[9px] mb-2" style={{ color: 'rgb(var(--c) / 0.33)' }}>{day.date}</p>
                  <div className="flex justify-center mb-2">
                    <DayIcon size={20} style={{ color: '#00aaff88' }} />
                  </div>
                  <p className="text-[10px] mb-2 capitalize text-center" style={{ color: 'rgb(var(--c) / 0.4)' }}>{day.condition}</p>
                  <p className="text-sm font-bold text-center mb-2" style={{ color: 'rgb(var(--c) / 0.8)' }}>
                    {tempVal(day.min_temp)}° / {tempVal(day.max_temp)}°
                  </p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <Droplets size={9} style={{ color: '#00aaff66' }} />
                      <span className="text-[9px]" style={{ color: 'rgb(var(--c) / 0.4)' }}>{day.humidity}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Wind size={9} style={{ color: 'rgb(var(--c) / 0.4)' }} />
                      <span className="text-[9px]" style={{ color: 'rgb(var(--c) / 0.4)' }}>{windVal(day.wind_kmh)}{windUnit()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Compass size={9} style={{ color: 'rgb(var(--c) / 0.4)' }} />
                      <span className="text-[9px]" style={{ color: 'rgb(var(--c) / 0.4)' }}>{day.wind_direction || '-'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <SunMedium size={9} style={{ color: day.uv_index >= 8 ? '#ff0000' : day.uv_index >= 6 ? '#ff6600' : day.uv_index >= 3 ? '#ffaa00' : 'rgb(var(--c))' }} />
                      <span className="text-[9px]" style={{ color: 'rgb(var(--c) / 0.4)' }}>{t('UV')}{' '}{day.uv_index ?? '-'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CloudRain size={9} style={{ color: precipColor }} />
                      <span className="text-[9px]" style={{ color: precipColor }}>{day.precipitation_prob}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </HScroll>
        </div>
      )}

      {/* Sea storms / Maritime warnings */}
      {weather?.sea_storms?.length > 0 && (
        <div id="meteo-mar" className="mb-4 rounded-sm scroll-mt-20">
          <div className="flex items-center gap-2 mb-3">
            <Anchor size={14} style={{ color: '#00aaff' }} />
            <h3 className="text-xs uppercase tracking-wider font-bold" style={{ color: '#00aaff' }}>
              {t('Tempestades Vindas do Mar / Avisos Marítimos')}
            </h3>
          </div>
          {weather.sea_storms.map((storm, i) => {
            const sevColor = storm.severity?.toLowerCase().includes('severa') || storm.severity?.toLowerCase().includes('grave') ? '#ff0000' :
              storm.severity?.toLowerCase().includes('moderad') ? '#ff6600' : '#00aaff';
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="p-3 mb-2 rounded-sm"
                style={{ background: `${alpha(sevColor, '08')}`, border: `1px solid ${alpha(sevColor, '33')}`, borderLeft: `3px solid ${sevColor}` }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Waves size={14} style={{ color: sevColor }} />
                    <span className="text-xs font-bold uppercase" style={{ color: sevColor }}>{storm.region}</span>
                  </div>
                  {storm.is_active && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-sm uppercase font-bold animate-pulse"
                      style={{ background: `${alpha(sevColor, '22')}`, color: sevColor }}>
                      {t('● ATIVO')}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="flex items-center gap-1">
                    <Waves size={10} style={{ color: '#00aaff66' }} />
                    <span className="text-[10px]" style={{ color: 'rgb(var(--c) / 0.53)' }}>{t('Ondas:')}{' '}{storm.wave_height_m}m</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Wind size={10} style={{ color: 'rgb(var(--c) / 0.4)' }} />
                    <span className="text-[10px]" style={{ color: 'rgb(var(--c) / 0.53)' }}>{storm.wind_intensity}</span>
                  </div>
                </div>
                <p className="text-[10px] mb-1" style={{ color: 'rgb(var(--c) / 0.4)' }}>{t('Direção:')}{' '}{storm.wind_direction}</p>
                <p className="text-xs leading-relaxed" style={{ color: 'rgb(var(--c) / 0.6)' }}>{storm.description}</p>
              </motion.div>
            );
          })}
        </div>
      )}

    </div>
  );
}
