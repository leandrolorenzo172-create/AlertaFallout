// Rota a pé no mapa online (aba MAPA > ROTA): caminho pelas ruas do OpenStreetMap com o serviço público OSRM (perfil a pé)
// de routing.openstreetmap.de. Sem rede (ou se o serviço falhar), devolve a distância em linha reta.
const OSRM_FOOT = 'https://routing.openstreetmap.de/routed-foot/route/v1/foot';
export const WALK_M_PER_MIN = 80; // 4,8 km/h

// Distância em linha reta (fórmula de haversine), em metros
export function straightDistance(a, b) {
  const R = 6371000; const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat); const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// -> { path: [[lat, lng], …], meters, minutes, online: true } ou, sem serviço, a linha reta com online: false
export async function walkRoute(a, b) {
  try {
    const url = `${OSRM_FOOT}/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson&steps=false`;
    const r = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    const route = j.routes && j.routes[0];
    if (j.code !== 'Ok' || !route) throw new Error(j.code || 'sem rota');
    return { path: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]), meters: route.distance, minutes: Math.max(1, Math.round(route.distance / WALK_M_PER_MIN)), online: true };
  } catch (e) {
    const meters = straightDistance(a, b);
    return { path: [[a.lat, a.lng], [b.lat, b.lng]], meters, minutes: Math.max(1, Math.round(meters / WALK_M_PER_MIN)), online: false, error: e.message };
  }
}
