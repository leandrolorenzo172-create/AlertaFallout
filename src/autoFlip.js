// Rodar a app 180° quando o telemóvel fica de cabeça para baixo (ex.: a carregar com o cabo para cima).
// Muitos Android (e browsers como o Brave/Chrome) não rodam o ecrã para "retrato invertido",
// por isso a app usa o acelerómetro e roda-se a si própria com CSS (os toques continuam a funcionar).
// Se o próprio sistema já rodou o ecrã (portrait-secondary), não faz nada.
// Desliga-se em Definições guardando localStorage 'pb_autoflip' = '0'.
const ON = 6;        // m/s²: gravidade claramente a apontar para o topo do telemóvel
const HOLD_MS = 600; // tem de ficar assim este tempo (evita rodar ao pegar no telemóvel)

export function startAutoFlip() {
  if (typeof window === 'undefined' || !('DeviceMotionEvent' in window)) return;
  try { if (localStorage.getItem('pb_autoflip') === '0') return; } catch { /* sem armazenamento */ }
  const root = document.documentElement;
  let flipped = false; let since = 0; let want = false;
  const setFlip = (on) => {
    if (on === flipped) return;
    // guardar a posição do scroll: com a app rodada quem faz scroll é o body
    const y = flipped ? document.body.scrollTop : window.scrollY;
    flipped = on;
    root.classList.toggle('pb-flip', on);
    if (on) document.body.scrollTop = y; else window.scrollTo(0, y);
  };
  window.addEventListener('devicemotion', (e) => {
    const g = e.accelerationIncludingGravity; if (!g || g.y == null) return;
    const type = screen.orientation?.type || '';
    if (!type.startsWith('portrait')) { setFlip(false); return; } // na horizontal não mexe
    if (type === 'portrait-secondary') { setFlip(false); return; } // o sistema já rodou
    // Android: y ≈ +9.8 com o telemóvel direito, ≈ -9.8 de cabeça para baixo (pousado na mesa ≈ 0: mantém)
    const target = g.y < -ON ? true : g.y > ON ? false : flipped;
    const now = performance.now();
    if (target !== want) { want = target; since = now; }
    if (want !== flipped && now - since > HOLD_MS) setFlip(want);
  });
}
