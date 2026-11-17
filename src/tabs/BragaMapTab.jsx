import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Trash2, X, Palette, Save, Crosshair } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { alpha } from '../theme';

const BRAGA_CENTER = [41.5518, -8.4229];

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
    if (window.confirm('Apagar todos os pinos?')) {
      savePins([]);
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MapPin size={16} style={{ color: 'rgb(var(--c))' }} />
          <h2 className="text-sm uppercase tracking-wider font-bold" style={{ color: 'rgb(var(--c))' }}>
            Mapa Personalizado de Braga
          </h2>
        </div>
        <span className="text-[10px]" style={{ color: 'rgb(var(--c) / 0.4)' }}>
          {pins.length} pino{pins.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="p-3 rounded-sm mb-3" style={{ background: 'rgb(var(--c) / 0.06)', border: '1px solid rgb(var(--c) / 0.2)' }}>
        <p className="text-[10px] leading-relaxed" style={{ color: 'rgb(var(--c) / 0.6)' }}>
          📍 Clique no mapa para adicionar um pino. Defina nome, descrição e cor. Os pinos ficam guardados no dispositivo (offline).
        </p>
      </div>

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
                    Novo Pino
                  </span>
                </div>
                <button onClick={() => setShowForm(false)} className="p-1 hover:bg-white/5 rounded-sm">
                  <X size={14} style={{ color: 'rgb(var(--c) / 0.4)' }} />
                </button>
              </div>

              <div className="mb-2">
                <span className="text-[10px]" style={{ color: 'rgb(var(--c) / 0.4)' }}>
                  Coords: {newPin.lat.toFixed(4)}, {newPin.lng.toFixed(4)}
                </span>
              </div>

              <input
                type="text"
                value={pinName}
                onChange={(e) => setPinName(e.target.value)}
                placeholder="Nome do local..."
                className="w-full p-2 mb-2 rounded-sm text-xs outline-none"
                style={{ background: '#0a0a0a', border: '1px solid rgb(var(--c) / 0.2)', color: 'rgb(var(--c))' }}
                autoFocus
              />

              <textarea
                value={pinDesc}
                onChange={(e) => setPinDesc(e.target.value)}
                placeholder="Descrição (opcional)..."
                rows={2}
                className="w-full p-2 mb-3 rounded-sm text-xs outline-none resize-none"
                style={{ background: '#0a0a0a', border: '1px solid rgb(var(--c) / 0.2)', color: 'rgb(var(--c))' }}
              />

              <div className="mb-3">
                <div className="flex items-center gap-1 mb-2">
                  <Palette size={12} style={{ color: 'rgb(var(--c) / 0.53)' }} />
                  <span className="text-[10px] uppercase tracking-wider" style={{ color: 'rgb(var(--c) / 0.53)' }}>
                    Cor do Pino
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
                Guardar Pino
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map */}
      <div className="rounded-sm overflow-hidden relative" style={{ border: '1px solid rgb(var(--c) / 0.2)', height: '450px' }}>
        <MapContainer
          center={BRAGA_CENTER}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap'
          />
          <MapClickHandler onMapClick={handleMapClick} />
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
        <div className="mt-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs uppercase tracking-wider font-bold" style={{ color: 'rgb(var(--c) / 0.53)' }}>
              Pinos Guardados
            </h3>
            <button
              onClick={handleClearAll}
              className="text-[10px] uppercase tracking-wider hover:underline"
              style={{ color: '#ff666688' }}
            >
              Limpar Tudo
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
            Sem pinos. Clique no mapa para começar.
          </p>
        </div>
      )}
    </div>
  );
}
