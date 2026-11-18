// Guerra das Eras — som 8-bit gerado no browser (Web Audio), sem ficheiros: funciona sem internet.
// Música chiptune com ondas de pulso, efeitos por tropa e era, e um som próprio para cada ataque especial.
// O áudio só arranca depois de um toque (regra dos browsers): o primeiro clique no menu ou no jogo liga-o.

const PREFS_KEY = 'pb_erawar_audio';
const prefs = (() => { try { return { music: true, sfx: true, ...JSON.parse(localStorage.getItem(PREFS_KEY)) }; } catch { return { music: true, sfx: true }; } })();
const savePrefs = () => { try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* sem armazenamento */ } };

let ctx = null; let master = null; let musicBus = null; let sfxBus = null; let noiseBuf = null; const pulses = {};
const midi = (n) => 440 * 2 ** ((n - 69) / 12);

function init() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return true; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = 0.8;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
  master.connect(comp).connect(ctx.destination);
  musicBus = ctx.createGain(); musicBus.gain.value = prefs.music ? 0.32 : 0; musicBus.connect(master);
  sfxBus = ctx.createGain(); sfxBus.gain.value = prefs.sfx ? 0.62 : 0; sfxBus.connect(master);
  // ruído branco (explosões, tambores, vento)
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  // ondas de pulso de 12,5%, 25% e 50%, o som típico das consolas de 8 bits
  for (const duty of [0.125, 0.25, 0.5]) {
    const n = 32; const re = new Float32Array(n); const im = new Float32Array(n);
    for (let k = 1; k < n; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
    pulses[duty] = ctx.createPeriodicWave(re, im);
  }
  return true;
}
export function unlock() { return init(); }

// ---------- Blocos de som ----------
function out(bus, pan) {
  if (pan == null || !ctx.createStereoPanner) return bus;
  const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); p.connect(bus); return p;
}
// nota com envelope: tipo 'pulse12' | 'pulse25' | 'square' | 'triangle' | 'sawtooth' | 'sine'
function tone({ t = 0, f = 440, f2 = null, dur = 0.12, type = 'square', vol = 0.3, bus = 'sfx', pan = null, attack = 0.004, vib = 0 }) {
  if (!ctx) return;
  const at = ctx.currentTime + t;
  const o = ctx.createOscillator();
  if (type.startsWith('pulse')) o.setPeriodicWave(pulses[type === 'pulse12' ? 0.125 : 0.25]); else o.type = type;
  o.frequency.setValueAtTime(f, at);
  if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), at + dur);
  let lfo = null;
  if (vib) { lfo = ctx.createOscillator(); const lg = ctx.createGain(); lfo.frequency.value = 7; lg.gain.value = vib; lfo.connect(lg).connect(o.frequency); lfo.start(at); lfo.stop(at + dur + 0.05); }
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + attack); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(out(bus === 'music' ? musicBus : sfxBus, pan));
  o.start(at); o.stop(at + dur + 0.02);
}
// ruído filtrado: explosões, tiros, vento, tambores
function noise({ t = 0, dur = 0.2, vol = 0.3, freq = 1200, freq2 = null, q = 0.8, type = 'lowpass', bus = 'sfx', pan = null, attack = 0.003 }) {
  if (!ctx) return;
  const at = ctx.currentTime + t;
  const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
  const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(freq, at); fl.Q.value = q;
  if (freq2) fl.frequency.exponentialRampToValueAtTime(Math.max(30, freq2), at + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + attack); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(fl).connect(g).connect(out(bus === 'music' ? musicBus : sfxBus, pan));
  src.start(at, Math.random() * 0.5); src.stop(at + dur + 0.02);
}
const boom = (t, size = 1, pan = null) => { noise({ t, dur: 0.35 * size + 0.1, vol: 0.5 * Math.min(1, size), freq: 900, freq2: 60, pan }); tone({ t, f: 110 * (1.4 - size * 0.3), f2: 35, dur: 0.3 * size + 0.1, type: 'sine', vol: 0.45, pan }); };

// ---------- Limite de repetição (num combate há dezenas de golpes por segundo) ----------
const lastAt = {};
function throttled(key, gapMs) {
  const now = performance.now();
  if (lastAt[key] && now - lastAt[key] < gapMs) return true;
  lastAt[key] = now; return false;
}
const ok = () => ctx && prefs.sfx && ctx.state === 'running';

// ---------- Sons da interface ----------
export const ui = {
  select() { if (!init() || !prefs.sfx) return; tone({ f: 1320, dur: 0.05, type: 'pulse25', vol: 0.18 }); },
  confirm() { if (!init() || !prefs.sfx) return; tone({ f: 660, dur: 0.07, type: 'pulse25', vol: 0.2 }); tone({ t: 0.07, f: 990, dur: 0.1, type: 'pulse25', vol: 0.2 }); },
  back() { if (!init() || !prefs.sfx) return; tone({ f: 660, dur: 0.06, type: 'pulse25', vol: 0.18 }); tone({ t: 0.06, f: 440, dur: 0.09, type: 'pulse25', vol: 0.18 }); },
  error() { if (!init() || !prefs.sfx) return; if (throttled('err', 150)) return; tone({ f: 140, dur: 0.14, type: 'square', vol: 0.18 }); tone({ t: 0.05, f: 120, dur: 0.14, type: 'square', vol: 0.15 }); },
  coin() { if (!ok()) return; tone({ f: 988, dur: 0.05, type: 'pulse25', vol: 0.16 }); tone({ t: 0.05, f: 1319, dur: 0.12, type: 'pulse25', vol: 0.16 }); },
  start() { if (!init() || !prefs.sfx) return; [523, 659, 784, 1047].forEach((f, i) => tone({ t: i * 0.08, f, dur: 0.12, type: 'pulse25', vol: 0.2 })); },
  pause() { if (!ok()) return; tone({ f: 880, dur: 0.08, type: 'pulse12', vol: 0.18 }); tone({ t: 0.09, f: 587, dur: 0.12, type: 'pulse12', vol: 0.18 }); },
};

// ---------- Sons do combate ----------
const panOf = (x) => (x == null ? null : (x / 480) * 1.6 - 0.8);
// ataque de uma unidade: um som por era e tipo (0 corpo a corpo, 1 à distância, 2 pesada)
export function attack(era, type, x) {
  if (!ok() || throttled(`a${era}${type}`, type === 2 ? 140 : 70)) return;
  const pan = panOf(x);
  if (type === 0) { // golpes
    if (era === 0) { noise({ dur: 0.06, vol: 0.22, freq: 500, pan }); tone({ f: 180, f2: 90, dur: 0.06, type: 'triangle', vol: 0.2, pan }); } // moca
    else if (era <= 2) { noise({ dur: 0.05, vol: 0.18, freq: 4000, type: 'bandpass', q: 6, pan }); tone({ f: 1800, f2: 900, dur: 0.07, type: 'pulse12', vol: 0.1, pan }); } // metal
    else if (era === 3) { noise({ dur: 0.04, vol: 0.15, freq: 2500, type: 'bandpass', q: 3, pan }); } // faca
    else { tone({ f: 1400, f2: 300, dur: 0.1, type: 'sawtooth', vol: 0.12, pan }); } // lâmina de energia
  } else if (type === 1) { // disparos
    if (era === 0) noise({ dur: 0.12, vol: 0.15, freq: 900, freq2: 2500, type: 'bandpass', q: 2, pan }); // funda a zunir
    else if (era === 1) tone({ f: 600, f2: 180, dur: 0.12, type: 'triangle', vol: 0.22, pan }); // corda do arco
    else if (era === 2) { noise({ dur: 0.18, vol: 0.32, freq: 1500, freq2: 300, pan }); tone({ f: 90, f2: 50, dur: 0.12, type: 'sine', vol: 0.25, pan }); } // mosquete
    else if (era === 3) noise({ dur: 0.07, vol: 0.28, freq: 3000, freq2: 800, pan }); // espingarda
    else tone({ f: 2200, f2: 400, dur: 0.14, type: 'pulse12', vol: 0.15, pan }); // laser
  } else { // pesadas
    if (era === 0) tone({ f: 120, f2: 70, dur: 0.35, type: 'sawtooth', vol: 0.25, pan, vib: 18 }); // rugido de dino
    else if (era === 1) { tone({ f: 700, f2: 400, dur: 0.18, type: 'pulse25', vol: 0.12, pan, vib: 40 }); noise({ t: 0.05, dur: 0.06, vol: 0.18, freq: 3500, type: 'bandpass', q: 5, pan }); } // relincho + lança
    else if (era === 2) boom(0, 0.8, pan); // canhão
    else if (era === 3) { boom(0, 0.9, pan); noise({ t: 0.02, dur: 0.1, vol: 0.2, freq: 5000, type: 'highpass', pan }); } // tanque
    else { tone({ f: 1600, f2: 120, dur: 0.3, type: 'sawtooth', vol: 0.18, pan }); tone({ f: 800, f2: 60, dur: 0.35, type: 'pulse25', vol: 0.15, pan }); } // tanque laser
  }
}
export function turret(era, x) {
  if (!ok() || throttled(`t${era}`, 160)) return;
  const pan = panOf(x);
  if (era === 0) tone({ f: 300, f2: 120, dur: 0.1, type: 'triangle', vol: 0.15, pan });
  else if (era === 1) tone({ f: 500, f2: 150, dur: 0.12, type: 'triangle', vol: 0.18, pan });
  else if (era === 2) boom(0, 0.5, pan);
  else if (era === 3) [0, 0.05, 0.1].forEach((t) => noise({ t, dur: 0.04, vol: 0.2, freq: 3000, pan }));
  else tone({ f: 1800, f2: 200, dur: 0.2, type: 'pulse12', vol: 0.14, pan });
}
export function death(type, side, x) {
  if (!ok() || throttled(`d${side}`, 90)) return;
  const pan = panOf(x);
  if (type === 2) boom(0, 0.7, pan);
  else tone({ f: side === 1 ? 660 : 330, f2: side === 1 ? 220 : 110, dur: 0.16, type: 'pulse25', vol: 0.12, pan });
}
export function baseHit(side) {
  if (!ok() || throttled(`b${side}`, 350)) return;
  noise({ dur: 0.2, vol: 0.28, freq: 400, freq2: 80, pan: side === 0 ? -0.8 : 0.8 });
  if (side === 0) tone({ f: 220, f2: 110, dur: 0.18, type: 'square', vol: 0.12, pan: -0.8 }); // aviso: a minha base
}
export function trained() { if (!ok() || throttled('spawn', 120)) return; tone({ f: 440, dur: 0.04, type: 'pulse12', vol: 0.1 }); tone({ t: 0.04, f: 660, dur: 0.06, type: 'pulse12', vol: 0.1 }); }

// ---------- Ataques especiais: um som próprio para cada era ----------
export function specialSfx(kind, side) {
  if (!ok()) return;
  const pan = side === 0 ? 0.35 : -0.35; // cai do lado do adversário
  if (kind === 'meteor') { // ronco do céu, assobios a cair e impactos
    noise({ dur: 2.2, vol: 0.25, freq: 120, freq2: 300, attack: 0.6 });
    for (let i = 0; i < 6; i++) { tone({ t: 0.2 + i * 0.22, f: 1600, f2: 200, dur: 0.6, type: 'sine', vol: 0.12, pan }); boom(0.8 + i * 0.22, 1, pan + (Math.random() - 0.5) * 0.6); }
  } else if (kind === 'arrows') { // dezenas de cordas e flechas a assobiar
    for (let i = 0; i < 10; i++) tone({ t: i * 0.035, f: 700 + Math.random() * 200, f2: 200, dur: 0.1, type: 'triangle', vol: 0.12, pan: -pan });
    for (let i = 0; i < 12; i++) noise({ t: 0.3 + i * 0.06, dur: 0.25, vol: 0.12, freq: 2500, freq2: 6000, type: 'bandpass', q: 4, pan });
    for (let i = 0; i < 8; i++) noise({ t: 1.0 + i * 0.07, dur: 0.05, vol: 0.18, freq: 1500, type: 'bandpass', q: 3, pan });
  } else if (kind === 'shells') { // tiros de artilharia ao longe, assobio descendente e barragem
    for (let i = 0; i < 4; i++) boom(i * 0.15, 0.6, -pan);
    for (let i = 0; i < 6; i++) { tone({ t: 0.5 + i * 0.18, f: 2000, f2: 400, dur: 0.7, type: 'sine', vol: 0.1, pan }); boom(1.1 + i * 0.18, 1.1, pan); }
  } else if (kind === 'bombs') { // motor do avião a passar, bombas a cair e explosões
    tone({ f: 70, f2: 95, dur: 2.6, type: 'sawtooth', vol: 0.12, vib: 4, attack: 0.5 });
    noise({ dur: 2.6, vol: 0.12, freq: 300, attack: 0.5 });
    for (let i = 0; i < 6; i++) { tone({ t: 0.7 + i * 0.2, f: 1500, f2: 250, dur: 0.65, type: 'pulse12', vol: 0.07, pan }); boom(1.3 + i * 0.2, 1.2, pan); }
  } else if (kind === 'laser') { // carga a subir, disparo orbital e crepitar
    tone({ f: 120, f2: 2400, dur: 0.6, type: 'sawtooth', vol: 0.16, attack: 0.3 });
    tone({ f: 240, f2: 4800, dur: 0.6, type: 'pulse12', vol: 0.08, attack: 0.3 });
    for (let i = 0; i < 5; i++) { tone({ t: 0.6 + i * 0.08, f: 3000, f2: 80, dur: 0.45, type: 'square', vol: 0.14, pan }); noise({ t: 0.6 + i * 0.08, dur: 0.5, vol: 0.2, freq: 6000, freq2: 300, type: 'bandpass', q: 1, pan }); }
    boom(0.75, 1.3, pan);
  }
}
export function evolveSfx(mine) {
  if (!ok()) return;
  const notes = mine ? [60, 64, 67, 72, 76, 79, 84] : [64, 63, 59, 56];
  notes.forEach((n, i) => tone({ t: i * 0.09, f: midi(n), dur: 0.16, type: 'pulse25', vol: 0.18 }));
}

// ---------- Música chiptune ----------
// Duas peças: o tema do menu e o tema de batalha. A de batalha muda de tom, ritmo e timbre com a era
// e fica mais tensa quando a tua base está fraca ou começa o cerco.
const A = null; // pausa
const MENU = {
  bpm: 92,
  lead: [69, A, 72, A, 76, A, 74, 72, 71, A, 67, A, 69, A, A, A, 65, A, 69, A, 72, A, 71, 69, 67, A, 64, A, 67, A, A, A],
  bass: [45, A, A, A, 45, A, A, A, 41, A, A, A, 41, A, A, A, 43, A, A, A, 43, A, A, A, 40, A, A, A, 40, A, A, A],
  arp: [57, 60, 64, 60], drums: 'k...h...s...h...k...h...s...h.h.',
};
const BATTLE = {
  bpm: 132,
  lead: [69, A, 69, 72, 76, A, 74, 72, 74, A, 71, A, 67, A, 69, 71, 72, A, 72, 76, 79, A, 77, 76, 74, A, 72, A, 71, A, 67, A,
    65, A, 65, 69, 72, A, 71, 69, 67, A, 69, A, 71, A, 72, 74, 76, A, 74, 72, 71, A, 67, 69, 64, A, A, A, 64, 67, 69, A],
  bass: [45, 45, 57, 45, 45, 45, 57, 45, 41, 41, 53, 41, 41, 41, 53, 41, 48, 48, 60, 48, 48, 48, 60, 48, 43, 43, 55, 43, 43, 43, 55, 43,
    45, 45, 57, 45, 45, 45, 57, 45, 41, 41, 53, 41, 41, 41, 53, 41, 43, 43, 55, 43, 43, 43, 55, 43, 40, 40, 52, 40, 44, 44, 56, 44],
  drums: 'k.h.s.h.k.k.s.h.k.h.s.h.k.hks.hh',
};
const ERA_MUSIC = [ // transposição, ritmo e timbre do solo por era
  { tr: 0, bpm: 0, lead: 'triangle' }, { tr: 2, bpm: 6, lead: 'pulse25' }, { tr: -2, bpm: 12, lead: 'pulse25' },
  { tr: 3, bpm: 18, lead: 'pulse12' }, { tr: 5, bpm: 26, lead: 'sawtooth' },
];
let seq = null;
function drum(ch, t) {
  if (ch === 'k') { tone({ t, f: 150, f2: 45, dur: 0.12, type: 'sine', vol: 0.5, bus: 'music' }); }
  else if (ch === 's') noise({ t, dur: 0.1, vol: 0.22, freq: 2000, type: 'bandpass', q: 0.7, bus: 'music' });
  else if (ch === 'h') noise({ t, dur: 0.03, vol: 0.08, freq: 7000, type: 'highpass', bus: 'music' });
}
export function playMusic(which = 'menu', era = 0) {
  if (!init()) return;
  const same = seq && seq.which === which;
  if (same) { seq.era = era; return; }
  stopMusic();
  seq = { which, era, step: 0, next: ctx.currentTime + 0.08, tense: false, timer: null };
  const tick = () => {
    if (!seq || !ctx) return;
    const song = seq.which === 'menu' ? MENU : BATTLE;
    const em = seq.which === 'menu' ? ERA_MUSIC[0] : ERA_MUSIC[seq.era] || ERA_MUSIC[0];
    const bpm = song.bpm + em.bpm + (seq.tense ? 10 : 0);
    const stepDur = 60 / bpm / 4; // semicolcheias
    while (seq.next < ctx.currentTime + 0.15) {
      const i = seq.step; const t = seq.next - ctx.currentTime;
      if (prefs.music) {
        const n = song.lead[i % song.lead.length];
        if (n != null) tone({ t, f: midi(n + em.tr), dur: stepDur * 1.8, type: em.lead, vol: 0.13, bus: 'music', vib: seq.which === 'menu' ? 3 : 0 });
        const b = song.bass[i % song.bass.length];
        if (b != null) tone({ t, f: midi(b + em.tr - (seq.which === 'menu' ? 0 : 12)), dur: stepDur * 0.9, type: 'triangle', vol: 0.32, bus: 'music' });
        if (song.arp && i % 2 === 0) tone({ t, f: midi(song.arp[(i / 2) % song.arp.length] + 12), dur: stepDur * 0.8, type: 'pulse12', vol: 0.05, bus: 'music' });
        drum(song.drums[i % song.drums.length], t);
        if (seq.tense && i % 8 === 0) tone({ t, f: midi(81 + em.tr), dur: stepDur, type: 'pulse12', vol: 0.05, bus: 'music' }); // alarme discreto
      }
      seq.step += 1; seq.next += stepDur;
    }
  };
  seq.timer = setInterval(tick, 25);
  tick();
}
export function setMusicEra(era) { if (seq) seq.era = era; }
export function setTension(on) { if (seq) seq.tense = !!on; }
export function stopMusic() { if (seq) { clearInterval(seq.timer); seq = null; } }
export function jingle(won) {
  if (!init()) return;
  stopMusic();
  const notes = won ? [[60, 0], [64, 0.12], [67, 0.24], [72, 0.36], [67, 0.6], [72, 0.72], [76, 0.84], [79, 1.1]] : [[67, 0], [66, 0.25], [65, 0.5], [64, 0.75], [52, 1.05]];
  for (const [n, t] of notes) { tone({ t, f: midi(n), dur: won ? 0.22 : 0.4, type: 'pulse25', vol: 0.2, bus: 'music' }); tone({ t, f: midi(n - 12), dur: won ? 0.22 : 0.4, type: 'triangle', vol: 0.25, bus: 'music' }); }
}
export function pauseAudio(paused) {
  if (!ctx) return;
  if (paused) ctx.suspend().catch(() => {}); else ctx.resume().catch(() => {});
}

// ---------- Preferências ----------
export function getPrefs() { return { ...prefs }; }
export function setPref(key, on) {
  prefs[key] = !!on; savePrefs();
  if (ctx) {
    const bus = key === 'music' ? musicBus : sfxBus; const v = key === 'music' ? 0.32 : 0.62;
    bus.gain.setTargetAtTime(on ? v : 0, ctx.currentTime, 0.05);
  }
}
