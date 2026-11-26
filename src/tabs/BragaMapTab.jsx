import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMapEvents } from 'react-leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Trash2, X, Palette, Save, Crosshair, Ruler } from 'lucide-react';
import { useQuickTools, showToolToast } from '../tools/quickTools';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { alpha } from '../theme';
import { t } from '@/i18n';

const BRAGA_CENTER = [41.5518, -8.4229];

// Camadas do mapa (ferramenta "Alternar camadas" do menu ≡)
const LAYERS = [
  { id: 'rotas', label: 'Rotas', url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' },
  { id: 'terreno', label: 'Terreno', url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', attribution: '&copy; OpenStreetMap contributors, SRTM | &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)' },
  { id: 'vigilancia', label: 'Vigilância', url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', attribution: '&copy; OpenStreetMap contributors &copy; <a href="https://carto.com/attributions">CARTO</a>' },
];
const fmtDist = (m) => (m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`);

const PIN_COLORS = [
  { name: 'Verde', value: 'rgb(var(--c))' },
  { name: 'Vermelho', value: '#ff0000' },
  { name: 'Laranja', value: '#ff6600' },
  { name: 'Amarelo', value: '#ffaa00' },
  { name: 'Azul', value: '#00aaff' },
  { name: 'Roxo', value: '#aa66ff' },
  { name: 'Rosa', value: '#ff66aa' },
  { name: 'Branco', value: '#ffffff' },
];

function createColorIcon(color) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid rgb(var(--cd));box-shadow:0 0 8px ${alpha(color, 'aa')};"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
}

export default function BragaMapTab() {
  const [pins, setPins] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [newPin, setNewPin] = useState(null);
  const [pinName, setPinName] = useState('');
  const [pinDesc, setPinDesc] = useState('');
  const [pinColor, setPinColor] = useState(PIN_COLORS[0].value);
  const mapRef = useRef(null);
  const listRef = useRef(null);
  const [layer, setLayer] = useState(() => { try { return LAYERS.find((l) => l.id === localStorage.getItem('map_layer')) || LAYERS[0]; } catch { return LAYERS[0]; } });
  const [measuring, setMeasuring] = useState(false);
  const [measurePts, setMeasurePts] = useState([]);
  const [myPos, setMyPos] = useState(null);
  const measureTotal = measurePts.reduce((sum, p, i) => (i && mapRef.current ? sum + mapRef.current.distance(measurePts[i - 1], p) : sum), 0);

  // Ferramentas do menu ≡ (src/tools/toolMenus.js → mapa)
  useQuickTools('mapa', {
    centrar: () => {
      if (!navigator.geolocation) { showToolToast(t('Este dispositivo não dá a localização.')); return; }
      showToolToast(t('A localizar…'));
      navigator.geolocation.getCurrentPosition(
        (pos) => { const ll = [pos.coords.latitude, pos.coords.longitude]; setMyPos(ll); mapRef.current?.flyTo(ll, 15); showToolToast(t('Mapa centrado na tua posição.')); },
        (err) => showToolToast(err.code === 1 ? t('A localização está bloqueada para esta app.') : t('Não foi possível obter a localização.')),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
      );
    },
    marcadores: () => {
      if (!pins.length) { showToolToast(t('Sem marcadores. Toca no mapa para criar uma zona segura.')); return; }
      // enquadra todos os marcadores e mostra a lista
      if (mapRef.current) mapRef.current.fitBounds(L.latLngBounds(pins.map((p) => [p.lat, p.lng])).pad(0.2), { maxZoom: 16 });
      setTimeout(() => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 350);
    },
    camadas: () => {
      const next = LAYERS[(LAYERS.findIndex((l) => l.id === layer.id) + 1) % LAYERS.length];
      setLayer(next);
      try { localStorage.setItem('map_layer', next.id); } catch { /* sem armazenamento */ }
      showToolToast(t('Camada: {x}', { x: t(next.label) }));
    },
    medir: () => {
      const on = !measuring;
      setMeasuring(on); setMeasurePts([]); setShowForm(false);
      showToolToast(on ? t('Medir: toca no mapa para marcar os pontos.') : t('Medição terminada.'));
    },
  });

  useEffect(() => {
    const saved = localStorage.getItem('braga_custom_pins');
    if (saved) {
      try {
        setPins(JSON.parse(saved));
      } catch {
        setPins([]);
      }
    }
  }, []);

  const savePins = (updatedPins) => {
    setPins(updatedPins);
    localStorage.setItem('braga_custom_pins', JSON.stringify(updatedPins));
  };

  const handleMapClick = (latlng) => {
    if (measuring) { setMeasurePts((prev) => [...prev, [latlng.lat, latlng.lng]]); return; } // modo "Medir distância"
    setNewPin({ lat: latlng.lat, lng: latlng.lng });
    setPinName('');
    setPinDesc('');
    setPinColor(PIN_COLORS[0].value);
    setShowForm(true);
  };

  const handleAddPin = () => {
    if (!pinName.trim() || !newPin) return;
    const pin = {
      id: Date.now(),
      name: pinName.trim(),
      desc: pinDesc.trim(),
      color: pinColor,
      lat: newPin.lat,
      lng: newPin.lng,
    };
    savePins([...pins, pin]);
    setShowForm(false);
    setNewPin(null);
  };

  const handleDeletePin = (id) => {
    savePins(pins.filter((p) => p.id !== id));
  };

  const handleClearAll = () => {
    if (pins.length === 0) return;
    if (window.confirm(t('Apagar todos os pinos?'))) {
      savePins([]);
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MapPin size={16} style={{ color: 'rgb(var(--c))' }} />
          <h2 className="text-sm uppercase tracking-wider font-bold" style={{ color: 'rgb(var(--c))' }}>
            {t('Mapa Personalizado de Braga')}
          </h2>
        </div>
        <span className="text-[10px]" style={{ color: 'rgb(var(--c) / 0.4)' }}>
          {pins.length}{' '}{t('pino')}{pins.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="p-3 rounded-sm mb-3" style={{ background: 'rgb(var(--c) / 0.06)', border: '1px solid rgb(var(--c) / 0.2)' }}>
        <p className="text-[10px] leading-relaxed" style={{ color: 'rgb(var(--c) / 0.6)' }}>
          {t('📍 Clique no mapa para adicionar um pino. Defina nome, descrição e cor. Os pinos ficam guardados no dispositivo (offline).')}
        </p>
      </div>

      {/* Medir distância (ferramenta do menu ≡) */}
      {measuring && (
        <div className="flex items-center gap-2 p-2.5 rounded-sm mb-3 text-xs" role="status" style={{ background: 'rgb(var(--c) / 0.08)', border: '1px solid rgb(var(--c) / 0.35)', color: 'rgb(var(--c))' }}>
          <Ruler size={14} className="shrink-0" />
          <span className="flex-1 min-w-0">
            {measurePts.length < 2 ? t('Toca no mapa para marcar pelo menos dois pontos.') : t('Distância total: {d} ({n} pontos)', { d: fmtDist(measureTotal), n: measurePts.length })}
          </span>
          {measurePts.length > 0 && <button type="button" onClick={() => setMeasurePts((p) => p.slice(0, -1))} className="text-[10px] uppercase tracking-wider underline">{t('Desfazer')}</button>}
          <button type="button" onClick={() => { setMeasuring(false); setMeasurePts([]); }} aria-label={t('Terminar medição')} className="p-1"><X size={14} /></button>
        </div>
      )}

      {/* Add pin form */}
      <AnimatePresence>
        {showForm && newPin && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-3"
          >
            <div className="p-4 rounded-sm" style={{ background: 'rgb(var(--cd) / 0.33)', border: '1px solid rgb(var(--c) / 0.27)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Crosshair size={14} style={{ color: 'rgb(var(--c))' }} />
                  <span className="text-xs uppercase tracking-wider font-bold" style={{ color: 'rgb(var(--c))' }}>
                    {t('Novo Pino')}
                  </span>
                </div>
                <button onClick={() => setShowForm(false)} className="p-1 hover:bg-white/5 rounded-sm">
                  <X size={14} style={{ color: 'rgb(var(--c) / 0.4)' }} />
                </button>
              </div>

              <div className="mb-2">
                <span className="text-[10px]" style={{ color: 'rgb(var(--c) / 0.4)' }}>
                  {t('Coords:')}{' '}{newPin.lat.toFixed(4)}, {newPin.lng.toFixed(4)}
                </span>
              </div>

              <input
                type="text"
                value={pinName}
                onChange={(e) => setPinName(e.target.value)}
                placeholder={t('Nome do local...')}
                className="w-full p-2 mb-2 rounded-sm text-xs outline-none"
                style={{ background: '#0a0a0a', border: '1px solid rgb(var(--c) / 0.2)', color: 'rgb(var(--c))' }}
                autoFocus
              />

              <textarea
                value={pinDesc}
                onChange={(e) => setPinDesc(e.target.value)}
                placeholder={t('Descrição (opcional)...')}
                rows={2}
                className="w-full p-2 mb-3 rounded-sm text-xs outline-none resize-none"
                style={{ background: '#0a0a0a', border: '1px solid rgb(var(--c) / 0.2)', color: 'rgb(var(--c))' }}
              />

              <div className="mb-3">
                <div className="flex items-center gap-1 mb-2">
                  <Palette size={12} style={{ color: 'rgb(var(--c) / 0.53)' }} />
                  <span className="text-[10px] uppercase tracking-wider" style={{ color: 'rgb(var(--c) / 0.53)' }}>
                    {t('Cor do Pino')}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {PIN_COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setPinColor(c.value)}
                      className="w-7 h-7 rounded-full transition-all"
                      style={{
                        background: c.value,
                        border: pinColor === c.value ? '2px solid rgb(var(--c))' : '2px solid rgb(var(--cd))',
                        boxShadow: pinColor === c.value ? `0 0 8px ${c.value}` : 'none',
                      }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={handleAddPin}
                disabled={!pinName.trim()}
                className="w-full flex items-center justify-center gap-2 p-2 rounded-sm text-xs uppercase tracking-wider font-bold transition-all"
                style={{
                  background: pinName.trim() ? 'rgb(var(--c) / 0.13)' : 'rgb(var(--cd) / 0.2)',
                  border: `1px solid ${pinName.trim() ? 'rgb(var(--c) / 0.27)' : 'rgb(var(--c) / 0.07)'}`,
                  color: pinName.trim() ? 'rgb(var(--c))' : 'rgb(var(--c) / 0.27)',
                }}
              >
                <Save size={12} />
                {t('Guardar Pino')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map */}
      <div className="rounded-sm overflow-hidden relative" style={{ border: '1px solid rgb(var(--c) / 0.2)', height: '450px' }}>
        <MapContainer
          ref={mapRef}
          center={BRAGA_CENTER}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer key={layer.id} url={layer.url} attribution={layer.attribution} />
          <MapClickHandler onMapClick={handleMapClick} />
          {myPos && <CircleMarker center={myPos} radius={7} pathOptions={{ color: '#00aaff', fillColor: '#00aaff', fillOpacity: 0.6 }} />}
          {measurePts.length > 0 && <Polyline positions={measurePts} pathOptions={{ color: '#ffaa00', weight: 3, dashArray: '6 6' }} />}
          {measurePts.map((p, i) => <CircleMarker key={`m${i}`} center={p} radius={4} pathOptions={{ color: '#ffaa00', fillColor: '#ffaa00', fillOpacity: 1 }} />)}
          {pins.map((pin) => (
            <Marker
              key={pin.id}
              position={[pin.lat, pin.lng]}
              icon={createColorIcon(pin.color)}
            >
              <Popup>
                <div style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                  <strong>{pin.name}</strong>
                  <br />
                  {pin.desc && <span style={{ color: '#999' }}>{pin.desc}<br /></span>}
                  <span style={{ color: pin.color, fontSize: '10px' }}>
                    ● {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}
                  </span>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Pin list */}
      {pins.length > 0 && (
        <div className="mt-3" ref={listRef} style={{ scrollMarginTop: 90 }}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs uppercase tracking-wider font-bold" style={{ color: 'rgb(var(--c) / 0.53)' }}>
              {t('Pinos Guardados')}
            </h3>
            <button
              onClick={handleClearAll}
              className="text-[10px] uppercase tracking-wider hover:underline"
              style={{ color: '#ff666688' }}
            >
              {t('Limpar Tudo')}
            </button>
          </div>
          {pins.map((pin) => (
            <motion.div
              key={pin.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 p-2 mb-1 rounded-sm"
              style={{ background: 'rgb(var(--cd) / 0.2)', border: '1px solid rgb(var(--c) / 0.07)' }}
            >
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: pin.color, boxShadow: `0 0 4px ${alpha(pin.color, '88')}` }} />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold block truncate" style={{ color: 'rgb(var(--c) / 0.8)' }}>{pin.name}</span>
                {pin.desc && <span className="text-[10px] block truncate" style={{ color: 'rgb(var(--c) / 0.4)' }}>{pin.desc}</span>}
              </div>
              <button
                onClick={() => handleDeletePin(pin.id)}
                className="p-1 hover:bg-white/5 rounded-sm flex-shrink-0"
              >
                <Trash2 size={12} style={{ color: '#ff666688' }} />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {pins.length === 0 && !showForm && (
        <div className="mt-3 p-4 text-center rounded-sm" style={{ background: 'rgb(var(--cd) / 0.2)', border: '1px dashed rgb(var(--c) / 0.13)' }}>
          <MapPin size={20} style={{ color: 'rgb(var(--c) / 0.27)' }} className="mx-auto mb-2" />
          <p className="text-[10px]" style={{ color: 'rgb(var(--c) / 0.33)' }}>
            {t('Sem pinos. Clique no mapa para começar.')}
          </p>
        </div>
      )}
    </div>
  );
}
