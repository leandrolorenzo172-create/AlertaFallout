// "A tocar agora": artista e música da emissora sintonizada, só quando a emissora dá essa informação.
// Sem proxy nem servidor próprio (o GitHub Pages só aloja ficheiros), por isso só se usam fontes
// que o browser pode ler diretamente (com CORS):
//  (a) streams HLS: etiquetas ID3 (TIT2/TPE1) que chegam nos segmentos, via hls.js;
//  (b) servidores Icecast: /status-json.xsl, testado uma vez por servidor;
//  (c) StreamTheWorld/Triton (RFM, Mega Hits, Renascença, Observador...): np.tritondigital.com.
// Atualiza de 20 em 20 segundos, só enquanto a emissora está a tocar.

const POLL_MS = 20000;
const icecastOk = new Map(); // origem -> true (tem CORS e JSON) | false (não serve)

function clean(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

// (c) Triton: o "mount" vem do endereço do StreamTheWorld (RFM.mp3, MEGA_HITSAAC.aac, ...)
function tritonMount(url) {
  const m = /streamtheworld\.com/i.test(url) && url.match(/\/([A-Z0-9_]+?)(?:AAC)?(?:_SC)?\.(?:mp3|aac)(?:\?|$)/i);
  return m ? m[1].toUpperCase() : null;
}
async function fromTriton(mount, signal) {
  const res = await fetch(`https://np.tritondigital.com/public/nowplaying?mountName=${encodeURIComponent(mount)}&numberToFetch=1&eventType=track`, { signal, cache: 'no-store' });
  if (!res.ok) return null;
  const xml = new DOMParser().parseFromString(await res.text(), 'text/xml');
  const prop = (n) => clean(xml.querySelector(`property[name="${n}"]`)?.textContent);
  const title = prop('cue_title'); const artist = prop('track_artist_name');
  return title || artist ? { title, artist } : null;
}

// (b) Icecast: só se o servidor responder com CORS; à primeira falha deixa de se tentar nesse servidor
async function fromIcecast(url, signal) {
  let u;
  try { u = new URL(url); } catch { return null; }
  if (icecastOk.get(u.origin) === false) return null;
  try {
    const res = await fetch(`${u.origin}/status-json.xsl`, { signal, cache: 'no-store' });
    const type = res.headers.get('content-type') || '';
    if (!res.ok || !/json/i.test(type)) throw new Error('não é Icecast');
    const data = await res.json();
    icecastOk.set(u.origin, true);
    let src = data?.icestats?.source;
    src = Array.isArray(src) ? src : src ? [src] : [];
    const path = u.pathname.replace(/\/+$/, '');
    const match = src.find((s) => { try { return new URL(s.listenurl).pathname.replace(/\/+$/, '') === path; } catch { return false; } }) || (src.length === 1 ? src[0] : null);
    if (!match) return null;
    const title = clean(match.title); const artist = clean(match.artist);
    return title || artist ? { title, artist } : null;
  } catch (e) {
    if (e.name !== 'AbortError') icecastOk.set(u.origin, false); // sem CORS ou sem Icecast: não insistir
    return null;
  }
}

// (a) ID3 nos segmentos HLS: lê as molduras de texto TIT2 (título) e TPE1 (artista)
function readId3(bytes) {
  const out = {};
  let i = 0;
  const syncsafe = (o) => ((bytes[o] & 0x7f) << 21) | ((bytes[o + 1] & 0x7f) << 14) | ((bytes[o + 2] & 0x7f) << 7) | (bytes[o + 3] & 0x7f);
  while (i + 10 <= bytes.length) {
    if (bytes[i] !== 0x49 || bytes[i + 1] !== 0x44 || bytes[i + 2] !== 0x33) break; // "ID3"
    const end = i + 10 + syncsafe(i + 6);
    let p = i + 10;
    while (p + 10 <= end && p + 10 <= bytes.length) {
      const id = String.fromCharCode(bytes[p], bytes[p + 1], bytes[p + 2], bytes[p + 3]);
      const size = (bytes[p + 4] << 24) | (bytes[p + 5] << 16) | (bytes[p + 6] << 8) | bytes[p + 7];
      if (!/^[A-Z0-9]{4}$/.test(id) || size <= 0) break;
      if (id === 'TIT2' || id === 'TPE1') {
        const enc = bytes[p + 10];
        const body = bytes.subarray(p + 11, p + 10 + size);
        const label = enc === 1 ? 'utf-16' : enc === 2 ? 'utf-16be' : enc === 3 ? 'utf-8' : 'latin1';
        const text = clean(new TextDecoder(label).decode(body).replace(/\u0000/g, ''));
        if (text) out[id === 'TIT2' ? 'title' : 'artist'] = text;
      }
      p += 10 + size;
    }
    i = end;
  }
  return out.title || out.artist ? out : null;
}

// onChange recebe { title, artist } ou null (nada para mostrar)
export function createNowPlaying(onChange) {
  let timer = null; let ctrl = null; let current = null; let last = '';
  const emit = (info) => {
    const key = info ? `${info.artist}|${info.title}` : '';
    if (key === last) return;
    last = key;
    onChange(info);
  };
  async function poll() {
    if (!current) return;
    ctrl?.abort();
    ctrl = new AbortController();
    const { url } = current;
    try {
      const mount = tritonMount(url);
      const info = mount ? await fromTriton(mount, ctrl.signal) : await fromIcecast(url, ctrl.signal);
      if (current && current.url === url && !current.id3) emit(info);
    } catch (e) {
      if (e.name !== 'AbortError' && current?.url === url && !current.id3) emit(null);
    }
  }
  return {
    // chamado quando a emissora começa a tocar (url = endereço que está mesmo a tocar)
    start(url) {
      if (current?.url === url && timer) return;
      this.stop();
      current = { url, id3: false };
      if (/\.m3u8(\?|$)/i.test(url) && !tritonMount(url)) return; // HLS: espera pelas etiquetas ID3
      poll();
      timer = setInterval(poll, POLL_MS);
    },
    stop() {
      clearInterval(timer); timer = null;
      ctrl?.abort(); ctrl = null;
      current = null;
      emit(null);
    },
    // ligado ao evento Hls.Events.FRAG_PARSING_METADATA
    id3(samples) {
      if (!current) return;
      for (const s of samples || []) {
        const info = s?.data ? readId3(s.data instanceof Uint8Array ? s.data : new Uint8Array(s.data)) : null;
        if (info) { current.id3 = true; emit(info); }
      }
    },
  };
}
