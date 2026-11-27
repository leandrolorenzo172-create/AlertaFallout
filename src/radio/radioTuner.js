// Sintonizador de rádio analógico (JavaScript puro, sem dependências).
// Usado no separador Rádio da app e no ficheiro autónomo radio-steeldeck.html.
import { themedCtx } from './canvasTheme';
import { DEFAULT_STATIONS } from './defaultStations';
import stationsPT from '../data/stationsPT.json';
import { createNowPlaying } from './nowPlaying';
import { locale, t as tr } from '../i18n';

export { DEFAULT_STATIONS };

// range = distância a que a emissora começa a ouvir-se; lock = sintonia centrada (luz STEREO / LOCKED)
const RANGE = 0.3; // MHz
const LOCK = 0.1; // MHz
const BANDS = {
  FM: { min: 88, max: 108, unit: 'MHz', step: 0.1, digits: 1, turn: 2, wheel: 0.05, range: RANGE, lock: LOCK },
  AM: { min: 480, max: 1600, unit: 'kHz', step: 10, digits: 0, turn: 100, wheel: 5, range: 5, lock: 2 },
};
const DEFAULT_PRESETS = [92.4, 97.4, 93.2, 104.3, 95.7, 89.5].map((freq) => ({ band: 'FM', freq }));
// Memórias guardadas antes eram só números (FM); agora guardam a banda e a frequência
const toPreset = (v) => (v && typeof v === 'object' && (v.band === 'FM' || v.band === 'AM') && Number.isFinite(Number(v.freq))
  ? { band: v.band, freq: Number(v.freq) }
  : Number.isFinite(Number(v)) ? { band: Number(v) >= 480 ? 'AM' : 'FM', freq: Number(v) } : null);
const presetLabel = (p) => (p.band === 'AM' ? `${Math.round(p.freq)} AM` : Number(p.freq).toFixed(1));

// Todas as emissoras: as 16 principais + as do radio-browser.info (src/data/stationsPT.json)
const ALL_STATIONS = [...DEFAULT_STATIONS, ...((stationsPT && stationsPT.stations) || [])];
const fmtFreq = (st) => (st.band === 'AM' ? `${Math.round(st.freq)} kHz AM` : `${Number(st.freq).toFixed(1)} MHz`);
const online = () => typeof navigator === 'undefined' || navigator.onLine !== false;

const TEMPLATE = `
<div class="rf-chassis rf-off">
  <button type="button" class="rf-start" data-rf="start"><b data-rf="startlabel">${tr('&#9654; TOCA PARA LIGAR O RÁDIO')}</b><span data-rf="startinfo">${tr('O browser só deixa tocar som depois de um toque.')}</span></button>
  <div class="rf-grid">
    <section class="rf-left rf-panelbox">
      <div class="rf-title">PRESET</div>
      <div class="rf-sel">
        <button type="button" data-rf="prev" aria-label="${tr('Emissora anterior')}">&lsaquo;</button>
        <div class="rf-name" data-rf="name">${tr('DESLIGADO')}</div>
        <button type="button" data-rf="next" aria-label="${tr('Emissora seguinte')}">&rsaquo;</button>
      </div>
      <div class="rf-np" data-rf="np" hidden><span aria-hidden="true">&#9835;</span><b data-rf="nptext"></b></div>
      <div class="rf-art">
        <div class="rf-artsvg" data-rf="art"></div>
        <div class="rf-artinfo">
          <div class="rf-status" data-rf="status">${tr('RÁDIO DESLIGADO')}</div>
          <div class="rf-genre" data-rf="genre">${tr('Toca no botão de volume para ligar')}</div>
          <a class="rf-site" data-rf="site" target="_blank" rel="noopener noreferrer" hidden>${tr('OUVIR NO SITE OFICIAL &#8599;')}</a>
        </div>
      </div>
    </section>
    <section class="rf-right">
      <div class="rf-clock rf-panelbox" aria-label="${tr('Hora atual')}"><span>${tr('HORA ATUAL')}</span><b data-rf="clock">--:--:--</b><span data-rf="date"></span></div>
      <div class="rf-tuner rf-panelbox">
        <div class="rf-screen" data-rf="screen" role="slider" tabindex="0" aria-label="${tr('Visor de frequência (sintoniza no botão SINTONIA)')}"><canvas data-rf="dial"></canvas></div>
        <div class="rf-volline"><span>VOLUME</span><i><b data-rf="volbar"></b></i><span data-rf="volpct">0%</span></div>
        <div class="rf-mid">
          <div class="rf-knobwrap">
            <button type="button" class="rf-knob vol" data-rf="vol" aria-label="${tr('Volume e ligar/desligar')}"><span class="rf-cap" data-rf="volcap"></span></button>
            <span>${tr('VOLUME · ON/OFF')}</span>
          </div>
          <div class="rf-pills">
            <div class="rf-pill"><span>${tr('Sinal')}</span><span data-rf="pillsig">0%</span></div>
            <div class="rf-pill"><span>${tr('Estática')}</span><span data-rf="pillstat">0%</span></div>
          </div>
          <div class="rf-knobwrap">
            <button type="button" class="rf-knob tune" data-rf="tune" aria-label="${tr('Sintonia')}"><span class="rf-cap" data-rf="tunecap"></span></button>
            <span>${tr('SINTONIA')}</span>
          </div>
        </div>
        <div class="rf-readout">
          <label class="rf-nixie"><input id="rf-freq-input" data-rf="freq" type="text" inputmode="decimal" autocomplete="off" aria-label="${tr('Frequência exata')}" /><span data-rf="unit">MHz</span></label>
          <div class="rf-band" role="group" aria-label="${tr('Banda')}">
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
  <div class="rf-note" data-rf="note">${tr('MEMÓRIAS: toca para sintonizar · mantém premido para gravar a frequência atual · setas ← → afinam')}</div>
  <div class="rf-actions">
    <button type="button" data-rf="listbtn" aria-expanded="false">${tr('[ LISTA ]')}</button>
    <button type="button" data-rf="sharebtn">${tr('[ PARTILHAR ]')}</button>
    <button type="button" class="rf-add" data-rf="addbtn">${tr('[ + ADICIONAR FREQUÊNCIA ]')}</button>
  </div>
  <div class="rf-sharemsg" data-rf="sharemsg" role="status"></div>
  <div class="rf-list" data-rf="listpanel" hidden>
    <h3>${tr('&gt; EMISSORAS ')}<span data-rf="listcount"></span></h3>
    <input id="rf-list-search" data-rf="listq" type="search" autocomplete="off" placeholder="${tr('Procurar por nome ou género...')}" aria-label="${tr('Procurar emissora por nome ou género')}" />
    <ul class="rf-listul" data-rf="listul"></ul>
  </div>
  <div class="rf-panel" data-rf="panel" hidden>
    <h3>${tr('&gt; NOVA ESTAÇÃO')}</h3>
    <form data-rf="form" novalidate>
      <label>${tr('FREQUÊNCIA MHz')}<input id="rf-new-freq" data-rf="nfreq" type="text" inputmode="decimal" placeholder="99.0" autocomplete="off" /></label>
      <label>${tr('NOME')}<input id="rf-new-name" data-rf="nname" type="text" maxlength="40" placeholder="${tr('A minha rádio')}" autocomplete="off" /></label>
      <label class="wide">${tr('URL DO STREAM (https)')}<input id="rf-new-url" data-rf="nurl" type="url" placeholder="https://..." autocomplete="off" /></label>
      <div class="rf-row"><button type="submit">${tr('GUARDAR')}</button><span class="rf-msg" data-rf="msg" role="status"></span></div>
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

// hls.js só é carregado quando a emissora é HLS. Na app vem do próprio site (import dinâmico);
// no ficheiro autónomo vem embutido no HTML e já está em window.Hls.
let hlsLib = null;
function loadHls() {
  if (typeof window !== 'undefined' && window.Hls) return Promise.resolve(window.Hls);
  if (!hlsLib) hlsLib = import('hls.js').then((m) => m.default || m).catch((e) => { hlsLib = null; throw e; });
  return hlsLib;
}

// opts.initialFreq / opts.band: abrir sintonizado numa frequência (link partilhado)
// opts.onTune(freq, band): chamado quando a sintonia assenta numa frequência nova (para atualizar o endereço)
// opts.shareUrl(freq, band): endereço a partilhar
export function mountRadio(root, opts = {}) {
  root.classList.add('rf-root');
  root.innerHTML = TEMPLATE;
  const el = {};
  root.querySelectorAll('[data-rf]').forEach((n) => { el[n.dataset.rf] = n; });
  const chassis = root.querySelector('.rf-chassis');

  const last = load('rf_last', null);
  const reqBand = opts.band === 'AM' || opts.band === 'FM' ? opts.band : null;
  const reqFreq = Number(opts.initialFreq);
  const startBand = reqBand || (Number.isFinite(reqFreq) && reqFreq >= 480 ? 'AM' : (Number.isFinite(reqFreq) ? 'FM' : (last && last.band === 'AM' ? 'AM' : 'FM')));
  const state = {
    band: startBand,
    freq: {
      FM: clamp(Number(startBand === 'FM' && Number.isFinite(reqFreq) ? reqFreq : (last && last.band === 'FM' ? last.freq : load('rf_last_fm', 97.4))) || 97.4, 88, 108),
      AM: clamp(Number(startBand === 'AM' && Number.isFinite(reqFreq) ? reqFreq : (last && last.band === 'AM' ? last.freq : 1000)) || 1000, 480, 1600),
    },
    vel: 0, // unidades da banda por segundo (inércia)
    target: null, // deslizar até uma memória
    on: false,
    volAngle: -135,
    lastVolAngle: clamp(Number(load('rf_last_vol', 30)) || 30, -100, 135),
    station: null, // emissora ao alcance
    gain: 0, // 0 = só estática, 1 = só emissora
    status: 'off',
    custom: load('rf_custom', []).filter((s) => s && s.freq && s.name && s.url).map((s) => ({ band: 'FM', ...s })),
    presets: (load('rf_presets_v2', DEFAULT_PRESETS) || []).map(toPreset).slice(0, 6),
  };
  for (let i = 0; i < 6; i++) if (!state.presets[i]) state.presets[i] = DEFAULT_PRESETS[i];

  let listOpen = false; // painel LISTA aberto
  const stations = () => [...ALL_STATIONS, ...state.custom];
  const stationAt = (b, f) => stations().find((x) => x.band === b && Math.abs(x.freq - f) <= BANDS[b].lock + 1e-6);
  const band = () => BANDS[state.band];
  const volume = () => (state.on ? clamp((state.volAngle + 135) / 270, 0, 1) : 0);

  // ---------- Áudio ----------
  let ctx = null; let noiseGain = null; let analyser = null; let scopeData = null;
  const audio = new Audio();
  audio.preload = 'none';
  let hls = null; let loadedUrl = null; let connectTimer = null; let destroyed = false;
  // Painel principal: avisa o que está a tocar (evento global, sem dependências — também corre no rádio autónomo)
  let npTrack = ''; let announced = false;
  const announce = (playing) => {
    announced = playing;
    window.dispatchEvent(new CustomEvent('pb-now-playing', { detail: { kind: 'radio', playing, station: state.station ? state.station.name : '', track: npTrack } }));
  };
  const np = createNowPlaying((info) => {
    npTrack = info ? (info.artist && info.title ? `${info.artist} - ${info.title}` : (info.title || info.artist)) : '';
    if (announced) announce(true);
    if (!info) { el.np.hidden = true; el.nptext.textContent = ''; return; }
    el.nptext.textContent = info.artist && info.title ? `${info.artist} — ${info.title}` : (info.title || info.artist);
    el.np.hidden = false;
  });

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
    if (s !== 'bad' && s !== 'conn') return; // 'nonet': sem internet não se insiste (volta ao recuperar a ligação)
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
    if (s === 'live' && loadedUrl) np.start(loadedUrl);
    else if (s !== 'conn') np.stop();
    if (s === 'live') announce(true);
    else if (s !== 'conn') { npTrack = ''; if (announced) announce(false); } // a religar mantém o que estava
    if (state.status === s) return;
    state.status = s;
    const map = {
      off: [tr('RÁDIO DESLIGADO'), ''],
      static: [tr('SÓ ESTÁTICA'), ''],
      conn: ['CONECTANDO...', 'conn'],
      live: [tr('EM DIRETO'), 'live'],
      bad: [tr('SINAL FRACO / STREAM OFFLINE'), 'bad'],
      nonet: [tr('SEM SINAL — SEM LIGAÇÃO À INTERNET'), 'bad'],
    };
    el.status.textContent = map[s][0];
    el.status.className = `rf-status ${map[s][1]}`;
  }

  function stopStream() {
    clearTimeout(connectTimer); connectTimer = null;
    attempt++; failNow = null;
    clearTimeout(retryTimer); retryTimer = null;
    np.stop();
    if (hls) { hls.destroy(); hls = null; }
    if (loadedUrl) { audio.pause(); audio.removeAttribute('src'); audio.load(); loadedUrl = null; }
  }

  let attempt = 0; // identifica a tentativa em curso, para ignorar erros de tentativas antigas
  let failNow = null;
  function startStream(st) {
    stopStream();
    if (!online()) { setStatus('nonet'); return; } // sem internet não vale a pena tentar
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
          hls.on(Hls.Events.FRAG_PARSING_METADATA, (_e, data) => np.id3(data && data.samples)); // título/artista em ID3
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
    el.name.textContent = state.on ? (online() ? tr('SÓ ESTÁTICA') : tr('SEM SINAL')) : 'DESLIGADO';
    el.genre.textContent = state.on ? (online() ? tr('Sem emissora nesta frequência') : tr('Sem ligação à internet')) : tr('Toca no botão de volume para ligar');
    showArt(null);
    el.site.hidden = true;
  }
  function setStation(st) {
    if (state.station === st) return;
    state.station = st;
    setTimeout(() => reportState(), 0);
    if (st) {
      el.name.textContent = st.name;
      el.genre.textContent = `${fmtFreq(st)} · ${st.genre || (state.custom.includes(st) ? tr('Estação personalizada') : tr('Rádio portuguesa'))}`;
      save('rf_last', { band: st.band, freq: st.freq });
      if (st.band === 'FM') save('rf_last_fm', st.freq);
      showArt(st);
      el.site.hidden = !st.page;
      if (st.page) el.site.href = st.page;
      startStream(st);
    } else {
      stopStream();
      showIdle();
      setStatus(state.on ? (online() ? 'static' : 'nonet') : 'off');
    }
    if (listOpen) markCurrentInList();
  }

  function updateAudio() {
    const f = state.freq[state.band];
    let near = null; let dist = Infinity;
    const b = band();
    if (state.on) {
      for (const s of stations()) {
        if (s.band !== state.band) continue;
        const d = Math.abs(s.freq - f);
        if (d < dist) { dist = d; near = s; }
      }
    }
    if (!near || dist > b.range) { near = null; }
    setStation(near);
    const proximity = near ? clamp(1 - (dist - b.lock) / (b.range - b.lock), 0, 1) : 0;
    const playing = state.status === 'live';
    const target = playing ? proximity : 0; // enquanto o stream não toca, mantém-se a estática
    state.gain += (target - state.gain) * 0.15;
    const v = volume();
    audio.volume = clamp(v * state.gain, 0, 1);
    if (noiseGain) noiseGain.gain.setTargetAtTime(v * (1 - state.gain) * 0.35, ctx.currentTime, 0.05);
    el.ledlock.classList.toggle('on', !!near && dist <= b.lock + 1e-6 && playing);
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
    for (const k of [480, 600, 700, 800, 1000, 1300, 1600]) dctx.fillText(String(k / 10), xOf(k, 'AM'), amY);
    dctx.fillRect(xOf(480, 'AM'), amLine, xOf(1600, 'AM') - xOf(480, 'AM'), 2);
    for (let k = 600; k <= 1600; k += 100) { const x = xOf(k, 'AM'); dctx.fillRect(x - 0.5, amLine - 6, 1, 6); }
    dctx.globalAlpha = 1;

    // Faixa de sintonia, marcas das emissoras e cursor preto
    const tx0 = xOf(band().min, state.band); const tx1 = xOf(band().max, state.band);
    dctx.fillStyle = 'rgb(var(--cb) / 0.45)'; dctx.fillRect(12, trackY, W - 24, trackH);
    dctx.fillStyle = 'rgb(var(--cb) / 0.8)';
    const markW = fmOn ? 2 : 1; // na AM as emissoras estão muito juntas: traços mais finos
    for (const st of stations()) if (st.band === state.band) dctx.fillRect(xOf(st.freq, st.band) - markW / 2, trackY + 3, markW, trackH - 6);
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

  // Menu ≡ da aba RÁDIO: estado (ligado, emissora) por evento global
  const reportState = () => window.dispatchEvent(new CustomEvent('pb-radio-state', { detail: { on: state.on, station: state.station ? state.station.name : '', freq: Number(state.freq[state.band].toFixed(band().digits)), band: state.band } }));
  function setPower(on) {
    state.on = on;
    setTimeout(() => reportState(), 0);
    // rádio e música não tocam ao mesmo tempo: ao ligar o rádio, a música pára (e vice-versa)
    if (on) window.dispatchEvent(new CustomEvent('pb-audio-start', { detail: 'radio' }));
    chassis.classList.toggle('rf-off', !on);
    el.ledpwr.classList.toggle('on', on);
    if (on) { el.start.hidden = true; ensureAudio(); primeAudio(); state.status = ''; setStatus(online() ? 'static' : 'nonet'); }
    else { setStation(null); state.status = ''; setStatus('off'); state.gain = 0; }
    showIdle();
    needsDraw = true;
  }

  const NOTE = tr('MEMÓRIAS: toca para sintonizar · mantém premido para gravar a frequência atual · setas ← → afinam');
  let noteTimer = null;
  function savePreset(i) {
    const f = Number(state.freq[state.band].toFixed(band().digits));
    state.presets[i] = { band: state.band, freq: f };
    save('rf_presets_v2', state.presets);
    renderPresets();
    const nb = el.presets.children[i];
    nb.classList.add('saved'); setTimeout(() => nb.classList.remove('saved'), 900);
    try { if (navigator.vibrate) navigator.vibrate(40); } catch (e) { /* sem vibração */ }
    const st = stationAt(state.band, f);
    el.note.textContent = `${tr('MEMÓRIA {n} GUARDADA:', { n: i + 1 })} ${st ? `${st.name} · ` : ''}${f} ${band().unit}`;
    el.note.classList.add('ok');
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => { el.note.textContent = NOTE; el.note.classList.remove('ok'); }, 3500);
  }
  function renderPresets() {
    el.presets.innerHTML = '';
    state.presets.forEach((p, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = `<b>${i + 1}</b><small>${presetLabel(p)}</small>`;
      b.setAttribute('aria-label', `${tr('Memória {n}:', { n: i + 1 })} ${p.band === 'AM' ? `${Math.round(p.freq)} kHz AM` : `${Number(p.freq).toFixed(1)} MHz`}. ${tr('Mantém premido para gravar a frequência atual.')}`);
      // Toque longo grava. Alguns telemóveis cancelam o toque (pointercancel) ou abrem o menu de contexto
      // ao fim de meio segundo; por isso só se desiste se o dedo se mexer ou largar antes do tempo.
      let timer = null; let held = false; let start = null;
      const cancel = () => { clearTimeout(timer); timer = null; };
      b.addEventListener('pointerdown', (e) => {
        held = false; start = { x: e.clientX, y: e.clientY };
        cancel();
        timer = setTimeout(() => { timer = null; held = true; savePreset(i); }, 600);
      });
      // Se o dedo se mexe mais de 12 px é um deslize da página, não um toque longo.
      // Os eventos de toque continuam a chegar mesmo depois de o browser cancelar o ponteiro.
      const moved = (x, y) => { if (timer && start && Math.hypot(x - start.x, y - start.y) > 12) cancel(); };
      b.addEventListener('pointermove', (e) => moved(e.clientX, e.clientY));
      b.addEventListener('touchmove', (e) => { const t = e.touches[0]; if (t) moved(t.clientX, t.clientY); }, { passive: true });
      b.addEventListener('pointerup', () => { if (timer) cancel(); });
      b.addEventListener('contextmenu', (e) => e.preventDefault()); // não abrir o menu do browser
      b.addEventListener('click', () => {
        if (held) { held = false; return; }
        const p2 = state.presets[i];
        if (state.band !== p2.band) setBand(p2.band);
        state.vel = 0; state.target = p2.freq;
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

  // O visor é só ilustrativo: a agulha acompanha a estação, mas não se arrasta com o dedo
  // (arrastar o visor interferia com o deslizar da página). A sintonia faz-se no botão SINTONIA.
  const drag = null; // nunca há arrasto no visor

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

  // Ordem do dial: FM de baixo para cima, depois AM
  const pos = (x) => (x.band === 'AM' ? 10000 + x.freq : x.freq * 10);
  const step = (dir) => {
    const list = stations().slice().sort((x, y) => pos(x) - pos(y));
    if (!list.length) return;
    const cur = pos({ band: state.band, freq: state.target != null ? state.target : state.freq[state.band] });
    let st = dir > 0 ? list.find((x) => pos(x) > cur + 0.5) : list.slice().reverse().find((x) => pos(x) < cur - 0.5);
    if (!st) st = dir > 0 ? list[0] : list[list.length - 1];
    tuneTo(st, false);
  };
  // Sintonizar uma emissora (lista, setas do PRESET). Um toque na lista também liga o rádio.
  function tuneTo(st, powerOn) {
    if (state.band !== st.band) setBand(st.band);
    state.vel = 0; state.target = st.freq;
    if (powerOn && !state.on) setVolAngle(state.lastVolAngle);
  }

  // ---------- Lista de todas as emissoras ----------
  const norm = (t) => (t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  function renderList() {
    const q = norm(el.listq.value).trim();
    const all = stations().slice().sort((x, y) => pos(x) - pos(y));
    const shown = q ? all.filter((x) => norm(`${x.name} ${x.genre || ''}`).includes(q)) : all;
    el.listcount.textContent = q ? `(${shown.length} de ${all.length})` : `(${all.length})`;
    el.listul.innerHTML = '';
    if (!shown.length) {
      const li = document.createElement('li'); li.className = 'rf-listempty'; li.textContent = tr('Nenhuma emissora com esse nome ou género.');
      el.listul.appendChild(li); return;
    }
    const frag = document.createDocumentFragment();
    for (const st of shown) {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'rf-listitem';
      const f = document.createElement('span'); f.className = 'rf-listfreq'; f.textContent = st.band === 'AM' ? `${Math.round(st.freq)} AM` : `${Number(st.freq).toFixed(1)} FM`;
      const t = document.createElement('span'); t.className = 'rf-listtext';
      const n = document.createElement('b'); n.textContent = st.name;
      const g = document.createElement('small'); g.textContent = st.genre || '';
      t.append(n, g); b.append(f, t);
      b.addEventListener('click', () => { tuneTo(st, true); el.screen.scrollIntoView({ block: 'center', behavior: 'smooth' }); });
      b._st = st;
      li.appendChild(b); frag.appendChild(li);
    }
    el.listul.appendChild(frag);
    markCurrentInList();
  }
  function markCurrentInList() {
    for (const b of el.listul.querySelectorAll('.rf-listitem')) {
      const cur = b._st === state.station;
      b.classList.toggle('cur', cur);
      if (cur) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
    }
  }
  on(el.listbtn, 'click', () => {
    listOpen = el.listpanel.hidden;
    el.listpanel.hidden = !listOpen;
    el.listbtn.setAttribute('aria-expanded', String(listOpen));
    if (listOpen) { renderList(); el.listq.focus({ preventScroll: true }); }
  });
  on(el.listq, 'input', renderList);

  // ---------- Partilhar a emissora ----------
  const settledFreq = () => Number(state.freq[state.band].toFixed(band().digits));
  const shareLink = () => (opts.shareUrl ? opts.shareUrl(settledFreq(), state.band) : location.href);
  let shareTimer = null;
  const shareMsg = (t) => { el.sharemsg.textContent = t; clearTimeout(shareTimer); shareTimer = setTimeout(() => { el.sharemsg.textContent = ''; }, 4000); };
  on(el.sharebtn, 'click', async () => {
    const url = shareLink();
    const st = state.station || stationAt(state.band, state.freq[state.band]);
    const title = st ? `${st.name} · ${fmtFreq(st)}` : `${settledFreq()} ${band().unit}`;
    if (navigator.share) {
      try { await navigator.share({ title: `${tr('Rádio')} — ${title}`, text: tr('Ouve {x} no SteelDeck', { x: title }), url }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(url); shareMsg(tr('LINK COPIADO')); } catch (e) { shareMsg(`${tr('Copia o link:')} ${url}`); }
  });
  on(el.prev, 'click', () => step(-1));
  on(el.next, 'click', () => step(1));

  on(el.start, 'click', () => { el.start.hidden = true; if (!state.on) setVolAngle(state.lastVolAngle); });
  function updateStartLabel() {
    const st = stationAt(state.band, state.freq[state.band]);
    el.startlabel.textContent = st ? `\u25B6 ${tr('TOCA PARA OUVIR')} ${st.name.toUpperCase()}` : `\u25B6 ${tr('TOCA PARA LIGAR O RÁDIO')}`;
    el.startinfo.textContent = !online() ? tr('SEM SINAL — SEM LIGAÇÃO À INTERNET')
      : st ? `${fmtFreq(st)} · ${tr('o browser só deixa tocar som depois de um toque.')}` : tr('O browser só deixa tocar som depois de um toque.');
  }
  on(el.fm, 'click', () => setBand('FM'));
  on(el.am, 'click', () => setBand('AM'));

  on(el.addbtn, 'click', () => { el.panel.hidden = !el.panel.hidden; });
  on(el.form, 'submit', (e) => {
    e.preventDefault();
    const f = Math.round(parseFloat(el.nfreq.value.replace(',', '.')) * 10) / 10;
    const name = el.nname.value.trim(); const url = el.nurl.value.trim();
    let msg = '';
    if (!Number.isFinite(f) || f < 88 || f > 108) msg = tr('Frequência entre 88.0 e 108.0 MHz.');
    else if (!name) msg = tr('Falta o nome.');
    else if (!/^https:\/\/\S+$/i.test(url)) msg = tr('O URL tem de começar por https://');
    else if (stations().some((s) => s.band === 'FM' && Math.abs(s.freq - f) < 0.35)) msg = tr('Já existe uma estação junto a essa frequência.');
    if (msg) { el.msg.textContent = msg; return; }
    state.custom.push({ band: 'FM', freq: f, name: name.slice(0, 40), url, genre: '' });
    save('rf_custom', state.custom);
    el.form.reset(); el.msg.textContent = `${tr('Guardada em')} ${f.toFixed(1)} MHz.`;
    renderCustom(); needsDraw = true;
  });

  on(window, 'resize', resize);
  // Relógio: hora local do dispositivo, atualizada a cada segundo
  const tick = () => {
    const d = new Date();
    el.clock.textContent = d.toLocaleTimeString(locale(), { hour12: false });
    el.date.textContent = d.toLocaleDateString(locale(), { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).replace(/\./g, '').toUpperCase();
  };
  tick();
  const clockTimer = setInterval(tick, 1000);
  // Quando o tema muda, o mostrador tem de ser redesenhado com as cores novas
  const themeWatch = new MutationObserver(() => { needsDraw = true; });
  themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'data-pb'] });
  on(window, 'online', () => {
    updateStartLabel();
    if (!state.on) return;
    if (state.station && state.status !== 'live') { retryDelay = 3000; startStream(state.station); } else if (!state.station) { setStatus('static'); showIdle(); }
  });
  on(window, 'offline', () => {
    updateStartLabel();
    if (!state.on) return;
    stopStream(); setStatus('nonet'); if (!state.station) showIdle();
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { needsDraw = true; });

  // ---------- Ciclo ----------
  let raf = 0; let lastT = performance.now(); let lastTuneKey = '';
  function frame(now) {
    if (destroyed) return;
    const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    if (state.target != null) {
      const cur = state.freq[state.band];
      const diff = state.target - cur;
      if (Math.abs(diff) < band().step * 0.04) { setFreq(state.target); state.target = null; } else setFreq(cur + diff * Math.min(1, dt * 7));
    } else if (!drag && Math.abs(state.vel) > band().step * 0.05) {
      setFreq(state.freq[state.band] + state.vel * dt, true);
      state.vel *= Math.exp(-4.5 * dt);
    } else if (!drag) state.vel = 0;
    updateAudio();
    if (needsDraw) { drawDial(); needsDraw = false; }
    // Endereço partilhável: só quando a sintonia assenta, e só se mudou
    if (!drag && state.target == null && state.vel === 0) {
      const key = `${state.band}|${settledFreq()}`;
      if (key !== lastTuneKey) { lastTuneKey = key; if (opts.onTune) opts.onTune(settledFreq(), state.band); if (!state.on) updateStartLabel(); }
    }
    raf = requestAnimationFrame(frame);
  }

  el.volcap.innerHTML = gearSvg('rgb(var(--c))'); el.tunecap.innerHTML = gearSvg('rgb(var(--c))');
  renderPresets(); renderCustom();
  setBand(state.band); setVolAngle(-135);
  lastTuneKey = `${state.band}|${settledFreq()}`; // não mexer no endereço ao abrir
  updateStartLabel();
  resize();
  raf = requestAnimationFrame(frame);

  // Comandos do menu ≡ (aba RÁDIO): ligar/desligar, emissora seguinte/anterior e fluxo de áudio para gravar
  const onRemote = (e) => {
    const cmd = e.detail && (e.detail.cmd || e.detail);
    if (cmd === 'toggle') { if (state.on) setVolAngle(-135); else { el.start.hidden = true; setVolAngle(state.lastVolAngle); } }
    else if (cmd === 'next' || cmd === 'prev') {
      if (!state.on) { el.start.hidden = true; setVolAngle(state.lastVolAngle); }
      step(cmd === 'next' ? 1 : -1);
    } else if (cmd === 'state') reportState();
    else if (cmd === 'capture' && typeof e.detail.reply === 'function') {
      // fluxo do leitor (só tem som se a emissora permitir; senão quem grava usa o microfone)
      let stream = null;
      try { if (loadedUrl && state.on) stream = (audio.captureStream || audio.mozCaptureStream).call(audio); } catch (err) { stream = null; }
      e.detail.reply(stream, state.station ? state.station.name : '');
    }
  };
  window.addEventListener('steeldeck:radio-cmd', onRemote);
  offs.push(() => window.removeEventListener('steeldeck:radio-cmd', onRemote));
  setTimeout(reportState, 0);

  // a música começou a tocar: desligar o rádio (volume a zero, como se fosse rodado à mão)
  const onOtherAudio = (e) => { if (e.detail !== 'radio' && state.on) setVolAngle(-135); };
  window.addEventListener('pb-audio-start', onOtherAudio);
  offs.push(() => window.removeEventListener('pb-audio-start', onOtherAudio));

  return function destroy() {
    destroyed = true;
    if (announced) announce(false);
    cancelAnimationFrame(raf);
    clearInterval(clockTimer); clearTimeout(shareTimer); clearTimeout(noteTimer); themeWatch.disconnect();
    offs.forEach((f) => f());
    stopStream();
    if (ctx) ctx.close().catch(() => {});
    root.innerHTML = '';
  };
}
