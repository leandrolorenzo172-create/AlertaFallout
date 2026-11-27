// SOS luminoso: lanterna da câmara (torch) a piscar em código Morse SOS (··· −−− ···).
// Se o browser/aparelho não deixar controlar o flash, liga um ecrã estroboscópico (branco/vermelho) como alternativa.
const UNIT = 200; // ms de um "ponto" em Morse
// [aceso?, duração em unidades]: ··· (3×1) −−− (3×3) ··· (3×1), pausa de 7 entre repetições
const SOS = [
  ...[1, 1, 1].flatMap((u) => [[true, u], [false, 1]]),
  [false, 2],
  ...[3, 3, 3].flatMap((u) => [[true, u], [false, 1]]),
  [false, 2],
  ...[1, 1, 1].flatMap((u) => [[true, u], [false, 1]]),
  [false, 6],
];

let mode = 'off'; // 'off' | 'starting' | 'torch' | 'screen'
let stream = null; let track = null; let timer = null; let step = 0; let lit = false;
const subs = new Set();
const emit = () => subs.forEach((f) => f({ mode, lit }));
export const onStrobeChange = (f) => { subs.add(f); return () => subs.delete(f); };
export const getStrobe = () => ({ mode, lit });

async function setTorch(v) { try { await track.applyConstraints({ advanced: [{ torch: v }] }); } catch { /* aparelho deixou de aceitar */ } }

function tick() {
  const [on, units] = SOS[step % SOS.length];
  step++;
  lit = on;
  if (mode === 'torch') setTorch(on);
  emit();
  timer = setTimeout(tick, units * UNIT);
}

async function openTorch() {
  if (!navigator.mediaDevices?.getUserMedia) return false;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    track = stream.getVideoTracks()[0];
    const caps = track?.getCapabilities?.() || {};
    if (!caps.torch) { closeTorch(); return false; }
    await track.applyConstraints({ advanced: [{ torch: true }] });
    return true;
  } catch { closeTorch(); return false; }
}
function closeTorch() {
  stream?.getTracks().forEach((tr) => tr.stop());
  stream = null; track = null;
}

export async function startStrobe() {
  if (mode !== 'off') return mode;
  mode = 'starting'; emit();
  const torch = await openTorch();
  if (mode !== 'starting') { closeTorch(); return mode; } // cancelado entretanto
  mode = torch ? 'torch' : 'screen';
  step = 0; tick();
  return mode;
}

export function stopStrobe() {
  clearTimeout(timer); timer = null;
  if (track) setTorch(false);
  closeTorch();
  mode = 'off'; lit = false; emit();
}

export const toggleStrobe = () => (mode === 'off' ? startStrobe() : (stopStrobe(), Promise.resolve('off')));
