// Leitor de músicas do dispositivo (offline). JavaScript puro: os ficheiros são lidos
// localmente pelo elemento <audio> e guardados no próprio browser (IndexedDB). Nada é enviado para fora.

const BLOCKS = 28;
const ARM_REST = 0; // graus: braço no descanso, fora do disco
const ARM_START = 25; // pousado no sulco exterior
const ARM_END = 40; // perto da etiqueta, no fim da faixa

function grooves() {
  let s = '';
  for (let r = 92; r >= 44; r -= 6) s += `<circle class="st thin" cx="130" cy="135" r="${r}"/>`;
  return s;
}

const TEMPLATE = `
<div class="vp-head"><h2>Música local</h2><span data-vp="count">0 faixas</span></div>
<div class="vp-grid">
  <div class="vp-box vp-deck">
    <svg viewBox="0 0 320 262" role="img" aria-label="Gira-discos">
      <rect class="st fillbg" x="8" y="14" width="304" height="240" rx="14"/>
      <circle class="st" cx="130" cy="135" r="106"/>
      <g class="vp-disc">
        <circle class="st fillbg" cx="130" cy="135" r="100"/>
        ${grooves()}
        <path class="st" d="M130 41a94 94 0 0 1 66 27" opacity=".9"/>
        <path class="st" d="M130 229a94 94 0 0 1-66-27" opacity=".9"/>
        <path class="st thin" d="M58 135a72 72 0 0 1 21-51"/>
        <path class="st thin" d="M202 135a72 72 0 0 1-21 51"/>
        <circle class="st" cx="130" cy="135" r="34"/>
        <path class="st" d="M108 127h44M112 143h36"/>
        <path class="st thin" d="M130 104v10M130 156v10"/>
        <circle cx="130" cy="135" r="3.5" style="fill:rgb(var(--c))"/>
      </g>
      <g class="vp-arm" data-vp="arm">
        <path class="st" d="M270 50V168" stroke-width="3.2"/>
        <path class="st fillbg" d="M262 168h16l-2 26h-12z"/>
        <path class="st thin" d="M266 176h8M266 184h8"/>
        <rect class="st fillbg" x="262" y="20" width="16" height="16" rx="2"/>
      </g>
      <circle class="st fillbg" cx="270" cy="50" r="13"/>
      <circle cx="270" cy="50" r="4" style="fill:rgb(var(--c))"/>
      <path class="st" d="M286 196v8" stroke-width="5" opacity=".6"/>
      <circle class="st" cx="34" cy="232" r="9"/><circle class="st" cx="62" cy="232" r="9"/>
      <rect class="st" x="244" y="222" width="52" height="18" rx="3"/>
      <path class="st thin" d="M252 231h36"/>
      <path class="vp-note n1" d="M40 70v-18l12-3v16a5 4 0 1 1-2-3v-9l-8 2v14a5 4 0 1 1-2-3z"/>
      <path class="vp-note n2" d="M228 30v-14l9-2v13a4 3 0 1 1-2-2.500v-7l-5 1v11a4 3 0 1 1-2-2.500z"/>
      <path class="vp-note n3" d="M22 150v-12l8-2v11a3.500 3 0 1 1-2-2v-6l-4 1v9a3.500 3 0 1 1-2-2z"/>
    </svg>
    <div class="vp-now" data-vp="now">Modo offline<b data-vp="nowname">Adiciona músicas para começar</b>
      <div class="vp-levels" aria-hidden="true">${'<i></i>'.repeat(24)}</div>
    </div>
  </div>
  <div class="vp-box">
    <label class="vp-addbtn">[ + Adicionar músicas do dispositivo ]
      <input id="vp-files" data-vp="files" type="file" multiple accept="audio/*,.mp3,.wav,.ogg,.m4a" />
    </label>
    <p class="vp-note-txt">MP3, WAV, OGG ou M4A. As músicas ficam só neste dispositivo e tocam sem internet.</p>
    <ul class="vp-list" data-vp="list" hidden></ul>
    <div class="vp-empty" data-vp="empty">&gt; Lista vazia_</div>
    <div class="vp-prog" data-vp="prog" role="slider" tabindex="0" aria-label="Progresso da faixa" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">${'<i></i>'.repeat(BLOCKS)}</div>
    <div class="vp-time"><span data-vp="cur">0:00</span><span data-vp="dur">0:00</span></div>
    <div class="vp-ctrl">
      <button type="button" data-vp="play">[ PLAY ]</button>
      <button type="button" data-vp="pause">[ PAUSE ]</button>
      <button type="button" data-vp="prev">[ ANTERIOR ]</button>
      <button type="button" data-vp="next">[ PRÓXIMA ]</button>
      <button type="button" class="wide" data-vp="stop">[ STOP ]</button>
    </div>
    <div class="vp-clock">HORA ATUAL: <b data-vp="clock">--:--:--</b></div>
    <div class="vp-msg" data-vp="msg" role="status"></div>
  </div>
</div>`;

// ---- armazenamento local (IndexedDB), para a lista sobreviver a recarregar a página ----
function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('pipboy_music', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('tracks', { keyPath: 'id', autoIncrement: true });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function tx(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction('tracks', mode);
    const req = fn(t.objectStore('tracks'));
    t.oncomplete = () => resolve(req && req.result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

const fmt = (s) => { if (!Number.isFinite(s)) return '0:00'; const m = Math.floor(s / 60); return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`; };
const isAudio = (f) => /^audio\//.test(f.type) || /\.(mp3|wav|ogg|oga|m4a|aac|flac)$/i.test(f.name);

export function mountVinylPlayer(root) {
  root.classList.add('vp-root');
  root.innerHTML = TEMPLATE;
  const el = {};
  root.querySelectorAll('[data-vp]').forEach((n) => { el[n.dataset.vp] = n; });
  const blocks = [...el.prog.children];

  const audio = new Audio();
  audio.preload = 'metadata';
  let tracks = []; // { id, name, url }
  let current = -1;
  let db = null;
  let destroyed = false;

  const say = (t) => { el.msg.textContent = t || ''; };
  const playing = () => !audio.paused && !audio.ended && current >= 0;

  function renderList() {
    el.count.textContent = `${tracks.length} ${tracks.length === 1 ? 'faixa' : 'faixas'}`;
    el.list.hidden = !tracks.length; el.empty.hidden = !!tracks.length;
    el.list.innerHTML = '';
    tracks.forEach((t, i) => {
      const li = document.createElement('li');
      if (i === current) li.className = 'sel';
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'vp-track';
      b.textContent = `${i === current && playing() ? '▶ ' : ''}${t.name}`;
      b.addEventListener('click', () => select(i, true));
      const d = document.createElement('button');
      d.type = 'button'; d.className = 'vp-del'; d.textContent = '✕'; d.setAttribute('aria-label', `Remover ${t.name}`);
      d.addEventListener('click', () => removeTrack(i));
      li.append(b, d); el.list.appendChild(li);
    });
    const none = !tracks.length;
    for (const k of ['play', 'pause', 'prev', 'next', 'stop']) el[k].disabled = none;
  }

  function renderState() {
    const on = playing();
    root.classList.toggle('vp-playing', on);
    el.play.classList.toggle('act', on);
    el.pause.classList.toggle('act', !on && current >= 0 && audio.currentTime > 0);
    const t = tracks[current];
    el.now.firstChild.textContent = on ? 'A tocar:' : (t ? 'Em pausa — prime PLAY' : 'Modo offline');
    el.nowname.textContent = t ? t.name : 'Adiciona músicas para começar';
    renderProgress();
    // marca ▶ na faixa a tocar sem redesenhar a lista toda
    [...el.list.children].forEach((li, i) => {
      li.classList.toggle('sel', i === current);
      const b = li.firstChild; const name = tracks[i]?.name || '';
      const txt = `${i === current && on ? '▶ ' : ''}${name}`;
      if (b.textContent !== txt) b.textContent = txt;
    });
  }

  function renderProgress() {
    const d = audio.duration; const c = audio.currentTime || 0;
    const p = Number.isFinite(d) && d > 0 ? c / d : 0;
    const n = Math.round(p * BLOCKS);
    blocks.forEach((b, i) => b.classList.toggle('on', i < n));
    el.cur.textContent = fmt(c); el.dur.textContent = fmt(d);
    el.prog.setAttribute('aria-valuenow', Math.round(p * 100));
    // braço: no descanso quando parado; no sulco exterior ao tocar, avançando para o centro com a faixa
    const angle = playing() ? ARM_START + (ARM_END - ARM_START) * p : ARM_REST;
    el.arm.style.transform = `rotate(${angle.toFixed(2)}deg)`;
  }

  function select(i, autoplay) {
    if (i < 0 || i >= tracks.length) return;
    current = i;
    audio.src = tracks[i].url;
    say('');
    if (autoplay) play(); else renderState();
  }
  function play() {
    if (!tracks.length) return;
    if (current < 0) { select(0, true); return; }
    audio.play().catch(() => { say('Não foi possível tocar esta faixa.'); renderState(); });
  }
  function pause() { audio.pause(); }
  function stop() { audio.pause(); try { audio.currentTime = 0; } catch (e) { /* sem faixa */ } renderState(); }
  function next(auto) {
    if (!tracks.length) return;
    select((current + 1) % tracks.length, auto === true || playing() || audio.ended);
  }
  function prev() {
    if (!tracks.length) return;
    if (audio.currentTime > 3) { audio.currentTime = 0; return; } // volta ao início da faixa
    select((current - 1 + tracks.length) % tracks.length, playing());
  }

  async function addFiles(fileList) {
    const files = [...(fileList || [])];
    const good = files.filter(isAudio);
    const bad = files.length - good.length;
    for (const f of good) {
      let id = null;
      try { if (db) id = await tx(db, 'readwrite', (s) => s.add({ name: f.name, blob: f })); } catch (e) { id = null; }
      tracks.push({ id, name: f.name.replace(/\.[^.]+$/, ''), url: URL.createObjectURL(f) });
    }
    renderList();
    if (current < 0 && tracks.length) select(0, false);
    renderState();
    say(good.length ? `${good.length} ${good.length === 1 ? 'faixa adicionada' : 'faixas adicionadas'}${bad ? ` · ${bad} ficheiro(s) ignorado(s) por não serem áudio` : ''}.` : (bad ? 'Esses ficheiros não são de áudio.' : ''));
    el.files.value = '';
  }

  function removeTrack(i) {
    const t = tracks[i];
    if (!t) return;
    const wasCurrent = i === current;
    if (wasCurrent) { audio.pause(); audio.removeAttribute('src'); audio.load(); }
    URL.revokeObjectURL(t.url);
    if (db && t.id != null) tx(db, 'readwrite', (s) => s.delete(t.id)).catch(() => {});
    tracks.splice(i, 1);
    if (wasCurrent) current = -1; else if (i < current) current--;
    renderList();
    if (wasCurrent && tracks.length) select(Math.min(i, tracks.length - 1), false);
    renderState();
  }

  // ---- eventos ----
  const offs = [];
  const on = (t, type, fn, opts) => { t.addEventListener(type, fn, opts); offs.push(() => t.removeEventListener(type, fn, opts)); };
  on(el.files, 'change', () => addFiles(el.files.files));
  on(el.play, 'click', play);
  on(el.pause, 'click', pause);
  on(el.stop, 'click', stop);
  on(el.next, 'click', () => next());
  on(el.prev, 'click', prev);
  for (const ev of ['play', 'playing', 'pause', 'loadedmetadata', 'emptied']) on(audio, ev, renderState);
  on(audio, 'timeupdate', renderProgress);
  on(audio, 'ended', () => { if (tracks.length > 1) next(true); else stop(); });
  on(audio, 'error', () => { if (current >= 0 && audio.getAttribute('src')) { say('Este ficheiro não pôde ser lido pelo browser.'); renderState(); } });

  const seekAt = (e) => {
    const d = audio.duration; if (!Number.isFinite(d) || d <= 0) return;
    const r = el.prog.getBoundingClientRect();
    audio.currentTime = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * d;
    renderProgress();
  };
  let seeking = false;
  on(el.prog, 'pointerdown', (e) => { seeking = true; el.prog.setPointerCapture(e.pointerId); seekAt(e); });
  on(el.prog, 'pointermove', (e) => { if (seeking) seekAt(e); });
  on(el.prog, 'pointerup', () => { seeking = false; });
  on(el.prog, 'pointercancel', () => { seeking = false; });
  on(el.prog, 'keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 5); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); audio.currentTime = Math.max(0, audio.currentTime - 5); }
  });

  // Relógio: hora local do dispositivo, a cada segundo
  const tick = () => { el.clock.textContent = new Date().toLocaleTimeString('pt-PT', { hour12: false }); };
  tick();
  const clockTimer = setInterval(tick, 1000);

  // ---- carregar a lista guardada ----
  renderList(); renderState();
  (async () => {
    try {
      db = await openDb();
      const saved = await tx(db, 'readonly', (s) => s.getAll());
      if (destroyed || !saved || !saved.length) return;
      tracks = saved.map((r) => ({ id: r.id, name: r.name.replace(/\.[^.]+$/, ''), url: URL.createObjectURL(r.blob) })).concat(tracks);
      renderList();
      if (current < 0) select(0, false);
      renderState();
    } catch (e) { db = null; /* sem IndexedDB: a lista dura até fechar a página */ }
  })();

  return function destroy() {
    destroyed = true;
    clearInterval(clockTimer);
    offs.forEach((f) => f());
    audio.pause(); audio.removeAttribute('src'); audio.load();
    tracks.forEach((t) => URL.revokeObjectURL(t.url));
    if (db) db.close();
    root.innerHTML = '';
  };
}
