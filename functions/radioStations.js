import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Obtém a lista de emissoras de rádio FM portuguesas (streams de internet)
// a partir do diretório público radio-browser.info.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const search = (body.search || '').toString().trim();
    const limit = Math.min(Number(body.limit) || 60, 100);

    const params = new URLSearchParams({
      countrycode: 'PT',
      hidebroken: 'true',
      order: 'clickcount',
      reverse: 'true',
      limit: String(limit),
    });
    if (search) params.set('name', search);

    const response = await fetch(
      `https://de1.api.radio-browser.info/json/stations/search?${params.toString()}`,
      {
        headers: { 'User-Agent': 'AlertaFallout/1.0' },
        signal: AbortSignal.timeout(12000),
      }
    );

    if (!response.ok) {
      return Response.json({ error: 'Serviço de rádio indisponível' }, { status: 502 });
    }

    const data = await response.json();
    const stations = (Array.isArray(data) ? data : [])
      .map((s) => ({
        id: s.stationuuid,
        name: (s.name || '').trim(),
        url: s.url_resolved || s.url,
        favicon: s.favicon || '',
        tags: s.tags || '',
        bitrate: s.bitrate || 0,
        codec: s.codec || '',
        homepage: s.homepage || '',
      }))
      .filter((s) => s.url && s.name);

    return Response.json({ stations });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
