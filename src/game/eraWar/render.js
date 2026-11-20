// Guerra das Eras — desenho a cores, estilo arcada 16-bit.
// Cenário original de trincheiras (céu, montanhas, pinheiros, trincheiras de madeira, sacos de areia, barris,
// estacas, arame farpado e bunkers nas pontas) pintado em código em pixel art a meia resolução e ampliado 2x.
// As tropas são as 15 personagens da folha do dono da app (sprites.js). Tudo offline.
import { WORLD, BASE_HP, ERAS, SIEGE_AT } from './logic';
import { rect as unitRect, getAtlas, spritesReady } from './sprites';

const S = 2; // píxeis do ecrã por unidade do mundo
const OFF = 24; // céu extra por cima do mundo
export const CANVAS = { w: WORLD.w * S, h: WORLD.h * S + OFF };
const X = (x) => Math.round(x * S);
const WD = CANVAS.w; const H = CANVAS.h;
const LANE = 336; // linha de combate (pés das tropas), em píxeis do ecrã
const HW = WD / 2; const HH = H / 2; const LN = LANE / 2; // cenário a meia resolução
export { spritesReady };

export const SCREEN_RGB = 'color';
// Paleta do jogo (fixa, não muda com o tema). useTheme = true dá as cores do tema (ícones à volta do ecrã).
export function themeColors(useTheme = false) {
  const v = useTheme ? (getComputedStyle(document.documentElement).getPropertyValue('--c').trim() || '0 255 65') : 'color';
  return {
    key: v, ink: '#1a1410', dark: '#2a2218', low: '#6b5a3a', mid: '#c9b27a', hi: '#ffe9a0', sky: '#8fb0c8', sky2: '#b9cdd8', dim: '#4a3c28', bg: '#1a1410',
    fire: '#ffb000', fire2: '#ff5a1a', red: '#e0302a', white: '#fffbe8', gas: '#8fd14f', gas2: '#c8f06a', laser: '#5ff3ff',
  };
}
const R = (c, x, y, w, h) => c.fillRect(Math.round(x), Math.round(y), w, h);
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function makeCanvas(w, h) {
  return (typeof OffscreenCanvas !== 'undefined') ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
}
const cache = new Map();
function sheet(key, w, h, draw) {
  let cv = cache.get(key);
  if (!cv) { cv = makeCanvas(w, h); const c = cv.getContext('2d'); c.imageSmoothingEnabled = false; draw(c); cache.set(key, cv); }
  return cv;
}
// pinta com uma cor (atalho)
const P = (c, col, x, y, w, h) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
// xadrez de duas cores (dithering)
function dither(c, a, b, x, y, w, h) { P(c, a, x, y, w, h); c.fillStyle = b; for (let j = 0; j < h; j++) for (let i = (j % 2); i < w; i += 2) c.fillRect(x + i, y + j, 1, 1); }
function poly(c, col, pts) { c.fillStyle = col; c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); c.fill(); }
function ellipse(c, col, x, y, rx, ry) { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); }

// ---------- Elementos do cenário (meia resolução) ----------
function pine(c, x, base, h, r) {
  P(c, '#3a2716', x - 1, base - h * 0.25, 3, h * 0.25 + 2);
  const tiers = 6;
  for (let i = 0; i < tiers; i++) {
    const ty = base - h * 0.2 - (i * h * 0.8) / tiers; const w = (h * 0.42) * (1 - i / (tiers + 1));
    poly(c, '#13240f', [x - w - 1, ty + 1, x + w + 1, ty + 1, x, ty - h * 0.24]);
    poly(c, '#1f3a1e', [x - w, ty, x + w, ty, x, ty - h * 0.22]);
    poly(c, '#2d5527', [x - w * 0.85, ty - 1, x + w * 0.2, ty - 1, x - w * 0.1, ty - h * 0.2]);
    for (let k = 0; k < 4; k++) P(c, '#457337', x - w * 0.6 + r() * w * 0.6, ty - 2 - r() * h * 0.12, 1, 1);
  }
}
function sandbag(c, x, y, w = 9, h = 5) {
  ellipse(c, '#3b3520', x + w / 2, y + h / 2 + 0.5, w / 2 + 0.6, h / 2 + 0.6);
  ellipse(c, '#9c9058', x + w / 2, y + h / 2, w / 2, h / 2);
  ellipse(c, '#c7bb7a', x + w / 2 - 1, y + h / 2 - 1, w / 2 - 2, h / 2 - 1.5);
  P(c, '#7d7244', x + 2, y + h - 1, w - 4, 1);
}
function sandbagWall(c, x, y, n, rows = 2) { for (let j = 0; j < rows; j++) for (let i = 0; i < n - j; i++) sandbag(c, x + i * 8 + j * 4, y - j * 4); }
function planks(c, x, y, w, h) {
  for (let i = 0; i < w; i += 4) { P(c, i % 8 ? '#6b4a2b' : '#82603a', x + i, y, 3, h); P(c, '#3a2716', x + i + 3, y, 1, h); }
  P(c, '#a07a48', x, y, w, 1); P(c, '#2a1d10', x, y + h, w, 1);
}
function barrel(c, x, y) {
  P(c, '#2a1d10', x - 1, y - 1, 9, 12); P(c, '#6d5a32', x, y, 7, 10); P(c, '#8f7846', x + 1, y, 2, 10); P(c, '#4a3c20', x, y + 2, 7, 1); P(c, '#4a3c20', x, y + 7, 7, 1);
}
function stake(c, x, y) { // ouriço de madeira
  c.strokeStyle = '#2a1d10'; c.lineWidth = 3; c.beginPath(); c.moveTo(x - 6, y); c.lineTo(x + 6, y - 12); c.moveTo(x - 6, y - 12); c.lineTo(x + 6, y); c.stroke();
  c.strokeStyle = '#7a5733'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x - 6, y); c.lineTo(x + 6, y - 12); c.moveTo(x - 6, y - 12); c.lineTo(x + 6, y); c.stroke();
}
function wire(c, x0, x1, y) {
  for (let x = x0; x <= x1; x += 14) { P(c, '#2a1d10', x, y - 8, 2, 10); P(c, '#6b4a2b', x, y - 8, 1, 10); }
  c.fillStyle = '#3a3a3a'; for (let x = x0; x < x1; x++) { c.fillRect(x, y - 6 + Math.sin(x * 0.7) * 1.2, 1, 1); c.fillRect(x, y - 2 + Math.cos(x * 0.7) * 1.2, 1, 1); }
}
function tankWreck(c, x, y, r) {
  P(c, '#2a2a1c', x - 1, y - 1, 18, 15); P(c, '#7d7a5a', x, y, 16, 13); P(c, '#9a9670', x + 1, y, 4, 13); P(c, '#5d5a40', x, y + 4, 16, 1); P(c, '#5d5a40', x, y + 9, 16, 1);
  for (let k = 0; k < 14; k++) P(c, r() > 0.5 ? '#3f6b2a' : '#5a8a35', x + r() * 16, y + r() * 13, 2, 2);
}
// bunker de terra e sacos de areia com entrada escura (lado esquerdo; o direito é espelhado)
function bunker(c, r) {
  poly(c, '#2d3a18', [0, 92, 30, 84, 58, 96, 74, 118, 80, 150, 84, LN + 4, 0, LN + 4]);
  poly(c, '#4d6a2c', [0, 94, 30, 86, 56, 98, 71, 119, 76, 150, 79, LN + 2, 0, LN + 2]);
  for (let i = 0; i < 160; i++) { const x = r() * 74; const y = 92 + r() * (LN - 92); P(c, r() > 0.5 ? '#6a8a36' : '#36501f', x, y, 1 + r() * 2, 1); }
  // entrada e arco de sacos de areia
  poly(c, '#120e0a', [26, LN, 30, 128, 52, 128, 57, LN]);
  P(c, '#3a2716', 26, 125, 32, 3); P(c, '#6b4a2b', 27, 125, 30, 2);
  for (let a = 0; a < 7; a++) { const ang = Math.PI + (a / 6) * Math.PI; sandbag(c, 41 + Math.cos(ang) * 22 - 4, 132 + Math.sin(ang) * 18 - 2); }
  sandbagWall(c, 4, LN - 6, 3); sandbagWall(c, 58, LN - 6, 2);
  P(c, '#3a2716', 24, 128, 3, LN - 128); P(c, '#3a2716', 56, 128, 3, LN - 128);
}
function backdrop() {
  return sheet('bg', HW, HH, (c) => {
    const r = rng(17);
    // céu em faixas com dithering entre elas
    const sky = ['#5f86aa', '#6b91b3', '#789bbb', '#86a6c2', '#94b1c9', '#a3bccf', '#b1c6d5', '#bccfda'];
    sky.forEach((col, i) => { P(c, col, 0, i * 15, HW, 15); if (i) dither(c, sky[i - 1], col, 0, i * 15 - 1, HW, 2); });
    // nuvens
    for (const [x, y, w] of [[60, 24, 46], [190, 14, 60], [330, 30, 50], [420, 18, 40]]) {
      ellipse(c, '#a9bccb', x, y + 3, w * 0.5, 5); ellipse(c, '#c9d6df', x - 4, y, w * 0.38, 5); ellipse(c, '#e1e9ee', x - 8, y - 2, w * 0.2, 3);
    }
    // montanhas ao longe
    const ridge = (x, a, b, base) => base - Math.abs(Math.sin(x * a + b)) * 26 - Math.sin(x * a * 3.1) * 5;
    c.fillStyle = '#8f9bb0'; c.beginPath(); c.moveTo(0, 120); for (let x = 0; x <= HW; x += 2) c.lineTo(x, ridge(x, 0.018, 0.6, 100)); c.lineTo(HW, 120); c.fill();
    for (let x = 0; x < HW; x += 2) { const y = ridge(x, 0.018, 0.6, 100); if (y < 82) P(c, '#e9eef2', x, y, 2, 3); else if ((x * 7) % 9 < 3) P(c, '#a9b2c3', x, y + 2, 2, 4); }
    c.fillStyle = '#7a8196'; c.beginPath(); c.moveTo(0, 125); for (let x = 0; x <= HW; x += 2) c.lineTo(x, ridge(x, 0.027, 2.1, 112)); c.lineTo(HW, 125); c.fill();
    // colinas verdes
    c.fillStyle = '#36501f'; c.beginPath(); c.moveTo(0, HH); for (let x = 0; x <= HW; x += 2) c.lineTo(x, 118 + Math.sin(x * 0.03) * 5 + Math.sin(x * 0.09) * 2); c.lineTo(HW, HH); c.fill();
    c.fillStyle = '#4d6a2c'; c.beginPath(); c.moveTo(0, HH); for (let x = 0; x <= HW; x += 2) c.lineTo(x, 122 + Math.sin(x * 0.03) * 5 + Math.sin(x * 0.09) * 2); c.lineTo(HW, HH); c.fill();
    for (let i = 0; i < 300; i++) P(c, r() > 0.5 ? '#6a8a36' : '#36501f', r() * HW, 122 + r() * 30, 2, 1);
    // tanques de água abandonados cobertos de trepadeiras
    tankWreck(c, 228, 106, r); tankWreck(c, 292, 104, r); tankWreck(c, 396, 108, r);
    // pinheiros
    for (const [x, h] of [[96, 58], [150, 64], [205, 48], [252, 40], [330, 54], [352, 62], [410, 50], [448, 58]]) pine(c, x, 128, h, r);
    // trincheira do meio: paredes de tábuas, sacos de areia e entradas escuras
    planks(c, 96, 128, 120, 12); planks(c, 240, 130, 80, 10); planks(c, 340, 128, 60, 12);
    poly(c, '#120e0a', [150, 140, 153, 131, 165, 131, 168, 140]); poly(c, '#120e0a', [268, 140, 271, 132, 282, 132, 285, 140]);
    sandbagWall(c, 98, 124, 5); sandbagWall(c, 176, 124, 4); sandbagWall(c, 244, 126, 3); sandbagWall(c, 300, 126, 2); sandbagWall(c, 344, 124, 5);
    for (const x of [120, 210, 236, 320, 330, 392]) { P(c, '#2a1d10', x, 118, 3, 14); P(c, '#6b4a2b', x, 118, 2, 14); }
    // chão de combate: relva seca e terra batida
    P(c, '#7d973b', 0, 140, HW, HH - 140);
    for (let i = 0; i < 900; i++) P(c, r() > 0.5 ? '#98ad4c' : '#5f7a2c', r() * HW, 140 + r() * (HH - 140), 1 + r() * 2, 1);
    dither(c, '#a68a55', '#7d973b', 0, LN - 14, HW, 2);
    P(c, '#a68a55', 0, LN - 12, HW, 20);
    for (let i = 0; i < 500; i++) P(c, r() > 0.5 ? '#b99c62' : '#8a7046', r() * HW, LN - 12 + r() * 20, 1 + r() * 2, 1);
    for (let i = 0; i < 30; i++) P(c, '#7a6340', r() * HW, LN - 10 + r() * 16, 2, 1);
    dither(c, '#7d973b', '#a68a55', 0, LN + 8, HW, 2);
    // adereços
    for (const [x, y] of [[96, 146], [214, 150], [310, 146], [372, 150]]) stake(c, x, y);
    for (const [x, y] of [[124, 146], [262, 150], [340, 147]]) barrel(c, x, y);
    for (const [x, y] of [[180, 150], [400, 152]]) { P(c, '#2a1d10', x - 1, y - 1, 20, 6); P(c, '#7a5733', x, y, 18, 4); P(c, '#a07a48', x, y, 18, 1); } // troncos
    wire(c, 150, 200, 152); wire(c, 280, 330, 152);
    // primeiro plano: trincheira com tábuas e sacos de areia
    P(c, '#2a1f14', 0, HH - 18, HW, 18); planks(c, 0, HH - 18, HW, 4);
    for (let i = 0; i < 200; i++) P(c, r() > 0.5 ? '#4a3a26' : '#1a130c', r() * HW, HH - 13 + r() * 13, 2, 1);
    sandbagWall(c, 130, HH - 16, 7, 2); sandbagWall(c, 300, HH - 16, 5, 2);
    for (let i = 0; i < 40; i++) { const x = r() * HW; P(c, '#5f7a2c', x, HH - 20 - r() * 4, 1, 4); P(c, '#98ad4c', x + 1, HH - 22 - r() * 3, 1, 3); }
    // bunkers nas pontas
    bunker(c, r);
    c.save(); c.translate(HW, 0); c.scale(-1, 1); bunker(c, r); c.restore();
  });
}

// moldura do HUD junto a cada base (barra vertical de vida e caixa do "500 HP")
function drawHudFrames(c, C, g) {
  [0, 1].forEach((side) => {
    const sd = g.sides[side]; const p = Math.max(0, sd.hp / BASE_HP);
    const bx = side === 0 ? 226 : WD - 238; const bh = 172;
    c.fillStyle = C.ink; R(c, bx - 2, 0, 16, bh + 2);
    c.fillStyle = '#3a1410'; R(c, bx, 0, 12, bh);
    c.fillStyle = p < 0.3 && Math.floor(performance.now() / 250) % 2 ? '#ff7a6e' : C.red; const fh = Math.round(bh * p); R(c, bx, bh - fh, 12, fh);
    c.fillStyle = C.ink; for (let y = 10; y < bh; y += 12) R(c, bx, y, 12, 2);
    const fx = side === 0 ? 214 : WD - 334; c.strokeStyle = '#ffe9a0'; c.lineWidth = 3; c.globalAlpha = 0.7;
    c.beginPath(); if (c.roundRect) c.roundRect(fx, bh + 4, 120, 70, 10); else c.rect(fx, bh + 4, 120, 70); c.stroke();
    c.globalAlpha = 0.35; c.fillStyle = '#1a1410'; c.fill(); c.globalAlpha = 1;
  });
}

// ---------- Torres: em cima dos bunkers, a cores ----------
const TUR = [{ x: 96, y: 186 }, { x: 52, y: 166 }, { x: 140, y: 212 }];
function turretSprite(era) {
  return sheet(`tur${era}`, 48, 40, (c) => {
    // plataforma de sacos de areia
    for (let i = 0; i < 4; i++) { ellipse(c, '#3b3520', 7 + i * 11, 34, 6.5, 4.5); ellipse(c, '#9c9058', 7 + i * 11, 33.5, 5.5, 3.6); ellipse(c, '#c7bb7a', 6 + i * 11, 32.5, 3, 1.6); }
    if (era === 0) { // lança-pedras de madeira
      P(c, '#3a2716', 10, 24, 28, 5); P(c, '#7a5733', 11, 25, 26, 3);
      c.strokeStyle = '#3a2716'; c.lineWidth = 4; c.beginPath(); c.moveTo(16, 26); c.lineTo(34, 6); c.stroke();
      c.strokeStyle = '#a07a48'; c.lineWidth = 2; c.beginPath(); c.moveTo(16, 26); c.lineTo(34, 6); c.stroke();
      ellipse(c, '#4a4a48', 35, 6, 4, 4); ellipse(c, '#8a8a86', 34, 5, 2, 2);
    } else if (era === 1) { // balista de sucata
      P(c, '#2a1d10', 8, 18, 30, 10); P(c, '#6b4a2b', 9, 19, 28, 8); P(c, '#8a8a86', 9, 19, 28, 2);
      c.strokeStyle = '#3a2716'; c.lineWidth = 3; c.beginPath(); c.arc(30, 22, 10, -1.3, 1.3); c.stroke();
    } else if (era === 2) { // metralhadora a vapor (latão)
      P(c, '#2a1d10', 9, 12, 28, 18); P(c, '#b5893a', 10, 13, 26, 16); P(c, '#e0b85a', 11, 13, 6, 16);
      P(c, '#2a1d10', 15, 2, 6, 11); P(c, '#6b6b66', 16, 3, 4, 10); ellipse(c, '#d9d9d2', 18, 2, 4, 2);
    } else if (era === 3) { // ninho de metralhadora
      for (let i = 0; i < 3; i++) { ellipse(c, '#3b3520', 9 + i * 15, 22, 8, 6); ellipse(c, '#7d8a4a', 9 + i * 15, 21, 7, 5); ellipse(c, '#a3b065', 8 + i * 15, 19.5, 3.5, 2); }
      P(c, '#1a1a18', 16, 10, 16, 9); P(c, '#4a5a2c', 17, 11, 14, 7);
    } else { // torre laser
      P(c, '#1a1a24', 12, 4, 24, 26); P(c, '#8a95a8', 13, 5, 22, 24); P(c, '#c9d2e0', 14, 5, 5, 24);
      P(c, '#1a1a24', 16, 10, 16, 6); P(c, '#5ff3ff', 17, 11, 14, 4);
    }
  });
}
function drawTurrets(c, C, side, sd, t) {
  for (let k = 0; k < sd.slots; k++) {
    const p = TUR[k]; const x = side === 0 ? p.x : WD - p.x; const y = p.y;
    const tu = sd.turrets[k];
    c.fillStyle = 'rgba(26,20,16,0.55)'; R(c, x - 24, y + 36, 48, 4);
    if (!tu) { c.strokeStyle = 'rgba(255,233,160,0.35)'; c.lineWidth = 1; c.strokeRect(x - 20, y + 20, 40, 18); continue; }
    c.save(); c.translate(x, y); if (side === 1) c.scale(-1, 1); c.drawImage(turretSprite(tu.era), -24, 0); c.restore();
    if (tu.era === 0 || tu.era === 1) continue;
    const tx = tu.aim ? X(tu.aim) : (side === 0 ? x + 160 : x - 160);
    const ang = Math.atan2(LANE - 30 - (y + 16), tx - x); const len = 26;
    c.strokeStyle = C.ink; c.lineWidth = 7; c.beginPath(); c.moveTo(x, y + 16); c.lineTo(x + Math.cos(ang) * len, y + 16 + Math.sin(ang) * len); c.stroke();
    c.strokeStyle = tu.era === 4 ? C.laser : tu.era === 2 ? '#e0b85a' : '#6b6b66'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(x, y + 16); c.lineTo(x + Math.cos(ang) * (len - 2), y + 16 + Math.sin(ang) * (len - 2)); c.stroke();
    if (tu.cd > 0 && tu.cd < 0.08) { c.fillStyle = tu.era === 4 ? C.laser : C.fire; c.beginPath(); c.arc(x + Math.cos(ang) * (len + 3), y + 16 + Math.sin(ang) * (len + 3), 4, 0, 7); c.fill(); }
  }
}

// ---------- Projéteis e efeitos (coordenadas do mundo, ampliadas) ----------
function drawShots(c, C, shots) {
  for (const s of shots) {
    if (s.era === 4) { c.fillStyle = C.laser; R(c, s.x - 5, s.y - 0.5, 10, 1.5); c.fillStyle = C.white; R(c, s.x - 2, s.y, 4, 1); }
    else if (s.era === 1 && s.kind === 'unit') { c.fillStyle = '#5a4026'; R(c, s.x - 4, s.y, 8, 1); c.fillStyle = '#c9c9c0'; R(c, s.x + 3, s.y, 2, 1); }
    else if (s.era === 0) { c.fillStyle = '#4a4a48'; R(c, s.x - 1.5, s.y - 1.5, 3, 3); c.fillStyle = '#9a9a96'; R(c, s.x - 1, s.y - 1, 1, 1); }
    else { c.fillStyle = C.fire; R(c, s.x - 2.5, s.y, 5, 1); c.fillStyle = C.white; R(c, s.x, s.y, 1.5, 1); }
  }
}
function drawFx(c, C, fx, t) {
  let plane = false; const W = WORLD.w; const G = WORLD.ground;
  for (const f of fx) {
    if (f.kind === 'boom') {
      const k = f.t / f.life; const r = (f.big ? 13 : 7) * (0.4 + k);
      c.fillStyle = k < 0.35 ? C.white : k < 0.6 ? C.fire : k < 0.8 ? C.fire2 : '#4a3c28';
      for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; R(c, f.x + Math.cos(a) * r, f.y + Math.sin(a) * r * 0.6, 2, 2); }
      if (k < 0.45) { c.fillStyle = C.fire2; R(c, f.x - 5, f.y - 5, 10, 10); c.fillStyle = C.fire; R(c, f.x - 3.5, f.y - 3.5, 7, 7); c.fillStyle = C.white; R(c, f.x - 1.5, f.y - 1.5, 3, 3); }
      continue;
    }
    if (f.delay > 0) continue;
    if (f.kind === 'meteor') { // destroços em chamas
      for (let i = 1; i < 8; i++) { c.fillStyle = i < 3 ? C.fire : i < 5 ? C.fire2 : '#6b5a3a'; R(c, f.x - i * 1.5, f.y - i * 4, 5 - i * 0.5, 3); }
      c.fillStyle = C.ink; R(c, f.x - 4, f.y - 4, 8, 8); c.fillStyle = '#6b5a3a'; R(c, f.x - 3, f.y - 3, 6, 6); c.fillStyle = C.fire; R(c, f.x - 3, f.y + 1, 6, 2);
    } else if (f.kind === 'shells') { // granadas de morteiro
      c.fillStyle = C.ink; R(c, f.x - 2, f.y - 4, 4, 7); c.fillStyle = '#5a6a3a'; R(c, f.x - 1, f.y - 3, 2, 5); c.fillStyle = C.fire; R(c, f.x - 0.5, f.y - 8, 1, 3);
    } else if (f.kind === 'bombs') { plane = true; c.fillStyle = C.ink; R(c, f.x - 2, f.y - 5, 5, 8); c.fillStyle = '#4a5a2c'; R(c, f.x - 1, f.y - 4, 3, 6); c.fillStyle = C.ink; R(c, f.x - 3, f.y - 6, 7, 1); }
    else if (f.kind === 'gas') { // nuvens de gás tóxico verde
      const a = Math.min(1, f.t / 0.4) * Math.min(1, (f.life - f.t) / 0.8);
      c.globalAlpha = 0.5 * a;
      for (let i = 0; i < 18; i++) { const ang = i * 2.4 + t * 1.5; const rr = (f.r - 6) * ((i % 5) / 5 + 0.3); c.fillStyle = i % 3 ? C.gas : C.gas2; R(c, f.x + Math.cos(ang) * rr - 4, f.y + Math.sin(ang * 1.3) * 8 - 3, 8, 6); }
      c.globalAlpha = 1;
    } else if (f.kind === 'nuke') {
      c.fillStyle = C.ink; R(c, f.x - 4, f.y - 7, 8, 12); R(c, f.x - 6, f.y - 9, 12, 2); c.fillStyle = '#c9a400'; R(c, f.x - 3, f.y - 6, 6, 10); c.fillStyle = C.ink; R(c, f.x - 2, f.y - 2, 4, 3);
    } else if (f.kind === 'shock') { // clarão branco, onda de choque e cogumelo
      const k = f.t / f.life;
      if (k < 0.25) { c.globalAlpha = (0.25 - k) * 3.6; c.fillStyle = C.white; R(c, 0, -OFF, W, WORLD.h + OFF); c.globalAlpha = 1; }
      const rr = k * 260; c.fillStyle = k < 0.5 ? C.white : C.fire;
      for (let i = 0; i < 60; i++) { const a = (i / 60) * Math.PI; R(c, f.x + Math.cos(a) * rr, G - Math.sin(a) * rr * 0.35, 3, 2); }
      const h = Math.min(1, k * 2.2) * 80; const top = G - h;
      c.fillStyle = '#4a3c28'; R(c, f.x - 6, top, 12, h); c.fillStyle = C.fire2; R(c, f.x - 4, top, 8, h); c.fillStyle = C.fire; R(c, f.x - 1.5, top, 3, h);
      const cw = 20 + k * 28;
      c.fillStyle = '#4a3c28'; R(c, f.x - cw, top - 18, cw * 2, 22); R(c, f.x - cw * 0.7, top - 26, cw * 1.4, 10);
      c.fillStyle = k < 0.6 ? C.fire2 : '#8a6a4a'; R(c, f.x - cw + 2, top - 16, cw * 2 - 4, 18); R(c, f.x - cw * 0.7 + 2, top - 24, cw * 1.4 - 4, 8);
      c.fillStyle = k < 0.6 ? C.fire : '#b89a72'; R(c, f.x - cw * 0.6, top - 14, cw * 1.2, 6);
      c.fillStyle = C.white; R(c, f.x - cw / 2, top - 12, cw, 2); c.fillStyle = C.fire2; R(c, f.x - cw + 2, top, cw * 2 - 4, 2);
    }
  }
  if (plane) { // avião do bombardeamento
    const x = ((t * 140) % (W + 80)) - 40; const y = 4;
    c.fillStyle = C.ink; R(c, x - 15, y - 1, 30, 6); R(c, x - 4, y - 7, 8, 18);
    c.fillStyle = '#5a6a3a'; R(c, x - 14, y, 28, 4); R(c, x - 3, y - 6, 6, 16); c.fillStyle = '#7d8a4a'; R(c, x - 14, y, 28, 1);
    c.fillStyle = '#9fb8c8'; R(c, x + 8, y, 3, 2); c.fillStyle = C.ink; R(c, x + 13, y - 2, 2, 8);
  }
}

// ---------- Tropas: sprites da folha de personagens ----------
const SCALE = 0.52; // tamanho no campo (as figuras têm ~150-165 px na folha)
function drawUnit(c, C, u, t) {
  const atlas = getAtlas(); const [sx, sy, sw, sh] = unitRect(u.era, u.type);
  const w = sw * SCALE; const h = sh * SCALE;
  const x = X(u.x); const face = u.side === 0 ? 1 : -1;
  const attacking = u.atk > 0;
  const bob = attacking ? 0 : -Math.abs(Math.sin(u.walk * 5)) * 2.5;
  const lunge = attacking ? face * 4 : 0;
  // sombra
  c.fillStyle = 'rgba(26,20,16,0.35)'; c.beginPath(); c.ellipse(x, LANE - 1, w * 0.36, 4, 0, 0, 7); c.fill();
  if (atlas) {
    c.save();
    c.translate(x + lunge, LANE + bob); c.scale(face, 1);
    if (!attacking) c.rotate(Math.sin(u.walk * 5) * 0.03);
    if (u.hit > 0) c.globalAlpha = 0.55;
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.drawImage(atlas, sx, sy, sw, sh, -w / 2, -h, w, h);
    c.restore(); c.imageSmoothingEnabled = false;
  } else { c.fillStyle = C.dim; R(c, x - 12, LANE - 50, 24, 50); }
  // barra de vida
  const bw = u.type === 2 ? 36 : 24; const p = Math.max(0, u.hp / u.maxHp); const by = LANE - h - 6;
  c.fillStyle = C.ink; R(c, x - bw / 2 - 1, by - 1, bw + 2, 5);
  c.fillStyle = C.red; R(c, x - bw / 2, by, Math.max(1, Math.round(bw * p)), 3);
}

export function render(ctx, g, C, t) {
  const c = ctx;
  if (cache.size > 100) cache.clear();
  c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false;
  c.drawImage(backdrop(), 0, 0, HW, HH, 0, 0, WD, H);
  // fumo a sair das bases danificadas e de uma fogueira na trincheira
  const smokes = [[452, 262, 0, false]];
  [0, 1].forEach((side) => { if (g.sides[side].hp < BASE_HP * 0.35) smokes.push([side === 0 ? 82 : WD - 82, 230, side + 1, true]); });
  for (const [sx, sy, ph, fire] of smokes) {
    for (let i = 0; i < 7; i++) {
      const k = ((t * 0.35 + ph + i / 7) % 1); const yy = sy - k * 120; const rr = 5 + k * 16;
      c.globalAlpha = 0.5 * (1 - k); c.fillStyle = k < 0.15 && fire ? C.fire2 : '#4a4038';
      c.beginPath(); c.arc(Math.round(sx + Math.sin(k * 6 + ph) * 8), Math.round(yy), rr, 0, 7); c.fill();
    }
  }
  c.globalAlpha = 1;
  drawTurrets(c, C, 0, g.sides[0], t);
  drawTurrets(c, C, 1, g.sides[1], t);
  const units = g.units.slice().sort((a, b) => b.type - a.type); // pesadas por trás
  for (const u of units) drawUnit(c, C, u, t);
  c.setTransform(S, 0, 0, S, 0, LANE - WORLD.ground * S); // efeitos no mundo, alinhados com a linha de combate
  drawShots(c, C, g.shots);
  drawFx(c, C, g.fx, t);
  c.font = 'bold 8px monospace'; c.textAlign = 'center';
  for (const tx of g.texts) { c.globalAlpha = Math.max(0, 1 - tx.t); c.fillStyle = C.ink; c.fillText(tx.text, tx.x + 1, tx.y - 30 - tx.t * 10 + 1); c.fillStyle = C.fire; c.fillText(tx.text, tx.x, tx.y - 30 - tx.t * 10); }
  c.globalAlpha = 1;
  c.setTransform(1, 0, 0, 1, 0, 0);
  drawHudFrames(c, C, g);
  if (g.t > SIEGE_AT && !g.over) { c.font = 'bold 16px monospace'; c.textAlign = 'center'; c.fillStyle = C.ink; R(c, WD / 2 - 150, 8, 300, 24); c.fillStyle = C.red; c.fillText('CERCO: AS BASES PERDEM VIDA', WD / 2, 26); }
}

// Sprite de uma tropa para as cartas
export function drawIcon(canvas, era, type) {
  const c = canvas.getContext('2d'); c.clearRect(0, 0, canvas.width, canvas.height);
  const atlas = getAtlas(); if (!atlas) return;
  const [sx, sy, sw, sh] = unitRect(era, type);
  const s = Math.min(canvas.width / sw, canvas.height / sh);
  const w = sw * s; const h = sh * s;
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
  c.drawImage(atlas, sx, sy, sw, sh, (canvas.width - w) / 2, canvas.height - h, w, h);
}
// Ícone de carica dourada (moeda do jogo), 12x12, em pixel art
export function capIcon(C, size = 12) {
  const cv = sheet('cap', 12, 12, (c) => {
    const rows = ['..k.kkkk.k..', '.kkfffffffk.', 'kffffffffffk', '.kffmmmmffk.', 'kffmffffmffk', 'kffmfwwfmffk', 'kffmfwwfmffk', 'kffmffffmffk', '.kffmmmmffk.', 'kffffffffffk', '.kkfffffffk.', '..k.kkkk.k..'];
    const col = { k: '#2a1600', f: '#ffb000', m: '#b86a00', w: '#fffbe8' };
    rows.forEach((r, j) => [...r].forEach((ch, i) => { if (col[ch]) { c.fillStyle = col[ch]; c.fillRect(i, j, 1, 1); } }));
  });
  const out = document.createElement('canvas'); out.width = size; out.height = size;
  const o = out.getContext('2d'); o.imageSmoothingEnabled = false; o.drawImage(cv, 0, 0, size, size);
  return out.toDataURL();
}
export const eraName = (i) => ERAS[i].name;
