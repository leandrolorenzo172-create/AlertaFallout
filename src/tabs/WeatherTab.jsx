import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Cloud, RefreshCw, Loader2, Thermometer, Wind, Droplets, Eye, Sun, CloudRain, Waves, Anchor, Compass, SunMedium } from 'lucide-react';

export default function WeatherTab() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchWeather = async () => {
    setLoading(true);
    setError(null);
    try {
    const data = await base44.integrations.Core.InvokeLLM({
      prompt: `Fornece dados meteorológicos de Portugal obtidos do IPMA (Instituto Português do Mar e da Atmosfera - ipma.pt). Data atual: ${new Date().toISOString().split('T')[0]}.

Inclui:
1. Condições atuais para Lisboa, Porto, Braga, Coimbra, Faro, Évora (temperatura, humidade, vento km/h e direção do vento em rosa dos ventos, índice UV 0-11, mín/máx)
2. Alertas meteorológicos ativos do IPMA
3. Previsão detalhada para 15 dias para BRAGA (obtida do IPMA) - para cada dia: data, condição, temp mín/máx, humidade, vento km/h, direção do vento, índice UV, probabilidade precipitação
4. Tempestades vindas do mar / avisos marítimos para a costa portuguesa (especialmente costa norte/Minho perto de Braga) - inclui altura das ondas, direção, intensidade do vento marítimo, e se há tempestade ou agitação marítima prevista`,
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
    } catch (err) {
      setError(err.message || 'Erro ao carregar meteorologia');
    }
    setLoading(false);
  };

  useEffect(() => { fetchWeather(); }, []);

  const getWeatherIcon = (condition) => {
    if (!condition) return Sun;
    const c = condition.toLowerCase();
    if (c.includes('chuva') || c.includes('rain')) return CloudRain;
    if (c.includes('nublado') || c.includes('cloud') || c.includes('nuvens')) return Cloud;
    return Sun;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center py-12">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
          <Loader2 size={24} style={{ color: '#00ff41' }} />
        </motion.div>
        <p className="mt-3 text-[10px] uppercase tracking-widest" style={{ color: '#00ff4166' }}>
          A RECEBER DADOS METEOROLÓGICOS...
        </p>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="p-4 text-center py-12">
        <p className="text-xs" style={{ color: '#ff6600' }}>⚠️ Sem dados meteorológicos: {error || 'resposta vazia'}</p>
        <button
          onClick={fetchWeather}
          className="mt-4 px-4 py-2 rounded-sm text-xs uppercase tracking-wider"
          style={{ background: '#00ff4122', border: '1px solid #00ff4133', color: '#00ff41' }}
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Cloud size={16} style={{ color: '#00aaff' }} />
          <h2 className="text-sm uppercase tracking-wider font-bold" style={{ color: '#00ff41' }}>
            Meteorologia Portugal
          </h2>
        </div>
        <button onClick={fetchWeather} className="p-2 rounded-sm hover:bg-white/5" style={{ color: '#00ff4188' }}>
          <RefreshCw size={14} />
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
                  ⚠️ ALERTA {alert.severity}
                </span>
                <span className="text-[10px]" style={{ color: '#ff666688' }}>{alert.city}</span>
              </div>
              <p className="text-xs" style={{ color: '#ff6666cc' }}>{alert.description}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Cities grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        {weather?.cities?.map((city, i) => {
          const WeatherIcon = getWeatherIcon(city.condition);
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="p-3 rounded-sm"
              style={{ background: '#001a0044', border: '1px solid #00ff4122' }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase" style={{ color: '#00ff41cc' }}>{city.name}</span>
                <WeatherIcon size={16} style={{ color: '#00aaff88' }} />
              </div>
              <div className="text-2xl font-bold mb-1" style={{ color: '#00ff41' }}>{city.temp}°C</div>
              <p className="text-[10px] mb-2 capitalize" style={{ color: '#00ff4188' }}>{city.condition}</p>
              <div className="flex gap-3 flex-wrap">
                <div className="flex items-center gap-1">
                  <Droplets size={10} style={{ color: '#00aaff66' }} />
                  <span className="text-[10px]" style={{ color: '#00ff4166' }}>{city.humidity}%</span>
                </div>
                <div className="flex items-center gap-1">
                  <Wind size={10} style={{ color: '#00ff4166' }} />
                  <span className="text-[10px]" style={{ color: '#00ff4166' }}>{city.wind_kmh} km/h</span>
                </div>
                <div className="flex items-center gap-1">
                  <Compass size={10} style={{ color: '#00ff4166' }} />
                  <span className="text-[10px]" style={{ color: '#00ff4166' }}>{city.wind_direction || '-'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <SunMedium size={10} style={{ color: city.uv_index >= 8 ? '#ff0000' : city.uv_index >= 6 ? '#ff6600' : city.uv_index >= 3 ? '#ffaa00' : '#00ff41' }} />
                  <span className="text-[10px]" style={{ color: '#00ff4166' }}>UV {city.uv_index ?? '-'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Thermometer size={10} style={{ color: '#00ff4166' }} />
                  <span className="text-[10px]" style={{ color: '#00ff4166' }}>{city.min_temp}°/{city.max_temp}°</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* 5-day forecast */}
      {weather?.forecast_days?.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs uppercase tracking-wider mb-3 font-bold" style={{ color: '#00ff4188' }}>
            Previsão Próximos Dias
          </h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {weather.forecast_days.map((day, i) => (
              <div key={i} className="flex-shrink-0 p-3 rounded-sm text-center min-w-[80px]"
                style={{ background: '#001a0033', border: '1px solid #00ff4111' }}>
                <p className="text-[10px] uppercase mb-1" style={{ color: '#00ff4188' }}>{day.day}</p>
                <p className="text-xs mb-1 capitalize" style={{ color: '#00ff4166' }}>{day.condition}</p>
                <p className="text-sm font-bold" style={{ color: '#00ff41cc' }}>
                  {day.min_temp}° / {day.max_temp}°
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sea storms / Maritime warnings */}
      {weather?.sea_storms?.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Anchor size={14} style={{ color: '#00aaff' }} />
            <h3 className="text-xs uppercase tracking-wider font-bold" style={{ color: '#00aaff' }}>
              Tempestades Vindas do Mar / Avisos Marítimos
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
                style={{ background: `${sevColor}08`, border: `1px solid ${sevColor}33`, borderLeft: `3px solid ${sevColor}` }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Waves size={14} style={{ color: sevColor }} />
                    <span className="text-xs font-bold uppercase" style={{ color: sevColor }}>{storm.region}</span>
                  </div>
                  {storm.is_active && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-sm uppercase font-bold animate-pulse"
                      style={{ background: `${sevColor}22`, color: sevColor }}>
                      ● ATIVO
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="flex items-center gap-1">
                    <Waves size={10} style={{ color: '#00aaff66' }} />
                    <span className="text-[10px]" style={{ color: '#00ff4188' }}>Ondas: {storm.wave_height_m}m</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Wind size={10} style={{ color: '#00ff4166' }} />
                    <span className="text-[10px]" style={{ color: '#00ff4188' }}>{storm.wind_intensity}</span>
                  </div>
                </div>
                <p className="text-[10px] mb-1" style={{ color: '#00ff4166' }}>Direção: {storm.wind_direction}</p>
                <p className="text-xs leading-relaxed" style={{ color: '#00ff4199' }}>{storm.description}</p>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Braga 15-day forecast from IPMA */}
      {weather?.braga_15day_forecast?.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Cloud size={14} style={{ color: '#00ff41' }} />
            <h3 className="text-xs uppercase tracking-wider font-bold" style={{ color: '#00ff41' }}>
              Previsão 15 Dias - Braga (IPMA)
            </h3>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {weather.braga_15day_forecast.map((day, i) => {
              const DayIcon = getWeatherIcon(day.condition);
              const precipColor = day.precipitation_prob >= 70 ? '#00aaff' : day.precipitation_prob >= 40 ? '#00aaff88' : '#00ff4166';
              return (
                <div key={i} className="flex-shrink-0 p-3 rounded-sm min-w-[110px]"
                  style={{ background: '#001a0033', border: '1px solid #00ff4111' }}>
                  <p className="text-[10px] uppercase mb-0.5" style={{ color: '#00ff4188' }}>{day.day_name}</p>
                  <p className="text-[9px] mb-2" style={{ color: '#00ff4155' }}>{day.date}</p>
                  <div className="flex justify-center mb-2">
                    <DayIcon size={20} style={{ color: '#00aaff88' }} />
                  </div>
                  <p className="text-[10px] mb-2 capitalize text-center" style={{ color: '#00ff4166' }}>{day.condition}</p>
                  <p className="text-sm font-bold text-center mb-2" style={{ color: '#00ff41cc' }}>
                    {day.min_temp}° / {day.max_temp}°
                  </p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <Droplets size={9} style={{ color: '#00aaff66' }} />
                      <span className="text-[9px]" style={{ color: '#00ff4166' }}>{day.humidity}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Wind size={9} style={{ color: '#00ff4166' }} />
                      <span className="text-[9px]" style={{ color: '#00ff4166' }}>{day.wind_kmh}km/h</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Compass size={9} style={{ color: '#00ff4166' }} />
                      <span className="text-[9px]" style={{ color: '#00ff4166' }}>{day.wind_direction || '-'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <SunMedium size={9} style={{ color: day.uv_index >= 8 ? '#ff0000' : day.uv_index >= 6 ? '#ff6600' : day.uv_index >= 3 ? '#ffaa00' : '#00ff41' }} />
                      <span className="text-[9px]" style={{ color: '#00ff4166' }}>UV {day.uv_index ?? '-'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CloudRain size={9} style={{ color: precipColor }} />
                      <span className="text-[9px]" style={{ color: precipColor }}>{day.precipitation_prob}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
