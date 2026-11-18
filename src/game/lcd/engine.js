// Motor dos jogos LCD retro: ecrã de 84x48 píxeis a preto sobre verde, letra de 3x5, bips e
// a moldura de um telemóvel antigo com teclado (toque) + teclado do computador. JavaScript puro, offline.

export const W = 84;
export const H = 48;

// ---------- Letra de 3x5 píxeis ----------
const GLYPHS = {
  0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001',
  5: '111100111001111', 6: '111100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001111',
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
  F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
  K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
  P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
  Z: '111001010100111', ':': '000010000010000', '-': '000000111000000', '!': '010010010000010', '.': '000000000000010',
  '?': '110001010000010', '>': '100010001010100', '<': '001010100010001', '/': '001001010100100', '+': '000010111010000',
  ' ': '000000000000000',
};
const ACCENTS = { Á: 'A', À: 'A', Â: 'A', Ã: 'A', É: 'E', Ê: 'E', Í: 'I', Ó: 'O', Ô: 'O', Õ: 'O', Ú: 'U', Ç: 'C' };

// ---------- Ecrã ----------
export function createScreen(canvas) {
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(W, H);
  const buf = new Uint8Array(W * H);
  const ON = [16, 28, 18]; const OFF = [134, 176, 140];
  const s = {
    clear() { buf.fill(0); },
    px(x, y, v = 1) { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < W && y < H) buf[y * W + x] = v; },
    get(x, y) { return x >= 0 && y >= 0 && x < W && y < H ? buf[(y | 0) * W + (x | 0)] : 0; },
    rect(x, y, w, h, v = 1) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) s.px(x + i, y + j, v); },
    frame(x, y, w, h) { for (let i = 0; i < w; i++) { s.px(x + i, y); s.px(x + i, y + h - 1); } for (let j = 0; j < h; j++) { s.px(x, y + j); s.px(x + w - 1, y + j); } },
    hline(x, y, w, v = 1) { for (let i = 0; i < w; i++) s.px(x + i, y, v); },
    // desenha um mapa de pixels: array de strings, '#'/'x' acende, '.' apaga, ' ' transparente
    sprite(rows, x, y, flip = false) {
      for (let j = 0; j < rows.length; j++) {
        const r = rows[j];
        for (let i = 0; i < r.length; i++) {
          const ch = r[flip ? r.length - 1 - i : i];
          if (ch === '#' || ch === 'x') s.px(x + i, y + j, 1); else if (ch === '.') s.px(x + i, y + j, 0);
        }
      }
    },
    text(str, x, y, { align = 'left', inv = false } = {}) {
      const t = String(str).toUpperCase().split('').map((ch) => ACCENTS[ch] || ch);
      const w = t.length * 4 - 1;
      let cx = align === 'center' ? Math.round(x - w / 2) : align === 'right' ? x - w : x;
      if (inv) s.rect(cx - 1, y - 1, w + 2, 7, 1);
      for (const ch of t) {
        const g = GLYPHS[ch] || GLYPHS['?'];
        for (let k = 0; k < 15; k++) if (g[k] === '1') s.px(cx + (k % 3), y + ((k / 3) | 0), inv ? 0 : 1);
        cx += 4;
      }
      return w;
    },
    num(n, digits) { return String(Math.max(0, Math.floor(n))).padStart(digits, '0').slice(-digits); },
    heart(x, y) { s.sprite(['## ##', '#####', ' ### ', '  #  '], x, y); },
    present() {
      const d = img.data;
      for (let p = 0, i = 0; p < W * H; p++, i += 4) { const c = buf[p] ? ON : OFF; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; }
      ctx.putImageData(img, 0, 0);
    },
  };
  return s;
}

// ---------- Bips (onda quadrada, como os telemóveis antigos) ----------
const SND_KEY = 'pb_lcd_sound';
let actx = null; let soundOn = true;
try { soundOn = localStorage.getItem(SND_KEY) !== '0'; } catch { /* sem armazenamento */ }
export function getSound() { return soundOn; }
export function setSound(on) { soundOn = on; try { localStorage.setItem(SND_KEY, on ? '1' : '0'); } catch { /* sem armazenamento */ } }
export function unlockAudio() {
  try {
    if (!actx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) actx = new AC(); }
    if (actx && actx.state === 'suspended') actx.resume();
  } catch { /* sem áudio */ }
}
// tom: [freq Hz, duração s, ...] em sequência
export function beep(seq, vol = 0.05) {
  if (!soundOn || !actx || actx.state !== 'running') return;
  let t = actx.currentTime + 0.005;
  for (let i = 0; i < seq.length; i += 2) {
    const f = seq[i]; const d = seq[i + 1];
    if (f > 0) {
      const o = actx.createOscillator(); const g = actx.createGain();
      o.type = 'square'; o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(vol, t); g.gain.setValueAtTime(vol, t + d * 0.8); g.gain.linearRampToValueAtTime(0, t + d);
      o.connect(g).connect(actx.destination); o.start(t); o.stop(t + d + 0.01);
    }
    t += d;
  }
}
export const SFX = {
  key: () => beep([1400, 0.025], 0.03),
  shoot: () => beep([1800, 0.02, 1200, 0.02], 0.03),
  hit: () => beep([300, 0.03, 180, 0.04]),
  boom: () => beep([220, 0.04, 150, 0.05, 90, 0.08]),
  eat: () => beep([1046, 0.03, 1568, 0.04]),
  bonus: () => beep([1318, 0.04, 1568, 0.04, 2093, 0.07]),
  power: () => beep([784, 0.05, 1046, 0.05, 1318, 0.08]),
  die: () => beep([784, 0.1, 622, 0.1, 494, 0.12, 392, 0.25]),
  level: () => beep([523, 0.08, 659, 0.08, 784, 0.08, 1046, 0.2]),
  start: () => beep([659, 0.06, 0, 0.02, 988, 0.1]),
};

// ---------- Moldura do telemóvel com teclado ----------
// teclas lógicas: up down left right fire alt ok back
const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up', Digit2: 'up', Numpad8: 'up',
  ArrowDown: 'down', KeyS: 'down', Digit8: 'down', Numpad2: 'down',
  ArrowLeft: 'left', KeyA: 'left', Digit4: 'left', Numpad4: 'left',
  ArrowRight: 'right', KeyD: 'right', Digit6: 'right', Numpad6: 'right',
  Space: 'fire', Digit5: 'fire', Numpad5: 'fire', KeyJ: 'fire', KeyK: 'alt', KeyX: 'alt', Digit0: 'alt', Numpad0: 'alt',
  Enter: 'ok', NumpadEnter: 'ok', KeyP: 'ok', Escape: 'back', Backspace: 'back', KeyM: 'mute',
};
// linha de números: 2/4/6/8 como no teclado do telemóvel; teclado numérico do PC: 8 em cima, 2 em baixo

const PAD = [
  ['1', '', ''], ['2', '▲', 'up'], ['3', '', ''],
  ['4', '◀', 'left'], ['5', '●', 'fire'], ['6', '▶', 'right'],
  ['7', '', ''], ['8', '▼', 'down'], ['9', '', ''],
  ['*', '', ''], ['0', '✶', 'alt'], ['#', '♪', 'mute'],
];

// Monta a moldura e devolve { canvas, keys (estado premido), on(fn) para toques, destroy }
export function mountShell(root, { title, help, altLabel = '' }) {
  root.innerHTML = `
<div class="lcd" tabindex="-1">
  <div class="lcd-phone">
    <div class="lcd-ear" aria-hidden="true"></div>
    <div class="lcd-bezel"><div class="lcd-glass"><canvas width="${W}" height="${H}" aria-label="${title}"></canvas></div></div>
    <div class="lcd-pad">
      <div class="lcd-soft">
        <button type="button" class="lcd-key lcd-sk" data-k="back" aria-label="Voltar">C</button>
        <button type="button" class="lcd-key lcd-nav" data-k="ok" aria-label="OK / Pausa">OK</button>
        <button type="button" class="lcd-key lcd-sk" data-k="mute" aria-label="Som">♪</button>
      </div>
      <div class="lcd-num">
        ${PAD.map(([n, sym, k]) => `<button type="button" class="lcd-key${k ? ' on' : ''}" ${k ? `data-k="${k}"` : 'tabindex="-1" aria-hidden="true"'}><b>${n}</b>${sym ? `<i>${sym}</i>` : ''}${k === 'alt' && altLabel ? `<small>${altLabel}</small>` : ''}</button>`).join('')}
      </div>
    </div>
  </div>
  <p class="lcd-help">${help}</p>
</div>`;
  const el = root.querySelector('.lcd');
  const canvas = root.querySelector('canvas');
  const keys = Object.create(null);
  const presses = [];
  const press = (k) => { if (!k) return; unlockAudio(); if (!keys[k]) presses.push(k); keys[k] = true; };
  const release = (k) => { if (k) keys[k] = false; };

  const onKeyDown = (e) => {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    const k = KEYMAP[e.code]; if (!k) return;
    e.preventDefault(); if (!e.repeat) press(k); else keys[k] = true;
  };
  const onKeyUp = (e) => { const k = KEYMAP[e.code]; if (k) release(k); };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  // teclas no ecrã: manter premido funciona (ponteiro) e não faz scroll nem zoom
  const held = new Map();
  const down = (e) => {
    const b = e.target.closest('[data-k]'); if (!b) return;
    e.preventDefault(); b.setPointerCapture?.(e.pointerId);
    held.set(e.pointerId, b.dataset.k); b.classList.add('down'); press(b.dataset.k);
    if (navigator.vibrate) try { navigator.vibrate(8); } catch { /* sem vibração */ }
  };
  const up = (e) => {
    const k = held.get(e.pointerId); if (!k) return;
    held.delete(e.pointerId); release(k);
    el.querySelectorAll(`[data-k="${k}"]`).forEach((b) => b.classList.remove('down'));
  };
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('contextmenu', (e) => e.preventDefault());

  // deslizar o dedo no ecrã (usado pela cobra) e tocar no ecrã (= OK/disparar)
  let sw = null; const swipeFns = [];
  const glass = root.querySelector('.lcd-glass');
  glass.addEventListener('pointerdown', (e) => { e.preventDefault(); unlockAudio(); sw = { x: e.clientX, y: e.clientY, t: performance.now(), used: false }; });
  glass.addEventListener('pointermove', (e) => {
    if (!sw || sw.used) return;
    const dx = e.clientX - sw.x; const dy = e.clientY - sw.y;
    if (Math.hypot(dx, dy) > 24) { sw.used = true; const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); swipeFns.forEach((f) => f(dir)); }
  });
  glass.addEventListener('pointerup', () => { if (sw && !sw.used && performance.now() - sw.t < 300) presses.push('tap'); sw = null; });

  return {
    el, canvas, keys,
    take() { return presses.splice(0); }, // teclas premidas desde a última leitura
    onSwipe(f) { swipeFns.push(f); },
    destroy() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      root.innerHTML = '';
    },
  };
}

// Ciclo com passo fixo; pausa automática quando a página fica escondida
export function runLoop(update, draw) {
  let raf = 0; let last = performance.now(); let acc = 0; let alive = true;
  const DT = 1 / 60;
  const frame = (now) => {
    if (!alive) return;
    acc += Math.min(0.2, (now - last) / 1000); last = now;
    while (acc >= DT) { update(DT); acc -= DT; }
    draw();
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => { alive = false; cancelAnimationFrame(raf); };
}

export function loadBest(key) { try { return Number(localStorage.getItem(key)) || 0; } catch { return 0; } }
export function saveBest(key, v) { try { localStorage.setItem(key, String(v)); } catch { /* sem armazenamento */ } }
