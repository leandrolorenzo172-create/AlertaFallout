// Sirene / apito de emergência gerada com a Web Audio API (sem ficheiros de som).
// Dois osciladores (quadrado + dente de serra) com a frequência a varrer 650↔1500 Hz ("wail"), muito audível.
let ctx = null; let nodes = null; let on = false;
const subs = new Set();
const emit = () => subs.forEach((f) => f(on));
export const onSirenChange = (f) => { subs.add(f); return () => subs.delete(f); };
export const isSirenOn = () => on;

export function startSiren() {
  if (on) return true;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  ctx = ctx || new AC();
  ctx.resume?.();
  const gain = ctx.createGain(); gain.gain.value = 0.0001;
  const comp = ctx.createDynamicsCompressor(); // mais volume percebido sem distorcer
  gain.connect(comp).connect(ctx.destination);
  const o1 = ctx.createOscillator(); o1.type = 'square';
  const o2 = ctx.createOscillator(); o2.type = 'sawtooth'; o2.detune.value = 12;
  // LFO lento que faz a frequência subir e descer
  const lfo = ctx.createOscillator(); lfo.type = 'triangle'; lfo.frequency.value = 0.55;
  const depth = ctx.createGain(); depth.gain.value = 425;
  lfo.connect(depth); depth.connect(o1.frequency); depth.connect(o2.frequency);
  o1.frequency.value = 1075; o2.frequency.value = 1075;
  o1.connect(gain); o2.connect(gain);
  const now = ctx.currentTime;
  [o1, o2, lfo].forEach((o) => o.start(now));
  gain.gain.exponentialRampToValueAtTime(0.35, now + 0.08); // entrada suave (evita estalido)
  nodes = { o1, o2, lfo, gain };
  on = true; emit();
  return true;
}

export function stopSiren() {
  if (!on || !nodes) return;
  const { o1, o2, lfo, gain } = nodes; const now = ctx.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(gain.gain.value, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
  [o1, o2, lfo].forEach((o) => { try { o.stop(now + 0.08); } catch { /* já parado */ } });
  nodes = null; on = false; emit();
}

export const toggleSiren = () => (on ? (stopSiren(), false) : startSiren());
