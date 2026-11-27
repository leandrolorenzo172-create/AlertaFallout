import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, Polyline, CircleMarker, Circle } from 'react-leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Trash2, X, Palette, Save, Crosshair, Ruler, Undo2, Footprints, Layers } from 'lucide-react';
import { useMapTools, setMode, openRoute, openOfflinePanel, onMapAction, LAYER_LABEL } from '@/map/mapTools';
import { useNetwork } from '@/lib/ai/net';
import ROTA_HTML from '@/map/rota-offline.html?raw';
import { walkRoute } from '@/map/walkRoute';
import OfflineTileLayer from '@/map/offline/OfflineTileLayer';
import OfflineMapsPanel from '@/map/offline/OfflineMapsPanel';
import { routeOffline } from '@/map/offline/offlineRouting';
import { hasOfflineData } from '@/map/offline/offlineMapManager';
import RouteBar from '@/map/RouteBar';
import { reverseName, nameUnnamed } from '@/map/geocode';
import { useBackClose } from '@/lib/useBackClose';
import { elevationProfile, naismithMinutes, getElevation } from '@/map/offline/elevation';
import { useTracker, clearTrail } from '@/map/offline/tracker';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { alpha } from '../theme';
import { t } from '@/i18n';

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

// Camadas do mapa (ferramenta ALTERNAR CAMADAS). Os mosaicos vêm da rede; sem rede, aparecem os que o browser já guardou.
const TILES = {
  road: { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', max: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' },
  terrain: { url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', max: 17, attribution: '&copy; OpenStreetMap, SRTM | <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)' },
  sat: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', max: 19, attribution: 'Imagens &copy; Esri, Maxar, Earthstar Geographics' },
};

// Cliques no mapa: só fazem alguma coisa no modo ativo (pinos ou medição), para não haver conflitos
// Dá ao separador acesso ao mapa (área visível para "Guardar esta área", voar para zonas, seguir o GPS)
function MapBridge({ mapRef }) { const map = useMap(); useEffect(() => { mapRef.current = map; }, [map, mapRef]); return null; }
// Marcador da posição atual: ponto verde com seta da direção (bússola / movimento)
const headingIcon = (deg) => L.divIcon({
  className: 'sd-gps',
  html: `<div style="position:relative;width:26px;height:26px">${deg != null ? `<div style="position:absolute;left:8px;top:-6px;width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:12px solid #22c55e;transform-origin:5px 19px;transform:rotate(${deg}deg);filter:drop-shadow(0 0 3px #22c55e)"></div>` : ''}<div style="position:absolute;left:6px;top:6px;width:14px;height:14px;border-radius:50%;background:#22c55e;border:2px solid #0d0b08;box-shadow:0 0 8px #22c55e"></div></div>`,
  iconSize: [26, 26], iconAnchor: [13, 13],
});

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
}

// CENTRAR POSIÇÃO: geolocalização do dispositivo -> centra o mapa e mostra a posição atual
function LocateControl({ onPos, onMsg }) {
  const map = useMap();
  useEffect(() => onMapAction((id) => {
    if (id !== 'center') return;
    if (!('geolocation' in navigator)) { onMsg(t('Este dispositivo não tem geolocalização.'), true); return; }
    onMsg(t('A obter a tua posição…'));
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const pos = { lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy };
        onPos(pos);
        map.flyTo([pos.lat, pos.lng], Math.max(map.getZoom(), 16), { duration: 0.8 });
        onMsg(t('📍 Posição atual (precisão ±{m} m).', { m: Math.round(pos.acc) }));
      },
      (err) => onMsg(err.code === 1 ? t('A localização está bloqueada para esta app. Ativa-a nas definições do telemóvel.')
        : err.code === 3 ? t('O GPS demorou demasiado. Tenta ao ar livre ou com melhor sinal.')
          : t('Não foi possível obter a posição (sem sinal GPS ou sem rede).'), true),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  }), [map, onPos, onMsg]);
  return null;
}

const fmtDist = (m) => (m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`);

// Painel por cima do mapa (HUD) no estilo do tema
const hud = { background: 'rgb(var(--cd) / 0.94)', border: '1px solid rgb(var(--c) / 0.45)', color: 'rgb(var(--c))', boxShadow: '0 0 12px rgb(var(--c) / 0.25)', backdropFilter: 'blur(6px)' };
const hudBtn = { background: 'rgb(var(--cb) / 0.7)', border: '1px solid rgb(var(--c) / 0.35)', color: 'rgb(var(--c))' };

export default function BragaMapTab() {
  const [pins, setPins] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [newPin, setNewPin] = useState(null);
  const [pinName, setPinName] = useState('');
  const [pinDesc, setPinDesc] = useState('');
  const [pinColor, setPinColor] = useState(PIN_COLORS[0].value);
  const tools = useMapTools();
  const net = useNetwork();
  const [measure, setMeasure] = useState([]); // pontos da medição
  // ROTA no mapa online: pontos A e B e o caminho a pé pelas ruas (OSRM / OpenStreetMap)
  // ends = [origem, destino] (cada um { lat, lng, label?, kind? } ou null) — partilhado pela barra De/Para e pelo HUD
  const [ends, setEnds] = useState([null, null]);
  const routePts = ends.filter(Boolean);
  const [route, setRoute] = useState(null);   // { path, meters, minutes, online, streets }
  const [routing, setRouting] = useState(false);
  const [streetsOpen, setStreetsOpen] = useState(false); // lista de ruas completa ou resumida (3 linhas)
  // há mapa guardado (área ou pacote)? Com mapa guardado a rota faz-se sempre no mapa real; o esquemático é só para quem não guardou nada
  const [hasOffline, setHasOffline] = useState(false);
  useEffect(() => { if (!tools.offlinePanel) hasOfflineData().then(setHasOffline); }, [tools.offlinePanel]);
  // 1.º malha offline guardada (A*); 2.º serviço online (OSRM a pé); 3.º linha reta. Depois: perfil de altitude e Naismith.
  const calcRoute = React.useCallback(async (pts) => {
    if (pts.length < 2) { setRoute(null); return; }
    setRouting(true);
    let r; const off = await routeOffline(pts[0], pts[1]).catch(() => ({ error: 'erro' }));
    if (off.path) r = { path: off.path, meters: off.meters, source: 'offline', online: true };
    else { const w = await walkRoute(pts[0], pts[1]); r = { ...w, source: w.online ? 'osrm' : 'straight', offErr: off.error }; }
    const profile = await elevationProfile(r.path, { online: navigator.onLine !== false }).catch(() => null);
    const full = { ...r, profile, minutes: naismithMinutes(r.meters, profile) };
    setRouting(false); setRoute(full);
    // troços sem nome (passeios/caminhos): pergunta a rua mais próxima e atualiza o percurso
    if (navigator.onLine !== false && r.streets?.some((x) => !x.name && x.at)) {
      setRoute({ ...full, naming: true });
      const named = await nameUnnamed(r.streets).catch(() => r.streets);
      setRoute((cur) => (cur && cur.path === r.path ? { ...cur, streets: named, naming: false } : cur));
    }
  }, []);
  // Define origem/destino (vindo do mapa, de um pino, da barra De/Para ou dos botões) e recalcula a rota pelas ruas
  const applyEnds = React.useCallback((next) => {
    setEnds(next);
    if (next[0] || next[1]) setMode('route'); // a barra também ativa o modo rota
    if (next[0] && next[1]) calcRoute(next); else setRoute(null);
  }, [calcRoute]);
  const addRoutePoint = (p) => applyEnds(!ends[0] ? [p, ends[1]] : !ends[1] ? [ends[0], p] : [p, null]); // 1.º = A, 2.º = B, 3.º recomeça
  // nome da rua de cada ponto sem nome (Nominatim; sem rede usa o pino mais próximo ou as coordenadas)
  const [namePending, setNamePending] = useState([false, false]);
  useEffect(() => {
    ends.forEach((p, i) => {
      if (!p || p.label) return;
      setNamePending((x) => { const n = [...x]; n[i] = true; return n; });
      const near = pins.find((pin) => L.latLng(pin.lat, pin.lng).distanceTo(L.latLng(p.lat, p.lng)) <= 60);
      (near ? Promise.resolve(near.name) : reverseName(p.lat, p.lng)).then((name) => {
        setNamePending((x) => { const n = [...x]; n[i] = false; return n; });
        if (!name) return;
        setEnds((cur) => (cur[i] && cur[i].lat === p.lat && cur[i].lng === p.lng ? Object.assign([...cur], { [i]: { ...cur[i], label: name } }) : cur));
      });
    });
  }, [ends]); // eslint-disable-line react-hooks/exhaustive-deps

  // altitude no ponto atual (GPS; se o GPS não der altitude, usa o relevo guardado)
  const tracker = useTracker();
  const [demAlt, setDemAlt] = useState(null);
  useEffect(() => { if (tracker.pos && tracker.pos.alt == null) getElevation(tracker.pos.lat, tracker.pos.lng, { online: navigator.onLine !== false }).then(setDemAlt).catch(() => {}); }, [tracker.pos?.lat, tracker.pos?.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  const curAlt = tracker.pos?.alt != null ? Math.round(tracker.pos.alt) : demAlt != null ? Math.round(demAlt) : null;
  const mapRef = React.useRef(null);
  const followed = React.useRef(false);
  useEffect(() => {
    if (!tracker.tracking) { followed.current = false; return; }
    if (tracker.pos && mapRef.current && !followed.current) { followed.current = true; mapRef.current.flyTo([tracker.pos.lat, tracker.pos.lng], Math.max(mapRef.current.getZoom(), 16)); }
  }, [tracker.tracking, tracker.pos]);
  const viewBbox = () => { const b = mapRef.current?.getBounds(); return b ? { s: b.getSouth(), w: b.getWest(), n: b.getNorth(), e: b.getEast() } : { s: 41.52, w: -8.47, n: 41.58, e: -8.37 }; };
  const flyTo = (b) => mapRef.current?.flyToBounds([[b.s, b.w], [b.n, b.e]], { duration: 0.8 });
  const [userPos, setUserPos] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = React.useRef(null);
  const onMsg = React.useCallback((text, err = false) => { setToast({ text, err }); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(null), err ? 7000 : 4000); }, []);
  // "A sua localização": GPS de alta precisão (até 10 s); senão a última posição conhecida
  const gpsPoint = React.useCallback(() => new Promise((resolve) => {
    const fallback = () => { const q = tracker.pos || userPos; if (q) resolve({ lat: q.lat, lng: q.lng, label: t('A sua localização'), kind: 'gps' }); else { onMsg(t('Sem sinal GPS: ativa a localização ou toca no mapa.'), true); resolve(null); } };
    if (!navigator.geolocation) { fallback(); return; }
    navigator.geolocation.getCurrentPosition((g) => resolve({ lat: g.coords.latitude, lng: g.coords.longitude, label: t('A sua localização'), kind: 'gps' }), fallback, { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 });
  }), [tracker.pos, userPos, onMsg]); // eslint-disable-line react-hooks/exhaustive-deps

  // trocar de modo limpa o modo anterior (formulário de pino ou pontos de medição)
  useEffect(() => {
    if (tools.mode !== 'pin') { setShowForm(false); setNewPin(null); }
    if (tools.mode !== 'measure') setMeasure([]);
    if (tools.mode !== 'route') { setEnds([null, null]); setRoute(null); }
  }, [tools.mode]);
  // botão voltar (Android/browser) fecha estes painéis sem sair do separador MAPA
  useBackClose(tools.offlinePanel, () => openOfflinePanel(false), 'offline-maps');
  useBackClose(tools.route, () => openRoute(false), 'route-schematic');
  // sair do separador desliga os modos
  useEffect(() => () => { setMode(null); openRoute(false); openOfflinePanel(false); }, []);
  const measured = measure.reduce((sum, p, i) => (i ? sum + L.latLng(measure[i - 1]).distanceTo(L.latLng(p)) : 0), 0);

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
    if (tools.mode === 'measure') { setMeasure((m) => [...m, { lat: latlng.lat, lng: latlng.lng }]); return; }
    if (tools.mode === 'route') { addRoutePoint({ lat: latlng.lat, lng: latlng.lng }); return; } // 1.º toque = A, 2.º = B, 3.º recomeça
    if (tools.mode !== 'pin') return; // sem modo ativo, tocar no mapa só serve para navegar
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
          {t('📍 Usa o botão ≡ para as ferramentas: centrar a tua posição, colocar pinos (nome, descrição e cor, guardados no dispositivo), mudar a camada, medir distâncias e calcular a rota a pé entre dois pontos no mapa.')}
        </p>
      </div>

      {/* Rota estilo Google Maps: De / Para (ligada à rota a pé pelas ruas) */}
      <RouteBar ends={ends} pending={namePending} pins={pins} getView={viewBbox} onGps={gpsPoint}
        onSet={(i, p) => applyEnds(Object.assign([...ends], { [i]: p }))}
        onSwap={() => applyEnds([ends[1], ends[0]])} />

      {/* Mapa: stacking context próprio (isolation) para as camadas do Leaflet não passarem por cima do menu ≡ */}
      <div className="rounded-sm overflow-hidden relative" style={{ border: '1px solid rgb(var(--c) / 0.2)', height: 'min(68vh, 640px)', minHeight: 420, isolation: 'isolate' }}>
        <MapContainer
          center={BRAGA_CENTER}
          zoom={13}
          style={{ height: '100%', width: '100%', cursor: tools.mode ? 'crosshair' : undefined }}
          zoomControl={false}
        >
          {tools.layer === 'sat'
            ? <TileLayer key="sat" url={TILES.sat.url} maxZoom={TILES.sat.max} attribution={TILES.sat.attribution} />
            : <OfflineTileLayer key={tools.layer} offlineLayer={tools.layer} url={tools.layer === 'road' ? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png' : TILES.terrain.url} maxZoom={TILES[tools.layer].max} attribution={TILES[tools.layer].attribution} />}
          <MapBridge mapRef={mapRef} />
          {/* rasto GPS e posição atual com direção e precisão */}
          {tracker.trail.length > 1 && <Polyline positions={tracker.trail.map((p) => [p[0], p[1]])} pathOptions={{ color: '#22c55e', weight: 4, opacity: 0.85 }} />}
          {tracker.pos && <Circle center={[tracker.pos.lat, tracker.pos.lng]} radius={tracker.pos.acc} pathOptions={{ color: '#22c55e', weight: 1, fillOpacity: 0.08 }} />}
          {tracker.pos && <Marker position={[tracker.pos.lat, tracker.pos.lng]} icon={headingIcon(tracker.heading)} interactive={false} />}
          <MapClickHandler onMapClick={handleMapClick} />
          <LocateControl onPos={setUserPos} onMsg={onMsg} />
          {userPos && (
            <>
              <Circle center={[userPos.lat, userPos.lng]} radius={userPos.acc} pathOptions={{ color: '#f59e0b', weight: 1, fillOpacity: 0.08 }} />
              <CircleMarker center={[userPos.lat, userPos.lng]} radius={8} pathOptions={{ color: '#0d0b08', weight: 2, fillColor: '#f59e0b', fillOpacity: 1 }}>
                <Popup><span style={{ fontFamily: 'monospace', fontSize: 11 }}>{t('Estás aqui')}</span></Popup>
              </CircleMarker>
            </>
          )}
          {route && <Polyline positions={route.path} pathOptions={{ color: '#0d0b08', weight: 8, opacity: 0.6 }} />}
          {route && <Polyline positions={route.path} pathOptions={{ color: '#f59e0b', weight: 4.5, dashArray: route.online ? undefined : '8 8' }} />}
          {ends.map((p, i) => p && (
            <CircleMarker key={`r${i}`} center={[p.lat, p.lng]} radius={8} pathOptions={{ color: '#0d0b08', weight: 2, fillColor: i === 0 ? '#22c55e' : '#ef4444', fillOpacity: 1 }}>
              <Popup><span style={{ fontFamily: 'monospace', fontSize: 11 }}>{i === 0 ? t('Ponto A') : t('Ponto B')}{p.label ? ` · ${p.label}` : ''}</span></Popup>
            </CircleMarker>
          ))}
          {measure.length > 1 && <Polyline positions={measure.map((p) => [p.lat, p.lng])} pathOptions={{ color: '#f59e0b', weight: 3, dashArray: '6 6' }} />}
          {measure.map((p, i) => <CircleMarker key={i} center={[p.lat, p.lng]} radius={5} pathOptions={{ color: '#0d0b08', weight: 2, fillColor: i === 0 ? '#22c55e' : '#f59e0b', fillOpacity: 1 }} />)}
          {pins.map((pin) => (
            <Marker
              key={pin.id}
              position={[pin.lat, pin.lng]}
              icon={createColorIcon(pin.color)}
              eventHandlers={{ click: () => { if (tools.mode === 'route') addRoutePoint({ lat: pin.lat, lng: pin.lng, label: pin.name, kind: 'pin' }); } }}
            >
              <Popup>
                <div style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                  <strong>{pin.name}</strong>
                  <br />
                  {pin.desc && <span style={{ color: '#999' }}>{pin.desc}<br /></span>}
                  <span style={{ color: pin.color, fontSize: '10px' }}>
                    ● {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}
                  </span>
                  <br />
                  <button type="button" onClick={() => handleDeletePin(pin.id)} style={{ marginTop: 4, color: '#ff6666', fontSize: 10, textTransform: 'uppercase' }}>{t('Remover')}</button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Camada atual */}
        <span className="absolute left-2 bottom-2 z-[1050] px-2 py-1 rounded-sm text-[10px] uppercase tracking-wider pointer-events-none" style={hud}>
          <Layers size={10} className="inline mr-1" />{t(LAYER_LABEL[tools.layer])}{net !== 'online' ? ` · ${t('sem rede: só mosaicos já vistos')}` : ''}
        </span>

        {/* HUD do modo ativo */}
        {tools.mode === 'pin' && !showForm && (
          <div className="absolute left-2 right-2 top-2 z-[1050] flex items-center gap-2 px-3 py-2 rounded-sm text-[11px]" style={hud}>
            <MapPin size={14} className="shrink-0" /><span className="flex-1 min-w-0">{t('MODO PINOS: toca no mapa para colocar um pino.')}</span>
            <button type="button" onClick={() => setMode(null)} className="px-2 py-1 rounded-sm text-[10px] uppercase tracking-wider" style={hudBtn}>{t('Sair')}</button>
          </div>
        )}
        {tracker.tracking && tools.mode !== 'route' && tools.mode !== 'measure' && tools.mode !== 'pin' && (
          <div className="absolute left-2 right-2 top-2 z-[1050] px-3 py-2 rounded-sm text-[11px]" style={hud}>
            <p className="font-bold tabular-nums">
              {tracker.pos ? `📍 ±${Math.round(tracker.pos.acc)} m${curAlt != null ? ` · ${t('alt.')} ${curAlt} m` : ''}${tracker.heading != null ? ` · ${tracker.heading}°` : ''}${tracker.pos.speed > 0.3 ? ` · ${(tracker.pos.speed * 3.6).toFixed(1)} km/h` : ''}` : t('A procurar sinal GPS…')}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: tracker.error ? '#ef4444' : 'rgb(var(--c) / 0.6)' }}>
              {tracker.error || t('Rasto: {d} · {n} pontos · funciona em modo avião', { d: tracker.distance >= 1000 ? `${(tracker.distance / 1000).toFixed(2)} km` : `${Math.round(tracker.distance)} m`, n: tracker.trail.length })}
            </p>
            <div className="flex gap-2 mt-1.5">
              <button type="button" disabled={!tracker.pos} onClick={() => mapRef.current?.flyTo([tracker.pos.lat, tracker.pos.lng], Math.max(mapRef.current.getZoom(), 16))} className="px-2 py-1 rounded-sm text-[10px] uppercase tracking-wider disabled:opacity-30" style={hudBtn}>{t('Centrar')}</button>
              <button type="button" disabled={!tracker.trail.length} onClick={clearTrail} className="px-2 py-1 rounded-sm text-[10px] uppercase tracking-wider disabled:opacity-30" style={hudBtn}>{t('Apagar rasto')}</button>
            </div>
          </div>
        )}
        {tools.mode === 'route' && (
          <div className="absolute left-2 right-2 top-2 z-[1050] px-3 py-2 rounded-sm text-[11px]" style={hud}>
            <div className="flex items-center gap-2">
              <Footprints size={14} className="shrink-0" />
              <span className="flex-1 min-w-0 font-bold">
                {routing ? t('A calcular a rota a pé…')
                  : route ? t('Distância a pé: {d} | Tempo estimado: {m} min', { d: `${(route.meters / 1000).toFixed(2)} km`, m: route.minutes })
                    : ends[0] && !ends[1] ? t('ROTA: toca no ponto B.') : !ends[0] && ends[1] ? t('ROTA: toca no ponto A.') : t('ROTA: toca no ponto A e depois no B.')}
              </span>
            </div>
            {route?.profile && (
              <p className="mt-1 text-[11px] font-bold tabular-nums">
                ▲ D+ {Math.round(route.profile.up)} m · ▼ D− {Math.round(route.profile.down)} m · {t('máx.')} {Math.round(route.profile.max)} m{curAlt != null ? ` · ${t('atual')} ${curAlt} m` : ''}
              </p>
            )}
            {(route?.streets?.some((x) => x.name) || route?.naming) && (
              <p className="mt-1 text-[11px] leading-snug cursor-pointer" role="button" tabIndex={0} aria-expanded={streetsOpen}
                onClick={() => setStreetsOpen((v) => !v)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setStreetsOpen((v) => !v); } }}
                style={{ color: 'rgb(var(--c) / 0.9)', ...(streetsOpen ? null : { display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }) }}>
                <span className="opacity-70">{t('Percurso:')} </span>{route.naming && <span className="opacity-60">({t('a identificar ruas…')}) </span>}
                {route.streets.map((x, i) => `${x.name || t('caminho sem nome')}${x.m >= 50 ? ` (${x.m >= 1000 ? `${(x.m / 1000).toFixed(1)} km` : `${Math.round(x.m / 10) * 10} m`})` : ''}`).join(' → ')}
              </p>
            )}
            {route && (
              <p className="mt-1 text-[10px]" style={{ color: route.source === 'straight' ? '#ef4444' : 'rgb(var(--c) / 0.55)' }}>
                {route.source === 'offline' ? t('Rota offline pelos caminhos guardados (OpenStreetMap)') : route.source === 'osrm' ? t('Rota online pelas ruas do OpenStreetMap (OSRM)') : (route.offErr === 'nograph' ? t('Esta área foi guardada sem as rotas offline: abre Mapas offline e toca em «+ Rotas» (com rede). Distância em linha reta (tracejado).') : hasOffline ? t('Sem rota pelos caminhos: estes pontos estão fora das áreas guardadas. Distância em linha reta (tracejado).') : t('Sem rota pelos caminhos (zona não guardada e sem rede): distância em linha reta (tracejado).'))}
                {' · '}{route.profile ? t('tempo pela regra de Naismith (com desnível)') : t('tempo a 5 km/h (sem dados de relevo)')}
              </p>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
              <button type="button" disabled={!routePts.length} onClick={() => applyEnds(ends[1] ? [ends[0], null] : [null, null])} className="flex items-center gap-1 px-2 py-1 rounded-sm text-[10px] uppercase tracking-wider disabled:opacity-30" style={hudBtn}><Undo2 size={11} />{t('Desfazer')}</button>
              <button type="button" disabled={!routePts.length} onClick={() => { setEnds([null, null]); setRoute(null); }} className="flex items-center gap-1 px-2 py-1 rounded-sm text-[10px] uppercase tracking-wider disabled:opacity-30" style={hudBtn}><Trash2 size={11} />{t('Limpar')}</button>
              <button type="button" disabled={!tracker.pos} onClick={() => { const p = { lat: tracker.pos.lat, lng: tracker.pos.lng, label: t('A sua localização'), kind: 'gps' }; applyEnds([p, ends[1] || (ends[0]?.kind !== 'gps' ? ends[0] : null)]); }} className="px-2 py-1 rounded-sm text-[10px] uppercase tracking-wider disabled:opacity-30" style={hudBtn}>{t('Partir do GPS')}</button>
              {!hasOffline && <button type="button" onClick={() => openRoute(true)} className="px-2 py-1 rounded-sm text-[10px] uppercase tracking-wider" style={hudBtn}>{t('Esquemático')}</button>}
              <button type="button" onClick={() => setMode(null)} className="ml-auto px-2 py-1 rounded-sm text-[10px] uppercase tracking-wider" style={hudBtn}>{t('Sair')}</button>
            </div>
          </div>
        )}
        {tools.mode === 'measure' && (
          <div className="absolute left-2 right-2 top-2 z-[1050] px-3 py-2 rounded-sm text-[11px]" style={hud}>
            <div className="flex items-center gap-2">
              <Ruler size={14} className="shrink-0" />
              <span className="flex-1 min-w-0 font-bold">{measure.length < 2 ? t('MEDIR: toca em dois ou mais pontos.') : `${t('Distância')}: ${fmtDist(measured)} · ${measure.length} ${t('pontos')}`}</span>
            </div>
            <div className="flex gap-2 mt-2">
              <button type="button" disabled={!measure.length} onClick={() => setMeasure((m) => m.slice(0, -1))} className="flex items-center gap-1 px-2 py-1 rounded-sm text-[10px] uppercase tracking-wider disabled:opacity-30" style={hudBtn}><Undo2 size={11} />{t('Desfazer')}</button>
              <button type="button" disabled={!measure.length} onClick={() => setMeasure([])} className="flex items-center gap-1 px-2 py-1 rounded-sm text-[10px] uppercase tracking-wider disabled:opacity-30" style={hudBtn}><Trash2 size={11} />{t('Limpar')}</button>
              <button type="button" onClick={() => setMode(null)} className="ml-auto px-2 py-1 rounded-sm text-[10px] uppercase tracking-wider" style={hudBtn}>{t('Sair')}</button>
            </div>
          </div>
        )}
        {toast && (
          <div role="status" className="absolute left-2 right-2 bottom-10 z-[1060] px-3 py-2 rounded-sm text-[11px]" style={{ ...hud, border: toast.err ? '1px solid #ef4444' : hud.border, color: toast.err ? '#ef4444' : hud.color }}>
            {toast.text}
          </div>
        )}

        {/* Formulário do novo pino, por cima do mapa */}
      <AnimatePresence>
        {showForm && newPin && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden absolute left-2 right-2 top-2 z-[1100] max-h-[85%] overflow-y-auto"
          >
            <div className="p-4 rounded-sm" style={hud}>
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

      </div>

      {/* Pin list */}
      {pins.length > 0 && (
        <div className="mt-3">
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

      {tools.offlinePanel && <OfflineMapsPanel getViewBbox={viewBbox} defaultLayer={tools.layer} onFly={flyTo} onClose={() => openOfflinePanel(false)} />}
      {/* ROTA: aplicação de rota a pé 100% offline (ficheiro único src/map/rota-offline.html, em iframe isolado) */}
      <AnimatePresence>
        {tools.route && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex flex-col" style={{ background: '#0d0b08' }} role="dialog" aria-label={t('Rota a pé offline')}>
            <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: '1px solid #f59e0b55', color: '#f59e0b' }}>
              <Footprints size={15} />
              <span className="flex-1 text-xs uppercase tracking-wider font-bold">{t('Rota a pé — offline')}</span>
              <button type="button" onClick={() => openRoute(false)} aria-label={t('Fechar')} className="p-1.5 rounded-sm" style={{ border: '1px solid #f59e0b55' }}><X size={15} /></button>
            </div>
            <iframe title={t('Rota a pé offline')} srcDoc={ROTA_HTML} sandbox="allow-scripts" className="flex-1 w-full border-0" />
          </motion.div>
        )}
      </AnimatePresence>

      {pins.length === 0 && !showForm && (
        <div className="mt-3 p-4 text-center rounded-sm" style={{ background: 'rgb(var(--cd) / 0.2)', border: '1px dashed rgb(var(--c) / 0.13)' }}>
          <MapPin size={20} style={{ color: 'rgb(var(--c) / 0.27)' }} className="mx-auto mb-2" />
          <p className="text-[10px]" style={{ color: 'rgb(var(--c) / 0.33)' }}>
            {t('Sem pinos. Abre o menu ≡ e escolhe Marcadores / Pins.')}
          </p>
        </div>
      )}
    </div>
  );
}
