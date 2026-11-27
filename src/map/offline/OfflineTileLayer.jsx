// Camada de mosaicos que lê primeiro do aparelho (área guardada ou pacote PMTiles) e só depois da rede.
// Assim o mapa real funciona em modo avião nas zonas guardadas.
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { getLocalTile } from './offlineMapManager';

const OfflineTiles = L.TileLayer.extend({
  createTile(coords, done) {
    const img = document.createElement('img');
    img.alt = ''; img.setAttribute('role', 'presentation');
    const online = () => {
      if (navigator.onLine === false) { done(new Error('offline'), img); return; }
      img.onload = () => done(null, img); img.onerror = (e) => done(e, img);
      img.src = this.getTileUrl(coords);
    };
    getLocalTile(this.options.offlineLayer, coords.z, coords.x, coords.y).then((blob) => {
      if (!blob) { online(); return; }
      const url = URL.createObjectURL(blob);
      img.onload = () => { URL.revokeObjectURL(url); done(null, img); };
      img.onerror = () => { URL.revokeObjectURL(url); online(); };
      img.src = url;
    }).catch(online);
    return img;
  },
});

// <OfflineTileLayer url="https://…/{z}/{x}/{y}.png" offlineLayer="road" maxZoom={19} attribution="…" />
export default function OfflineTileLayer({ url, offlineLayer, maxZoom = 19, attribution }) {
  const map = useMap();
  useEffect(() => {
    const layer = new OfflineTiles(url, { offlineLayer, maxZoom, attribution, crossOrigin: false });
    layer.addTo(map);
    return () => { map.removeLayer(layer); };
  }, [map, url, offlineLayer, maxZoom, attribution]);
  return null;
}
