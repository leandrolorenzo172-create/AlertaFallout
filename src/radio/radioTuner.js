// Sintonizador de rádio analógico (JavaScript puro, sem dependências).
// Usado no separador Rádio da app e no ficheiro autónomo radio-fallout-pt.html.
import { themedCtx } from './canvasTheme';

// url = endereço principal; alt = alternativas tentadas por ordem se o principal falhar; page = site oficial
export const DEFAULT_STATIONS = [
  { freq: 89.5, name: 'TSF Rádio Notícias', genre: 'Informação contínua, análise e desporto', url: 'https://tsfdirecto.tsf.pt/tsfdirecto.mp3', alt: ['https://tsfdirecto.tsf.pt/tsfdirecto.aac'], page: 'https://www.tsf.pt/emdireto' },
  { freq: 90.4, name: 'Rádio Oxigénio', genre: 'Eletrónica, funk, soul e hip-hop', url: 'https://proic1.evsportugal.pt:8000/oxigenio_mp3', alt: ['https://proic1.evsportugal.pt:8000/oxigenio_aac'] },
  { freq: 92.0, name: 'Rádio Amália', genre: 'Fado', url: 'https://centova.radios.pt/proxy/496?mp=/stream' },
  { freq: 92.4, name: 'Mega Hits', genre: 'Pop, R&B e dance', url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/MEGA_HITS.mp3', alt: ['https://playerservices.streamtheworld.com/api/livestream-redirect/MEGA_HITSAAC.aac'], page: 'https://megahits.fm/ouvir-emissao-mega-hits' },
  { freq: 93.2, name: 'RFM', genre: 'Êxitos internacionais e nacionais', url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/RFM.mp3', alt: ['https://playerservices.streamtheworld.com/api/livestream-redirect/RFMAAC.aac'], page: 'https://rfm.pt/ouvir-emissao-rfm' },
  { freq: 94.4, name: 'Antena 2 (RTP)', genre: 'Música erudita, jazz, fado e cultura', url: 'https://radiocast.rtp.pt/antena280a.mp3', alt: ['https://streaming-live.rtp.pt/liveradio/antena280a/playlist.m3u8', 'https://streaming-live.rtp.pt/liveradio/antena280a/chunklist.m3u8'] },
  { freq: 95.7, name: 'Antena 1 (RTP)', genre: 'Informação, desporto e música em português', url: 'https://radiocast.rtp.pt/antena180a.mp3', alt: ['https://streaming-live.rtp.pt/liveradio/antena180a/playlist.m3u8', 'https://streaming-live.rtp.pt/liveradio/antena180a/chunklist.m3u8'], page: 'https://www.rtp.pt/play/direto/antena1' },
  { freq: 96.6, name: 'Smooth FM', genre: 'Jazz, soul, blues e bossa nova', url: 'https://stream-icy.bauermedia.pt/smooth.mp3', alt: ['https://stream-icy.bauermedia.pt/smooth.aac'] },
  { freq: 97.4, name: 'Rádio Comercial', genre: 'Pop/rock atual e entretenimento', url: 'https://stream-icy.bauermedia.pt/comercial.mp3', alt: ['https://stream-icy.bauermedia.pt/comercial.aac'], page: 'https://rayo.pt/radio-comercial' },
  { freq: 98.7, name: 'Rádio Observador', genre: 'Informação, opinião e desporto', url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/OBSERVADOR.mp3', alt: ['https://playerservices.streamtheworld.com/api/livestream-redirect/OBSERVADORAAC.aac'] },
  { freq: 100.3, name: 'Antena 3 (RTP)', genre: 'Música alternativa e novas bandas portuguesas', url: 'https://radiocast.rtp.pt/antena380a.mp3', alt: ['https://streaming-live.rtp.pt/liveradio/antena380a/playlist.m3u8', 'https://streaming-live.rtp.pt/liveradio/antena380a/chunklist.m3u8'] },
  { freq: 101.3, name: 'Rádio Nova Era', genre: 'Dance music, house e R&B', url: 'https://centova.radios.pt/proxy/478?mp=/stream' },
  { freq: 101.9, name: 'Estação Orbital', genre: 'Música de dança e êxitos eletrónicos', url: 'https://centova.radios.pt/proxy/401?mp=/stream' },
  { freq: 103.4, name: 'Rádio Renascença', genre: 'Informação e pop/rock dos anos 70 a 90', url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/RADIO_RENASCENCA.mp3', alt: ['https://playerservices.streamtheworld.com/api/livestream-redirect/RADIO_RENASCENCAAAC.aac'] },
  { freq: 104.3, name: 'M80 Rádio', genre: 'Clássicos dos anos 70, 80, 90 e 2000', url: 'https://stream-icy.bauermedia.pt/m80.mp3', alt: ['https://stream-icy.bauermedia.pt/m80.aac'], page: 'https://rayo.pt/m80' },
  { freq: 106.2, name: 'Cidade FM', genre: 'Hip-hop, R&B, reggaeton e música urbana', url: 'https://stream-icy.bauermedia.pt/cidade.mp3', alt: ['https://stream-icy.bauermedia.pt/cidade.aac'] },
];

const BANDS = {
  FM: { min: 88, max: 108, unit: 'MHz', step: 0.1, digits: 1, turn: 2, wheel: 0.05 },
  AM: { min: 540, max: 1600, unit: 'kHz', step: 10, digits: 0, turn: 100, wheel: 5 },
};
const RANGE = 0.3; // MHz: distância a que a emissora começa a ouvir-se
const LOCK = 0.1; // MHz: sintonia centrada
const DEFAULT_PRESETS = [92.4, 97.4, 93.2, 104.3, 95.7, 89.5];
const HLS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.17/hls.min.js';

const TEMPLATE = `
<div class="rf-chassis rf-off">
  <button type="button" class="rf-start" data-rf="start"><b>&#9654; TOCA PARA LIGAR O RÁDIO</b><span data-rf="startinfo">O browser só deixa tocar som depois de um toque.</span></button>
  <div class="rf-grid">
    <section class="rf-left rf-panelbox">
      <div class="rf-title">PRESET</div>
      <div class="rf-sel">
        <button type="button" data-rf="prev" aria-label="Emissora anterior">&lsaquo;</button>
        <div class="rf-name" data-rf="name">DESLIGADO</div>
        <button type="button" data-rf="next" aria-label="Emissora seguinte">&rsaquo;</button>
      </div>
      <div class="rf-art">
        <div class="rf-artsvg" data-rf="art"></div>
        <div class="rf-artinfo">
          <div class="rf-status" data-rf="status">RÁDIO DESLIGADO</div>
          <div class="rf-genre" data-rf="genre">Toca no botão de volume para ligar</div>
          <a class="rf-site" data-rf="site" target="_blank" rel="noopener noreferrer" hidden>OUVIR NO SITE OFICIAL &#8599;</a>
        </div>
      </div>
    </section>
    <section class="rf-right">
      <div class="rf-clock rf-panelbox" aria-label="Hora atual"><span>HORA ATUAL</span><b data-rf="clock">--:--:--</b><span data-rf="date"></span></div>
      <div class="rf-tuner rf-panelbox">
        <div class="rf-screen" data-rf="screen" role="slider" tabindex="0" aria-label="Frequência (arrasta ou usa as setas)"><canvas data-rf="dial"></canvas></div>
        <div class="rf-volline"><span>VOLUME</span><i><b data-rf="volbar"></b></i><span data-rf="volpct">0%</span></div>
        <div class="rf-mid">
          <div class="rf-knobwrap">
            <button type="button" class="rf-knob vol" data-rf="vol" aria-label="Volume e ligar/desligar"><span class="rf-cap" data-rf="volcap"></span></button>
            <span>VOLUME · ON/OFF</span>
          </div>
          <div class="rf-pills">
            <div class="rf-pill"><span>Sinal</span><span data-rf="pillsig">0%</span></div>
            <div class="rf-pill"><span>Estática</span><span data-rf="pillstat">0%</span></div>
          </div>
          <div class="rf-knobwrap">
            <button type="button" class="rf-knob tune" data-rf="tune" aria-label="Sintonia"><span class="rf-cap" data-rf="tunecap"></span></button>
            <span>SINTONIA</span>
          </div>
        </div>
        <div class="rf-readout">
          <label class="rf-nixie"><input id="rf-freq-input" data-rf="freq" type="text" inputmode="decimal" autocomplete="off" aria-label="Frequência exata" /><span data-rf="unit">MHz</span></label>
          <div class="rf-band" role="group" aria-label="Banda">
            <button type="button" data-rf="fm" aria-pressed="true">FM</button>
            <button type="button" data-rf="am" aria-pressed="false">AM</button>
          </div>
          <div class="rf-leds">
            <div class="rf-led pwr" data-rf="ledpwr"><i></i>POWER</div>
            <div class="rf-led" data-rf="ledlock"><i></i>STEREO / LOCKED</div>
          </div>
        </div>
      </div>
    </section>
  </div>
  <div class="rf-presets" data-rf="presets"></div>
  <div class="rf-note">MEMÓRIAS: toca para sintonizar · mantém premido para gravar a frequência atual · setas ← → afinam</div>
  <button type="button" class="rf-add" data-rf="addbtn">[ + ADICIONAR FREQUÊNCIA ]</button>
  <div class="rf-panel" data-rf="panel" hidden>
    <h3>&gt; NOVA ESTAÇÃO</h3>
    <form data-rf="form" novalidate>
      <label>FREQUÊNCIA MHz<input id="rf-new-freq" data-rf="nfreq" type="text" inputmode="decimal" placeholder="99.0" autocomplete="off" /></label>
      <label>NOME<input id="rf-new-name" data-rf="nname" type="text" maxlength="40" placeholder="A minha rádio" autocomplete="off" /></label>
      <label class="wide">URL DO STREAM (https)<input id="rf-new-url" data-rf="nurl" type="url" placeholder="https://..." autocomplete="off" /></label>
      <div class="rf-row"><button type="submit">GUARDAR</button><span class="rf-msg" data-rf="msg" role="status"></span></div>
    </form>
    <ul class="rf-custom" data-rf="custom"></ul>
  </div>
</div>`;

// Ícones originais por tipo de emissora (formas simples, a cor vem do CSS)
const ART = {
  tower: '<path d="M100 78 62 180h14l8-24h32l8 24h14L100 78zm-11 62 11-32 11 32H89z"/><circle cx="100" cy="62" r="11"/><path d="M62 28a54 54 0 0 0 0 68l9-8a42 42 0 0 1 0-52zM138 28l-9 8a42 42 0 0 1 0 52l9 8a54 54 0 0 0 0-68zM42 12a80 80 0 0 0 0 100l9-8a68 68 0 0 1 0-84zM158 12l-9 8a68 68 0 0 1 0 84l9 8a80 80 0 0 0 0-100z"/>',
  mic: '<rect x="76" y="18" width="48" height="92" rx="24"/><path d="M52 84h12a36 36 0 0 0 72 0h12a48 48 0 0 1-42 47.600V160h30v14H64v-14h30v-28.400A48 48 0 0 1 52 84z"/><rect x="84" y="38" width="32" height="5" fill="rgb(var(--cb))"/><rect x="84" y="52" width="32" height="5" fill="rgb(var(--cb))"/><rect x="84" y="66" width="32" height="5" fill="rgb(var(--cb))"/>',
  note: '<path d="M78 34 160 18v104a26 22 0 1 1-14-19V54L92 64v76a26 22 0 1 1-14-19z"/>',
  disc: '<path fill-rule="evenodd" d="M100 16a84 84 0 1 0 0 168 84 84 0 0 0 0-168zm0 56a28 28 0 1 1 0 56 28 28 0 0 1 0-56zm0 20a8 8 0 1 0 0 16 8 8 0 0 0 0-16z"/><path d="M100 30a70 70 0 0 0-70 70h10a60 60 0 0 1 60-60z" fill="rgb(var(--cb))"/>',
  bars: '<rect x="22" y="96" width="22" height="80"/><rect x="56" y="52" width="22" height="124"/><rect x="90" y="24" width="22" height="152"/><rect x="124" y="74" width="22" height="102"/><rect x="158" y="112" width="22" height="64"/>',
};
function artFor(st) {
  if (!st) return 'tower';
  const g = (st.genre || '').toLowerCase();
  if (/informa|not[ií]cia/.test(g)) return 'mic';
  if (/jazz|soul|blues/.test(g)) return 'bars';
  if (/dance|dan[cç]a|eletr|hip-hop|urbana/.test(g)) return 'disc';
  if (g) return 'note';
  return 'tower';
}
function gearSvg(dot) {
  let d = '';
  const teeth = 8;
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    const pts = [[a - 0.26, 34], [a - 0.17, 47], [a + 0.17, 47], [a + 0.26, 34]];
    for (const [ang, r] of pts) d += `${d ? 'L' : 'M'}${(50 + Math.sin(ang) * r).toFixed(1)} ${(50 - Math.cos(ang) * r).toFixed(1)}`;
  }
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="${d}Z" fill="#232622" stroke="#0b0c0b" stroke-width="1.5"/><circle cx="50" cy="50" r="17" fill="#181a17" stroke="#0b0c0b" stroke-width="1.5"/><circle cx="50" cy="50" r="8" fill="#2c302b"/><circle cx="50" cy="9" r="3.2" style="fill:${dot}"/></svg>`;
}

function load(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* sem armazenamento */ }
}
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

let hlsLoading;
function loadHls() {
  if (window.Hls) return Promise.resolve(window.Hls);
  if (!hlsLoading) {
    hlsLoading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = HLS_URL;
      s.onload = () => resolve(window.Hls);
      s.onerror = () => { hlsLoading = null; reject(new Error('hls')); };
      document.head.appendChild(s);
    });
  }
  return hlsLoading;
}

export function mountRadio(root) {
  root.classList.add('rf-root');
  root.innerHTML = TEMPLATE;
  const el = {};
  root.querySelectorAll('[data-rf]').forEach((n) => { el[n.dataset.rf] = n; });
  const chassis = root.querySelector('.rf-chassis');

  const state = {
    band: 'FM',
    freq: { FM: clamp(Number(load('rf_last_fm', 97.4)) || 97.4, 88, 108), AM: 1000 },
    vel: 0, // unidades da banda por segundo (inércia)
    target: null, // deslizar até uma memória
    on: false,
    volAngle: -135,
    lastVolAngle: clamp(Number(load('rf_last_vol', 30)) || 30, -100, 135),
    station: null, // emissora ao alcance
    gain: 0, // 0 = só estática, 1 = só emissora
    status: 'off',
    custom: load('rf_custom', []).filter((s) => s && s.freq && s.name && s.url),
    presets: load('rf_presets_v2', DEFAULT_PRESETS).slice(0, 6),
  };
  while (state.presets.length < 6) state.presets.push(DEFAULT_PRESETS[state.presets.length]);

  const stations = () => [...DEFAULT_STATIONS, ...state.custom];
  const band = () => BANDS[state.band];
  const volume = () => (state.on ? clamp((state.volAngle + 135) / 270, 0, 1) : 0);

  // ---------- Áudio ----------
  let ctx = null; let noiseGain = null; let analyser = null; let scopeData = null;
  const audio = new Audio();
  audio.preload = 'none';
  let hls = null; let loadedUrl = null; let connectTimer = null; let destroyed = false;

  // Safari e iPhone só deixam tocar áudio que tenha sido iniciado dentro de um toque.
  // Ao ligar o rádio toca-se um instante de silêncio, para o leitor ficar desbloqueado.
  let primed = false;
  function primeAudio() {
    if (primed || loadedUrl) return;
    primed = true;
    try {
      audio.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';
      const pr = audio.play();
      if (pr && pr.catch) pr.catch(() => {});
    } catch (e) { /* sem efeito */ }
  }

  function ensureAudio() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    ctx = new Ctx();
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { // ruído branco com um pouco de "rosa"
      const w = Math.random() * 2 - 1;
      last = (last + 0.04 * w) / 1.04;
      d[i] = w * 0.55 + last * 6;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = 0.55;
    noiseGain = ctx.createGain(); noiseGain.gain.value = 0;
    analyser = ctx.createAnalyser(); analyser.fftSize = 512;
    scopeData = new Uint8Array(analyser.fftSize);
    src.connect(bp).connect(noiseGain).connect(analyser).connect(ctx.destination);
    src.start();
  }

  // Vigia a ligação: se o stream falhar ou ficar preso a carregar, volta a ligar sozinho
  let retryTimer = null; let retryDelay = 3000;
  function armWatch(s) {
    clearTimeout(retryTimer); retryTimer = null;
    if (s === 'live') { retryDelay = 3000; return; }
    if (s !== 'bad' && s !== 'conn') return;
    const st = state.station;
    const wait = s === 'bad' ? retryDelay : 15000;
    retryTimer = setTimeout(() => {
      if (destroyed || !state.on || state.station !== st || !st) return;
      retryDelay = Math.min(retryDelay * 2, 30000);
      startStream(st);
    }, wait);
  }
  function setStatus(s) {
    armWatch(s);
    if (state.status === s) return;
    state.status = s;
    const map = {
      off: ['RÁDIO DESLIGADO', ''],
      static: ['SÓ ESTÁTICA', ''],
      conn: ['CONECTANDO...', 'conn'],
      live: ['EM DIRETO', 'live'],
      bad: ['SINAL FRACO / STREAM OFFLINE', 'bad'],
    };
    el.status.textContent = map[s][0];
    el.status.className = `rf-status ${map[s][1]}`;
  }

  function stopStream() {
    clearTimeout(connectTimer); connectTimer = null;
    attempt++; failNow = null;
    clearTimeout(retryTimer); retryTimer = null;
    if (hls) { hls.destroy(); hls = null; }
    if (loadedUrl) { audio.pause(); audio.removeAttribute('src'); audio.load(); loadedUrl = null; }
  }

  let attempt = 0; // identifica a tentativa em curso, para ignorar erros de tentativas antigas
  let failNow = null;
  function startStream(st) {
    stopStream();
    setStatus('conn');
    const urls = [st.url, ...(st.alt || [])];
    const tryUrl = async (n) => {
      if (destroyed || state.station !== st || !state.on) return;
      if (n >= urls.length) { failNow = null; setStatus('bad'); return; }
      const id = ++attempt;
      const url = urls[n];
      let failed = false;
      const fail = () => { if (failed || id !== attempt) return; failed = true; tryUrl(n + 1); }; // passa ao endereço seguinte
      failNow = fail;
      if (hls) { hls.destroy(); hls = null; }
      loadedUrl = url;
      try {
        const isHls = /\.m3u8(\?|$)/i.test(url);
        const Hls = isHls ? await loadHls().catch(() => null) : null;
        if (id !== attempt || state.station !== st) return;
        if (isHls && Hls && Hls.isSupported()) {
          hls = new Hls();
          hls.on(Hls.Events.ERROR, (_e, data) => { if (data.fatal) fail(); });
          hls.loadSource(url);
          hls.attachMedia(audio);
        } else {
          audio.src = url;
        }
        await audio.play();
      } catch (e) {
        if (e && e.name === 'AbortError') return; // interrompido por nova sintonia
        fail();
      }
    };
    // Só liga depois de a agulha parar um instante na zona da emissora
    connectTimer = setTimeout(() => tryUrl(0), 280);
  }
  audio.addEventListener('playing', () => { if (loadedUrl && state.station && state.on) setStatus('live'); });
  audio.addEventListener('waiting', () => { if (state.station && state.on && state.status === 'live') setStatus('conn'); });
  audio.addEventListener('error', () => { if (loadedUrl && state.station && failNow) failNow(); });

  function showArt(st) {
    const key = artFor(st);
    if (el.art.dataset.key !== key) { el.art.dataset.key = key; el.art.innerHTML = `<svg viewBox="0 0 200 200" fill="currentColor" aria-hidden="true">${ART[key]}</svg>`; }
  }
  function showIdle() {
    el.name.textContent = state.on ? 'SÓ ESTÁTICA' : 'DESLIGADO';
    el.genre.textContent = state.on ? 'Sem emissora nesta frequência' : 'Toca no botão de volume para ligar';
    showArt(null);
    el.site.hidden = true;
  }
  function setStation(st) {
    if (state.station === st) return;
    state.station = st;
    if (st) {
      el.name.textContent = st.name;
      el.genre.textContent = `${st.freq.toFixed(1)} MHz · ${st.genre || 'Estação personalizada'}`;
      save('rf_last_fm', st.freq);
      showArt(st);
      el.site.hidden = !st.page;
      if (st.page) el.site.href = st.page;
      startStream(st);
    } else {
      stopStream();
      showIdle();
      setStatus(state.on ? 'static' : 'off');
    }
  }

  function updateAudio() {
    const f = state.freq[state.band];
    let near = null; let dist = Infinity;
    if (state.on && state.band === 'FM') {
      for (const s of stations()) {
        const d = Math.abs(s.freq - f);
        if (d < dist) { dist = d; near = s; }
      }
    }
    if (!near || dist > RANGE) { near = null; }
    setStation(near);
    const proximity = near ? clamp(1 - (dist - LOCK) / (RANGE - LOCK), 0, 1) : 0;
    const playing = state.status === 'live';
    const target = playing ? proximity : 0; // enquanto o stream não toca, mantém-se a estática
    state.gain += (target - state.gain) * 0.15;
    const v = volume();
    audio.volume = clamp(v * state.gain, 0, 1);
    if (noiseGain) noiseGain.gain.setTargetAtTime(v * (1 - state.gain) * 0.35, ctx.currentTime, 0.05);
    el.ledlock.classList.toggle('on', !!near && dist <= LOCK + 1e-6 && playing);
    const sig = `${Math.round(state.gain * 100)}%`;
    const stat = `${state.on ? Math.round((1 - state.gain) * 100) : 0}%`;
    if (el.pillsig.textContent !== sig) el.pillsig.textContent = sig;
    if (el.pillstat.textContent !== stat) el.pillstat.textContent = stat;
  }

  // ---------- Mostrador ----------
  const dial = el.dial; const dctx = themedCtx(dial.getContext('2d'));
  let W = 0; let H = 0; let needsDraw = true;
  const FONT = "'Share Tech Mono', 'VT323', ui-monospace, monospace";

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = dial.getBoundingClientRect();
    W = r.width; H = r.height;
    dial.width = Math.round(W * dpr); dial.height = Math.round(H * dpr);
    dctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    needsDraw = true;
  }
  const pad = () => (W < 420 ? 40 : 56);
  const xOf = (v, b) => pad() + ((v - BANDS[b].min) / (BANDS[b].max - BANDS[b].min)) * (W - pad() - 22);

  function drawDial() {
    dctx.clearRect(0, 0, W, H);
    const fmOn = state.band === 'FM';
    const small = W < 420;
    const INK = 'rgb(var(--cb))';
    const bg = dctx.createRadialGradient(W / 2, H * 0.45, 10, W / 2, H * 0.45, W * 0.7);
    bg.addColorStop(0, 'rgb(var(--c) / 0.95)'); bg.addColorStop(1, 'rgb(var(--c) / 0.62)');
    dctx.fillStyle = bg; dctx.fillRect(0, 0, W, H);

    const fmY = H * 0.2; const fmLine = H * 0.29; const trackY = H * 0.4; const trackH = H * 0.17; const amLine = H * 0.7; const amY = H * 0.87;
    const size = small ? 11 : 14;
    dctx.textBaseline = 'alphabetic';
    const row = (active) => { dctx.globalAlpha = active ? 1 : 0.45; };

    // FM
    row(fmOn);
    dctx.fillStyle = INK; dctx.font = `${size}px ${FONT}`;
    dctx.textAlign = 'left'; dctx.fillText('FM', 12, fmY);
    dctx.textAlign = 'center';
    for (let f = 88; f <= 108; f += 2) dctx.fillText(String(f), xOf(f, 'FM'), fmY);
    dctx.fillRect(xOf(88, 'FM'), fmLine, xOf(108, 'FM') - xOf(88, 'FM'), 2);
    for (let i = 0; i <= 20; i++) { const x = xOf(88 + i, 'FM'); dctx.fillRect(x - 0.5, fmLine, 1, i % 2 ? 4 : 7); }

    // AM
    row(!fmOn);
    dctx.textAlign = 'left'; dctx.fillText('AM', 12, amY);
    dctx.textAlign = 'center';
    for (const k of [540, 600, 700, 800, 1000, 1300, 1600]) dctx.fillText(String(k / 10), xOf(k, 'AM'), amY);
    dctx.fillRect(xOf(540, 'AM'), amLine, xOf(1600, 'AM') - xOf(540, 'AM'), 2);
    for (let k = 600; k <= 1600; k += 100) { const x = xOf(k, 'AM'); dctx.fillRect(x - 0.5, amLine - 6, 1, 6); }
    dctx.globalAlpha = 1;

    // Faixa de sintonia, marcas das emissoras e cursor preto
    const tx0 = xOf(band().min, state.band); const tx1 = xOf(band().max, state.band);
    dctx.fillStyle = 'rgb(var(--cb) / 0.45)'; dctx.fillRect(12, trackY, W - 24, trackH);
    if (fmOn) {
      dctx.fillStyle = 'rgb(var(--cb) / 0.8)';
      for (const st of stations()) dctx.fillRect(xOf(st.freq, 'FM') - 1, trackY + 3, 2, trackH - 6);
    }
    const nx = clamp(xOf(state.freq[state.band], state.band), tx0, tx1);
    dctx.fillStyle = 'rgb(var(--cb))';
    const tw = small ? 10 : 13;
    dctx.beginPath();
    if (dctx.roundRect) dctx.roundRect(nx - tw / 2, trackY - 4, tw, trackH + 8, 2); else dctx.rect(nx - tw / 2, trackY - 4, tw, trackH + 8);
    dctx.fill();
  }

  // ---------- Estado e interface ----------
  function setFreq(v, keepVel) {
    const b = band();
    const c = clamp(v, b.min, b.max);
    if (c !== v && !keepVel) state.vel = 0;
    if (c !== v) state.vel = 0;
    state.freq[state.band] = c;
    needsDraw = true;
    if (document.activeElement !== el.freq) el.freq.value = c.toFixed(b.digits);
    el.tunecap.style.transform = `rotate(${((c - b.min) / b.turn) * 360}deg)`;
    el.tune.style.setProperty('--p', ((c - b.min) / (b.max - b.min)).toFixed(4));
    el.screen.setAttribute('aria-valuenow', c.toFixed(b.digits));
    el.screen.setAttribute('aria-valuetext', `${c.toFixed(b.digits)} ${b.unit}`);
  }

  function setBand(name) {
    state.band = name; state.vel = 0; state.target = null;
    el.fm.setAttribute('aria-pressed', String(name === 'FM'));
    el.am.setAttribute('aria-pressed', String(name === 'AM'));
    el.unit.textContent = band().unit;
    el.screen.setAttribute('aria-valuemin', band().min);
    el.screen.setAttribute('aria-valuemax', band().max);
    setFreq(state.freq[name]);
  }

  function setVolAngle(a) {
    state.volAngle = clamp(a, -135, 135);
    el.volcap.style.transform = `rotate(${state.volAngle}deg)`;
    const pct = (state.volAngle + 135) / 270;
    el.vol.style.setProperty('--p', pct.toFixed(4));
    el.volbar.style.width = `${Math.round(pct * 100)}%`;
    el.volpct.textContent = `${Math.round(pct * 100)}%`;
    const on = state.volAngle > -128;
    if (on !== state.on) setPower(on);
    if (on) { state.lastVolAngle = state.volAngle; save('rf_last_vol', Math.round(state.volAngle)); }
  }

  function setPower(on) {
    state.on = on;
    chassis.classList.toggle('rf-off', !on);
    el.ledpwr.classList.toggle('on', on);
    if (on) { el.start.hidden = true; ensureAudio(); primeAudio(); state.status = ''; setStatus('static'); }
    else { setStation(null); state.status = ''; setStatus('off'); state.gain = 0; }
    showIdle();
    needsDraw = true;
  }

  function renderPresets() {
    el.presets.innerHTML = '';
    state.presets.forEach((f, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = `<b>${i + 1}</b><small>${Number(f).toFixed(1)}</small>`;
      b.setAttribute('aria-label', `Memória ${i + 1}: ${Number(f).toFixed(1)} MHz`);
      let timer = null; let held = false;
      b.addEventListener('pointerdown', () => {
        held = false;
        timer = setTimeout(() => {
          held = true;
          if (state.band !== 'FM') return;
          state.presets[i] = Math.round(state.freq.FM * 10) / 10;
          save('rf_presets_v2', state.presets);
          renderPresets();
          const nb = el.presets.children[i];
          nb.classList.add('saved'); setTimeout(() => nb.classList.remove('saved'), 700);
        }, 650);
      });
      const cancel = () => clearTimeout(timer);
      b.addEventListener('pointerup', cancel); b.addEventListener('pointerleave', cancel); b.addEventListener('pointercancel', cancel);
      b.addEventListener('click', () => {
        if (held) return;
        if (state.band !== 'FM') setBand('FM');
        state.vel = 0; state.target = state.presets[i];
      });
      el.presets.appendChild(b);
    });
  }

  function renderCustom() {
    el.custom.innerHTML = '';
    state.custom.forEach((s, i) => {
      const li = document.createElement('li');
      const span = document.createElement('span');
      span.textContent = `${Number(s.freq).toFixed(1)} MHz — ${s.name}`;
      const del = document.createElement('button');
      del.type = 'button'; del.textContent = 'APAGAR';
      del.addEventListener('click', () => {
        if (state.station === s) setStation(null);
        state.custom.splice(i, 1); save('rf_custom', state.custom); renderCustom(); needsDraw = true;
      });
      li.append(span, del); el.custom.appendChild(li);
    });
  }

  // ---------- Eventos ----------
  const offs = [];
  const on = (target, type, fn, opts) => { target.addEventListener(type, fn, opts); offs.push(() => target.removeEventListener(type, fn, opts)); };

  // Arrastar a agulha no visor (com inércia)
  let drag = null;
  on(el.screen, 'pointerdown', (e) => {
    el.screen.setPointerCapture(e.pointerId);
    drag = { x: e.clientX, t: performance.now() }; state.vel = 0; state.target = null;
  });
  on(el.screen, 'pointermove', (e) => {
    if (!drag) return;
    const b = band();
    const per = (b.max - b.min) / (W - pad() - 22);
    const now = performance.now();
    const dx = e.clientX - drag.x; const dt = Math.max(1, now - drag.t) / 1000;
    setFreq(state.freq[state.band] + dx * per);
    state.dragVel = (dx * per) / dt;
    drag.x = e.clientX; drag.t = now;
  });
  const endDrag = () => {
    if (!drag) return;
    if (performance.now() - drag.t < 80) { const lim = (band().max - band().min) * 0.2; state.vel = clamp((state.dragVel || 0) * 0.6, -lim, lim); }
    drag = null; state.dragVel = 0;
  };
  on(el.screen, 'pointerup', endDrag); on(el.screen, 'pointercancel', endDrag);

  // Botões rotativos: o ângulo do ponteiro em relação ao centro
  function knob(node, onDelta, onTap) {
    let k = null;
    const ang = (e) => {
      const r = node.getBoundingClientRect();
      return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
    };
    on(node, 'pointerdown', (e) => { node.setPointerCapture(e.pointerId); k = { a: ang(e), moved: 0, t: performance.now() }; });
    on(node, 'pointermove', (e) => {
      if (!k) return;
      const a = ang(e);
      let d = a - k.a; if (d > 180) d -= 360; if (d < -180) d += 360;
      const now = performance.now();
      k.moved += Math.abs(d);
      onDelta(d, Math.max(1, now - k.t) / 1000);
      k.a = a; k.t = now;
    });
    const end = () => { if (k && k.moved < 4 && onTap) onTap(); k = null; };
    on(node, 'pointerup', end); on(node, 'pointercancel', () => { k = null; });
  }
  knob(el.tune, (d, dt) => {
    const delta = (d / 360) * band().turn;
    state.target = null;
    setFreq(state.freq[state.band] + delta);
    state.vel = clamp(delta / dt, -band().turn * 1.5, band().turn * 1.5) * 0.4;
  });
  on(el.tune, 'wheel', (e) => {
    e.preventDefault(); state.target = null; state.vel = 0;
    setFreq(state.freq[state.band] + (e.deltaY < 0 ? 1 : -1) * band().wheel);
  }, { passive: false });
  on(el.tune, 'keydown', (e) => {
    if (e.key === 'ArrowUp') { e.preventDefault(); setFreq(state.freq[state.band] + band().step); }
    if (e.key === 'ArrowDown') { e.preventDefault(); setFreq(state.freq[state.band] - band().step); }
  });

  knob(el.vol, (d) => setVolAngle(state.volAngle + d), () => {
    if (state.on) setVolAngle(-135); else setVolAngle(state.lastVolAngle);
  });
  on(el.vol, 'wheel', (e) => { e.preventDefault(); setVolAngle(state.volAngle + (e.deltaY < 0 ? 12 : -12)); }, { passive: false });
  on(el.vol, 'keydown', (e) => {
    // Cima/baixo mexem no volume; esquerda/direita ficam sempre para a sintonia
    if (e.key === 'ArrowUp') { e.preventDefault(); setVolAngle(state.volAngle + 15); }
    if (e.key === 'ArrowDown') { e.preventDefault(); setVolAngle(state.volAngle - 15); }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (state.on) setVolAngle(-135); else setVolAngle(state.lastVolAngle); }
  });

  // Setas esquerda/direita em qualquer sítio (exceto quando se escreve num campo)
  on(window, 'keydown', (e) => {
    if (e.target && e.target.tagName === 'INPUT') return;
    if (!root.isConnected || root.offsetParent === null) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault(); state.vel = 0; state.target = null;
      const b = band();
      const next = state.freq[state.band] + (e.key === 'ArrowRight' ? b.step : -b.step);
      setFreq(Math.round(next / b.step) * b.step);
    }
  });

  // Mostrador digital: escrever a frequência
  const applyTyped = () => {
    const v = parseFloat(el.freq.value.replace(',', '.'));
    state.vel = 0; state.target = null;
    if (Number.isFinite(v)) setFreq(v);
    el.freq.value = state.freq[state.band].toFixed(band().digits);
  };
  on(el.freq, 'keydown', (e) => { if (e.key === 'Enter') { applyTyped(); el.freq.blur(); } });
  on(el.freq, 'blur', applyTyped);
  on(el.freq, 'focus', () => el.freq.select());

  const step = (dir) => {
    const list = stations().slice().sort((x, y) => x.freq - y.freq);
    const cur = state.target != null ? state.target : state.freq.FM;
    let st = dir > 0 ? list.find((x) => x.freq > cur + 0.05) : list.slice().reverse().find((x) => x.freq < cur - 0.05);
    if (!st) st = dir > 0 ? list[0] : list[list.length - 1];
    if (state.band !== 'FM') setBand('FM');
    state.vel = 0; state.target = st.freq;
  };
  on(el.prev, 'click', () => step(-1));
  on(el.next, 'click', () => step(1));

  on(el.start, 'click', () => { el.start.hidden = true; if (!state.on) setVolAngle(state.lastVolAngle); });
  on(el.fm, 'click', () => setBand('FM'));
  on(el.am, 'click', () => setBand('AM'));

  on(el.addbtn, 'click', () => { el.panel.hidden = !el.panel.hidden; });
  on(el.form, 'submit', (e) => {
    e.preventDefault();
    const f = Math.round(parseFloat(el.nfreq.value.replace(',', '.')) * 10) / 10;
    const name = el.nname.value.trim(); const url = el.nurl.value.trim();
    let msg = '';
    if (!Number.isFinite(f) || f < 88 || f > 108) msg = 'Frequência entre 88.0 e 108.0 MHz.';
    else if (!name) msg = 'Falta o nome.';
    else if (!/^https:\/\/\S+$/i.test(url)) msg = 'O URL tem de começar por https://';
    else if (stations().some((s) => Math.abs(s.freq - f) < 0.35)) msg = 'Já existe uma estação junto a essa frequência.';
    if (msg) { el.msg.textContent = msg; return; }
    state.custom.push({ freq: f, name: name.slice(0, 40), url, genre: '' });
    save('rf_custom', state.custom);
    el.form.reset(); el.msg.textContent = `Guardada em ${f.toFixed(1)} MHz.`;
    renderCustom(); needsDraw = true;
  });

  on(window, 'resize', resize);
  // Relógio: hora local do dispositivo, atualizada a cada segundo
  const tick = () => {
    const d = new Date();
    el.clock.textContent = d.toLocaleTimeString('pt-PT', { hour12: false });
    el.date.textContent = d.toLocaleDateString('pt-PT', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).replace(/\./g, '').toUpperCase();
  };
  tick();
  const clockTimer = setInterval(tick, 1000);
  // Quando o tema muda, o mostrador tem de ser redesenhado com as cores novas
  const themeWatch = new MutationObserver(() => { needsDraw = true; });
  themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'data-pb'] });
  on(window, 'online', () => { if (state.on && state.station && state.status !== 'live') { retryDelay = 3000; startStream(state.station); } });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { needsDraw = true; });

  // ---------- Ciclo ----------
  let raf = 0; let lastT = performance.now();
  function frame(now) {
    if (destroyed) return;
    const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    if (state.target != null) {
      const diff = state.target - state.freq.FM;
      if (Math.abs(diff) < 0.004) { setFreq(state.target); state.target = null; } else setFreq(state.freq.FM + diff * Math.min(1, dt * 7));
    } else if (!drag && Math.abs(state.vel) > band().step * 0.05) {
      setFreq(state.freq[state.band] + state.vel * dt, true);
      state.vel *= Math.exp(-4.5 * dt);
    } else if (!drag) state.vel = 0;
    updateAudio();
    if (needsDraw) { drawDial(); needsDraw = false; }
    raf = requestAnimationFrame(frame);
  }

  el.volcap.innerHTML = gearSvg('rgb(var(--c))'); el.tunecap.innerHTML = gearSvg('rgb(var(--c))');
  renderPresets(); renderCustom();
  {
    const first = stations().find((x) => Math.abs(x.freq - state.freq.FM) <= LOCK);
    if (first) el.startinfo.textContent = `Começa em ${first.name} · ${first.freq.toFixed(1)} MHz`;
  }
  setBand('FM'); setVolAngle(-135);
  resize();
  raf = requestAnimationFrame(frame);

  return function destroy() {
    destroyed = true;
    cancelAnimationFrame(raf);
    clearInterval(clockTimer); themeWatch.disconnect();
    offs.forEach((f) => f());
    stopStream();
    if (ctx) ctx.close().catch(() => {});
    root.innerHTML = '';
  };
}
