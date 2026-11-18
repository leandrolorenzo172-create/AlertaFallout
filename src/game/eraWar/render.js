// Guerra das Eras — pixel art de alta resolução, estilo ilustração de fósforo verde.
// Cada figura é desenhada em vetor (tons de cinzento) e depois "posterizada" para 6 tons da cor do tema,
// com contorno escuro: dá o aspeto de pixel art detalhada sem guardar imagens. Tudo offline.
// As tropas são o explorador mascote da app (chapéu safari com fita, cabelo, camisa de bolsos, cinto,
// calções cargo, meias, botas e mochila com fivela), equipado conforme a era.
import { WORLD, BASE_HP, ERAS, SIEGE_AT } from './logic';

const S = 2; // píxeis do ecrã por unidade do mundo
const OFF = 24; // céu extra por cima do mundo
export const CANVAS = { w: WORLD.w * S, h: WORLD.h * S + OFF };
const GY = WORLD.ground * S + OFF; // linha do chão no ecrã
const X = (x) => Math.round(x * S);

// O campo de batalha é um ecrã de terminal de fósforo verde, fixo (não muda com o tema da app).
// useTheme = true dá as cores do tema, para os ícones dos botões à volta do ecrã.
export const SCREEN_RGB = '70 255 120';
export function themeColors(useTheme = false) {
  const v = (useTheme && getComputedStyle(document.documentElement).getPropertyValue('--c').trim()) || SCREEN_RGB;
  const [r, g, b] = v.split(/\s+/).map(Number);
  const mixA = (k) => [Math.round(r * k), Math.round(g * k), Math.round(b * k)];
  const mix = (k, a = 1) => { const [x, y, z] = mixA(k); return `rgba(${x},${y},${z},${a})`; };
  return {
    key: v, hi: mix(1), sky: mix(0.62), sky2: mix(0.42), mid: mix(0.72), low: mix(0.38), dim: mix(0.26), dark: mix(0.14), ink: mix(0.05), bg: mix(0.05),
    fire: '#ffb000', fire2: '#ff6a00', red: '#ff3b2f', white: '#f4ffe8',
    // tons da posterização: tropas do jogador, tropas inimigas e cenário
    lvA: [0.05, 0.22, 0.4, 0.6, 0.8, 1].map(mixA),
    lvB: [0.05, 0.2, 0.36, 0.54, 0.72, 0.9].map(mixA),
    lvBg: [0.05, 0.2, 0.33, 0.47, 0.62, 0.78].map(mixA),
  };
}
const R = (c, x, y, w, h) => c.fillRect(Math.round(x), Math.round(y), w, h);

// ---------- Ferramentas de desenho em tons (0 = preto … 5 = branco) ----------
const L = ['#000', '#333', '#666', '#999', '#ccc', '#fff'];
const AMBER = '#f0f'; // marcador: estes píxeis ficam em âmbar (fogo, luzes)
function fill(c, lv) { c.fillStyle = typeof lv === 'number' ? L[lv] : lv; }
function rect(c, lv, x, y, w, h) { fill(c, lv); c.fillRect(x, y, w, h); }
function circ(c, lv, x, y, r) { fill(c, lv); c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
function ell(c, lv, x, y, rx, ry) { fill(c, lv); c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); }
function rrect(c, lv, x, y, w, h, r) { fill(c, lv); c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); c.fill(); }
function poly(c, lv, pts) { fill(c, lv); c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); c.fill(); }
function line(c, lv, w, x0, y0, x1, y1) { c.strokeStyle = typeof lv === 'number' ? L[lv] : lv; c.lineWidth = w; c.lineCap = 'round'; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); }
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

function makeCanvas(w, h) {
  return (typeof OffscreenCanvas !== 'undefined') ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
}
// Converte o desenho em cinzentos para os tons do tema e acrescenta contorno
function posterize(cv, lv, outline) {
  const c = cv.getContext('2d'); const { width: w, height: h } = cv;
  const img = c.getImageData(0, 0, w, h); const d = img.data;
  const solid = new Uint8Array(w * h);
  for (let i = 0, p = 0; p < w * h; i += 4, p++) {
    if (d[i + 3] < 120) { d[i + 3] = 0; continue; }
    solid[p] = 1; d[i + 3] = 255;
    if (d[i] > 160 && d[i + 2] > 160 && d[i + 1] < 110) { d[i] = 255; d[i + 1] = 176; d[i + 2] = 0; continue; } // âmbar
    const k = Math.max(0, Math.min(5, Math.round(((d[i] + d[i + 1] + d[i + 2]) / 3 / 255) * 5)));
    const col = lv[k]; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2];
  }
  if (outline) {
    const ink = lv[0];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const p = y * w + x; if (solid[p]) continue;
      if ((x > 0 && solid[p - 1]) || (x < w - 1 && solid[p + 1]) || (y > 0 && solid[p - w]) || (y < h - 1 && solid[p + w])) {
        const i = p * 4; d[i] = ink[0]; d[i + 1] = ink[1]; d[i + 2] = ink[2]; d[i + 3] = 255;
      }
    }
  }
  c.putImageData(img, 0, 0);
  return cv;
}

const cache = new Map();
function sheet(key, w, h, draw, lv, outline = true) {
  let cv = cache.get(key);
  if (!cv) {
    cv = makeCanvas(w, h); const c = cv.getContext('2d'); draw(c);
    if (lv) posterize(cv, lv, outline);
    cache.set(key, cv);
  }
  return cv;
}
function bitmap(c, rows, x, y, P) {
  for (let j = 0; j < rows.length; j++) {
    const row = rows[j];
    for (let i = 0; i < row.length; i++) { const ch = row[i]; if (ch === '.') continue; c.fillStyle = P[ch]; c.fillRect(x + i, y + j, 1, 1); }
  }
}

// ---------- A mascote (chibi, perfil virado para a direita). Caixa 48x64, pés em y≈62 ----------
// o: { era, type, frame (0..3), atk, sit }
function chibi(c, o) {
  const { era, frame, sit } = o;
  const step = [0, 2.5, 0, -2.5][frame];
  const bob = frame % 2 ? -1 : 0;
  const armor = era === 4;
  c.save(); c.translate(0, bob);
  // mochila (atrás) com bolso e fivela
  rrect(c, 2, 6.5, 28, 11.5, 18, 3.5); rrect(c, 3, 7.5, 28.5, 9.5, 4, 2);
  rrect(c, 3, 8, 35, 9, 8, 1.5); rect(c, 1, 8, 35, 9, 1.4); rect(c, 4, 11.4, 35.5, 2.2, 3);
  // braço de trás
  rrect(c, 3, 14, 32, 5, 11, 2);
  // pernas, meias e botas
  if (!sit) {
    const lg = (x, dx, lift) => {
      rect(c, armor ? 3 : 4, x + dx, 50 - lift, 5, 8);
      rect(c, armor ? 3 : 5, x + dx - 0.5, 54 - lift, 6, 3); rect(c, 4, x + dx - 0.5, 55.5 - lift, 6, 0.8); // meia dobrada
      rrect(c, armor ? 2 : 2, x + dx - 1, 57 - lift, armor ? 9.5 : 8.5, 5.5, 2); rect(c, 1, x + dx - 1, 61 - lift, armor ? 9.5 : 8.5, 1.5); // bota e sola
      rect(c, 4, x + dx + 2, 58 - lift, 2, 1);
    };
    lg(17, -step, step > 0 ? 1 : 0); lg(24, step, step < 0 ? 1 : 0);
  }
  // calções cargo com bolso lateral
  rrect(c, 3, 15, 43, 18, 8.5, 2); rect(c, 2, 23.5, 46, 1, 5.5);
  rect(c, 2, 26.5, 46, 5.5, 4.5); rect(c, 1, 26.5, 46, 5.5, 1.2);
  // tronco (camisa de explorador com bolsos de pala)
  rrect(c, 4, 15, 29, 18, 16, 4);
  rect(c, 5, 22, 29, 5, 3); poly(c, 3, [22, 29, 24.5, 33, 27, 29]); // gola
  rect(c, 3, 18, 34, 5, 5); rect(c, 3, 27, 34, 5, 5); rect(c, 2, 18, 34, 5, 1.3); rect(c, 2, 27, 34, 5, 1.3); // bolsos
  rect(c, 2, 24, 33, 1, 1); rect(c, 2, 24, 37, 1, 1); rect(c, 2, 24, 41, 1, 1); // botões
  line(c, 1, 2, 17, 30, 20, 43); // alça da mochila
  rect(c, 1, 15, 42.5, 18, 2.2); rect(c, 5, 23, 42.5, 3, 2.2); // cinto e fivela
  // equipamento de corpo por era
  if (era === 1) { ell(c, 3, 28, 31, 6, 4); rect(c, 5, 25, 30, 1, 1); rect(c, 5, 30, 30, 1, 1); rect(c, 3, 19, 36, 12, 6); line(c, 2, 1, 19, 39, 31, 39); }
  if (era === 2) { line(c, 1, 3, 17, 30, 31, 43); for (let i = 0; i < 5; i++) rect(c, 5, 19 + i * 2.6, 32 + i * 2.4, 2, 2); }
  if (era === 3) { rrect(c, 2, 15, 30, 18, 13, 3); rect(c, 3, 17, 36, 5, 5); rect(c, 3, 25, 36, 5, 5); rect(c, 1, 17, 36, 5, 1); rect(c, 1, 25, 36, 5, 1); }
  if (armor) { rrect(c, 3, 14, 29, 20, 15, 4); rect(c, 4, 18, 32, 12, 6); rect(c, 2, 18, 38, 12, 1); ell(c, 3, 29, 31, 7, 5); ell(c, 4, 29, 30, 4, 2); rect(c, AMBER, 23, 34, 2, 2); }
  // cabeça grande
  circ(c, 4, 24, 20, 11.5); circ(c, 5, 25.3, 20.3, 10.3);
  ell(c, 4, 18.5, 22, 2.2, 2.8); rect(c, 3, 18.3, 21, 1, 2); // orelha
  // cabelo (nuca e franja)
  poly(c, 2, [12.5, 14, 17.5, 13, 18, 18, 16.5, 21, 17, 26, 13, 23, 14, 20]);
  poly(c, 2, [26, 12, 36, 13, 35.5, 17, 33, 15.5, 31, 17.5, 29, 15]);
  // rosto
  rect(c, 0, 28, 18, 2.5, 4); rect(c, 5, 28.6, 18.6, 1, 1); // olho
  rect(c, 1, 27.5, 15.8, 4, 1.2); // sobrancelha
  c.lineWidth = 1.3; c.strokeStyle = L[1]; c.beginPath(); c.arc(30.5, 23.5, 2.6, 0.3, 1.9); c.stroke(); // sorriso
  rect(c, 4, 32, 22, 2, 1); // bochecha
  // chapéu / capacete
  if (era <= 2) {
    ell(c, 3, 23.5, 12.5, 17, 4.6); ell(c, 2, 23.5, 14.2, 15, 2.2); ell(c, 3, 23.5, 12, 16, 3.6);
    poly(c, 4, [13.5, 12, 15, 4, 19, 1.2, 28, 1.2, 32, 4, 33.5, 12]); line(c, 3, 1.2, 20, 3, 23.5, 5); rect(c, 2, 25, 5, 1.5, 1.5);
    rect(c, 1, 14, 9, 19.5, 2.6); // fita
    if (era === 0) { line(c, 5, 2.4, 15.5, 9, 9, -2); line(c, 3, 1, 15.5, 9, 9.5, -1.5); rect(c, 0, 33, 12, 3, 2); } // pena e aba rasgada
    if (era === 2) { circ(c, 1, 20, 9.5, 3.4); circ(c, 1, 27.5, 9.5, 3.4); circ(c, 5, 20, 9.5, 2); circ(c, 5, 27.5, 9.5, 2); } // óculos de proteção
  } else if (era === 3) {
    poly(c, 2, [11.5, 15, 12.5, 7, 17, 2.5, 30, 2.5, 34.5, 7, 36, 14, 33, 13, 12.5, 16]);
    rect(c, 3, 15, 5, 16, 2); rect(c, 1, 12, 13, 24, 2.5); line(c, 1, 1.2, 18, 15, 22, 30); // capacete com fita
    rect(c, 3, 14, 9, 4, 3);
  } else {
    poly(c, 3, [12, 17, 12, 7, 16.5, 2, 31, 2, 36, 7, 37, 18, 34, 22, 14, 22]); // capacete de armadura
    rect(c, 4, 15, 4, 16, 2);
    rrect(c, 1, 22, 15, 15, 6, 2); rect(c, AMBER, 24, 17, 12, 2); // viseira luminosa
    rect(c, 2, 13, 11, 6, 6); circ(c, 4, 16, 14, 2);
  }
  c.restore();
}

// Arma na mão (braço da frente), desenhada por cima do corpo
function weapon(c, o) {
  const { era, type, atk, frame } = o;
  const bob = frame % 2 ? -1 : 0;
  c.save(); c.translate(0, bob);
  const sh = [28, 33];
  const hand = type === 0 ? (atk ? [37, 33] : [32, 41]) : [35, 38];
  line(c, era === 4 ? 3 : 4, 5, sh[0], sh[1], hand[0], hand[1]); rect(c, era === 4 ? 2 : 3, sh[0] - 3, sh[1] - 3, 6, 4); // manga
  if (type === 0) {
    if (era === 0) { const tip = atk ? [46, 22] : [42, 30]; line(c, 2, 3, hand[0], hand[1], tip[0], tip[1]); circ(c, 2, tip[0], tip[1], 3.4); circ(c, 3, tip[0] - 0.8, tip[1] - 0.8, 1.5); rect(c, 1, tip[0] + 1, tip[1] - 4, 1.5, 2); } // moca
    else if (era === 1) { const tip = atk ? [47, 26] : [40, 24]; line(c, 1, 3, hand[0] - 2, hand[1] + 1, hand[0] + 2, hand[1] - 1); line(c, 5, 2.6, hand[0], hand[1], tip[0], tip[1]); line(c, 3, 1, hand[0] + 1, hand[1] - 0.5, tip[0], tip[1]); } // espada de sucata
    else if (era === 2) { const tip = atk ? [46, 28] : [39, 28]; line(c, 2, 2, hand[0], hand[1] + 3, tip[0], tip[1]); poly(c, 3, [tip[0] - 3, tip[1] - 4, tip[0] + 3, tip[1] - 2, tip[0] + 1, tip[1] + 3, tip[0] - 4, tip[1] + 1]); } // pá de trincheira
    else if (era === 3) { rect(c, 1, hand[0] - 3, hand[1] - 3, 13, 3.5); rect(c, 1, hand[0] - 1, hand[1], 3, 5); rect(c, 3, hand[0] + 1, hand[1] - 2.5, 6, 1); if (atk) circ(c, AMBER, hand[0] + 12, hand[1] - 1.5, 2.5); } // carabina curta
    else { const tip = atk ? [47, 24] : [42, 26]; line(c, 1, 3.5, hand[0], hand[1], hand[0] + 2, hand[1] - 2); line(c, 5, 3, hand[0] + 2, hand[1] - 2, tip[0], tip[1]); circ(c, 5, tip[0], tip[1], 1.8); } // bastão de energia
  } else if (type === 1) {
    if (era === 0) { // funda a rodar
      const a = atk ? -0.6 : 0.9; const sx = hand[0] + Math.cos(a) * 9; const sy = hand[1] - 2 + Math.sin(a) * 9;
      line(c, 1, 1, hand[0], hand[1] - 1, sx, sy); circ(c, 2, sx, sy, 2.2);
    } else if (era === 1) { // besta
      rect(c, 2, hand[0] - 6, hand[1] - 2, 14, 3); line(c, 1, 2, hand[0] + 6, hand[1] - 8, hand[0] + 6, hand[1] + 5); line(c, 4, 1, hand[0] + 6, hand[1] - 7, hand[0] - 4, hand[1] - 0.5); line(c, 4, 1, hand[0] + 6, hand[1] + 4, hand[0] - 4, hand[1] - 0.5);
    } else { // espingarda (2), de precisão (3), laser (4)
      const len = era === 2 ? 17 : 20;
      rect(c, era === 4 ? 3 : 2, hand[0] - 9, hand[1] - 3, len, 4); rect(c, 1, hand[0] + len - 9, hand[1] - 2.5, era === 4 ? 4 : 3, 2);
      rect(c, 2, hand[0] - 11, hand[1] - 2, 4, 5); rect(c, 1, hand[0] - 1, hand[1] + 1, 3, 4);
      if (era === 3) { rect(c, 1, hand[0] - 2, hand[1] - 6, 7, 2.5); rect(c, 4, hand[0] + 4, hand[1] - 5.5, 1, 1.5); }
      if (era === 4) { rect(c, AMBER, hand[0] - 4, hand[1] - 2, 8, 1.5); rect(c, 4, hand[0] + len - 6, hand[1] - 4, 2, 6); }
      if (atk) { circ(c, AMBER, hand[0] + len - 3, hand[1] - 1.5, 3); rect(c, AMBER, hand[0] + len - 1, hand[1] - 2, 5, 1.5); }
    }
  }
  circ(c, 5, hand[0], hand[1], 2.6); // mão
  c.restore();
}

// ---------- Unidades pesadas (caixa 88x72) ----------
function rider(c, o, x, y, s) { c.save(); c.translate(x, y); c.scale(s, s); chibi(c, { ...o, sit: true }); weapon(c, { ...o, type: 0 }); c.restore(); }
function heavy(c, o) {
  const { era, frame, atk } = o;
  const st = [0, 2, 0, -2][frame];
  if (era === 0) { // javali com explorador de lança
    ell(c, 2, 38, 48, 24, 12); ell(c, 3, 34, 44, 16, 6);
    for (let i = 0; i < 9; i++) line(c, 1, 1.5, 22 + i * 4, 37, 21 + i * 4, 32 - (i % 2) * 2);
    ell(c, 2, 62, 50, 9, 8); ell(c, 3, 69, 53, 4, 3); rect(c, 0, 63, 46, 2.5, 2.5); line(c, 5, 2, 66, 56, 72, 50);
    poly(c, 1, [58, 41, 60, 34, 63, 42]);
    for (const [lx, dx] of [[24, st], [32, -st], [48, st], [55, -st]]) { rect(c, 1, lx + dx, 56, 4, 12); rect(c, 0, lx + dx - 1, 66, 6, 3); }
    c.save(); c.translate(20, 0); c.scale(0.75, 0.75); chibi(c, { ...o, sit: true }); c.restore();
    const tx = atk ? 84 : 78; const ty = atk ? 30 : 20;
    line(c, 2, 2.5, 36, 34, tx, ty); poly(c, 4, [tx - 2, ty - 3, tx + 3, ty, tx - 2, ty + 3]); circ(c, 5, 42, 33, 2.2);
  } else if (era === 1) { // cavalo de sucata
    rrect(c, 3, 16, 36, 46, 18, 4); for (let i = 0; i < 5; i++) rect(c, 5, 20 + i * 9, 39, 2, 2); rect(c, 2, 16, 47, 46, 2);
    poly(c, 3, [58, 38, 66, 20, 76, 22, 78, 30, 70, 32, 64, 44]); rect(c, 0, 70, 24, 3, 2.5); rect(c, AMBER, 70.5, 24.5, 2, 1.5); line(c, 1, 2, 66, 20, 63, 14);
    for (const [lx, dx] of [[20, st], [28, -st], [48, st], [56, -st]]) { rect(c, 2, lx + dx, 53, 4, 14); rect(c, 1, lx + dx - 1, 65, 6, 4); }
    line(c, 1, 2, 14, 40, 6, 52);
    rider(c, { ...o, era: 1 }, 18, -2, 0.75);
  } else if (era === 2) { // canhão a vapor
    circ(c, 1, 30, 58, 12); circ(c, 3, 30, 58, 9); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + frame * 0.4; line(c, 1, 1.5, 30, 58, 30 + Math.cos(a) * 9, 58 + Math.sin(a) * 9); } circ(c, 2, 30, 58, 3);
    rrect(c, 2, 14, 40, 34, 14, 3); rrect(c, 3, 18, 28, 16, 14, 6); rect(c, 1, 22, 16, 5, 14); rect(c, 4, 20, 34, 12, 2);
    line(c, 1, 9, 40, 44, 74, atk ? 38 : 36); line(c, 3, 6, 40, 44, 74, atk ? 38 : 36); rect(c, 1, 72, 31, 4, 12);
    circ(c, 2, 58, 62, 7); circ(c, 3, 58, 62, 4);
    if (atk) circ(c, AMBER, 80, 37, 5);
    c.save(); c.translate(-6, 8); c.scale(0.72, 0.72); chibi(c, { ...o, era: 2, frame: 0 }); c.restore();
  } else if (era === 3) { // blindado com o explorador na escotilha
    poly(c, 2, [6, 44, 14, 32, 64, 32, 76, 44, 76, 58, 6, 58]); rect(c, 3, 14, 36, 50, 4); rect(c, 1, 8, 48, 66, 2);
    rrect(c, 1, 4, 56, 74, 13, 6); for (let i = 0; i < 7; i++) circ(c, 3, 11 + i * 10.3, 62.5, 4); for (let i = 0; i < 18; i++) rect(c, 2, 6 + ((i * 4 + frame * 2) % 70), 56, 2, 1.5);
    c.save(); c.translate(26, -6); c.scale(0.7, 0.7); chibi(c, { ...o, era: 3, sit: true }); c.restore();
    rrect(c, 3, 26, 22, 28, 12, 4); rect(c, 1, 52, 25, 28, 4); rect(c, 2, 76, 24, 5, 6);
    if (atk) circ(c, AMBER, 84, 27, 4.5);
  } else { // exo-armadura
    for (const [lx, dx] of [[24, st], [46, -st]]) { rrect(c, 3, lx + dx, 44, 10, 20, 3); rrect(c, 2, lx + dx - 3, 62, 16, 7, 2); circ(c, 4, lx + dx + 5, 50, 3); }
    rrect(c, 3, 16, 14, 46, 34, 8); rrect(c, 4, 20, 18, 38, 8, 3); rect(c, 2, 16, 38, 46, 3);
    rrect(c, 1, 26, 20, 28, 20, 6); c.save(); c.translate(19, 2); c.scale(0.62, 0.62); chibi(c, { ...o, era: 2, sit: true }); c.restore();
    rrect(c, 2, 56, 26, 22, 9, 3); rect(c, 1, 76, 28, 6, 5); rect(c, AMBER, 64, 29, 10, 2);
    if (atk) circ(c, AMBER, 84, 30.5, 4);
    rect(c, AMBER, 22, 42, 3, 3); rect(c, AMBER, 52, 42, 3, 3);
  }
}

const UW = 50; const UH = 66; const HW = 90; const HH = 74;
function unitSprite(C, side, era, type, frame, atk) {
  const key = `${C.key}|u${side}${era}${type}${frame}${atk ? 1 : 0}`;
  const o = { era, type, frame, atk };
  if (type === 2) return sheet(key, HW, HH, (c) => { c.translate(1, 1); heavy(c, o); }, side ? C.lvB : C.lvA);
  return sheet(key, UW, UH, (c) => { c.translate(1, 2); chibi(c, o); weapon(c, o); }, side ? C.lvB : C.lvA);
}

// ---------- Cenário (desenhado uma vez por tema), em camadas com contorno de ilustração ----------
const LANE = 336; // linha de combate (pés das tropas)
const H = CANVAS.h; const WD = CANVAS.w;
function layer(C, lv, outline, draw) { const cv = makeCanvas(WD, H); draw(cv.getContext('2d')); return posterize(cv, lv, outline); }
function backdrop(C) {
  return sheet(`${C.key}|bg`, WD, H, (out) => {
    const lv = C.lvBg; const r = rng(7);
    // céu claro e liso
    rect(out, 5, 0, 0, WD, H); posterize(out.canvas, lv, false);
    const ridge = (x) => 150 + Math.sin(x * 0.0065 + 0.8) * 22 + Math.sin(x * 0.019 + 2) * 10 + Math.max(0, Math.sin(x * 0.011 - 1)) * -26;
    // montanhas ao longe
    out.drawImage(layer(C, lv, true, (c) => {
      fill(c, 4); c.beginPath(); c.moveTo(0, H); for (let x = 0; x <= WD; x += 4) c.lineTo(x, ridge(x)); c.lineTo(WD, H); c.fill();
      for (let i = 0; i < 40; i++) { const x = r() * WD; const y = ridge(x) + 8 + r() * 30; line(c, 3, 1.5, x, y, x + 10 + r() * 20, y + 4 + r() * 8); }
    }), 0, 0);
    // colinas do meio: manilha partida, muro e cerca caídos, árvores retorcidas
    const hill = (x) => 205 + Math.sin(x * 0.01 + 1.4) * 10 + Math.sin(x * 0.033) * 4 - Math.max(0, 1 - Math.abs(x - 440) / 120) * 34;
    out.drawImage(layer(C, lv, true, (c) => {
      fill(c, 3); c.beginPath(); c.moveTo(0, H); for (let x = 0; x <= WD; x += 4) c.lineTo(x, hill(x)); c.lineTo(WD, H); c.fill();
      for (let i = 0; i < 70; i++) { const x = r() * WD; const y = hill(x) + 6 + r() * 40; line(c, 2, 1.5, x, y, x + 6 + r() * 16, y + 2 + r() * 5); }
      // manilha de betão partida
      ell(c, 3, 440, 158, 40, 34); ell(c, 4, 434, 152, 33, 28); ell(c, 0, 444, 160, 25, 22); ell(c, 1, 450, 166, 14, 12);
      poly(c, 3, [400, 182, 480, 182, 490, 196, 396, 196]);
      for (let i = 0; i < 6; i++) rect(c, 2, 470 + i * 6, 140 + i * 9, 4, 3);
    }), 0, 0);
    out.drawImage(layer(C, lv, true, (c) => {
      // muro baixo partido e cerca
      for (let x = 330; x < 640; x += 18) { const h = 10 + ((x * 7) % 9); rrect(c, 4, x, 222 - h, 15, h, 2); }
      for (let x = 340; x < 660; x += 34) rect(c, 2, x, 200, 4, 26);
      for (let x = 340; x < 660; x += 2) rect(c, 1, x, 206 + Math.sin(x * 0.07) * 2, 2, 1.2);
      // árvores mortas retorcidas
      const tree = (x, y, s) => { line(c, 1, 7 * s, x, y, x - 6 * s, y - 40 * s); line(c, 1, 5 * s, x - 6 * s, y - 40 * s, x + 6 * s, y - 70 * s); line(c, 1, 4 * s, x - 4 * s, y - 34 * s, x - 26 * s, y - 52 * s); line(c, 1, 3 * s, x - 26 * s, y - 52 * s, x - 22 * s, y - 70 * s); line(c, 1, 4 * s, x + 2 * s, y - 56 * s, x + 24 * s, y - 64 * s); line(c, 1, 3 * s, x + 24 * s, y - 64 * s, x + 30 * s, y - 86 * s); line(c, 1, 3 * s, x + 6 * s, y - 70 * s, x - 4 * s, y - 92 * s); };
      tree(690, 236, 1); tree(730, 230, 0.8);
      // fumo/onda esquisita no céu (rasto)
      for (let x = 290; x < 350; x += 2) rect(c, 4, x, 118 + Math.sin(x * 0.35) * 4, 2, 2);
    }), 0, 0);
    // campo de batalha
    out.drawImage(layer(C, lv, true, (c) => {
      const top = (x) => 238 + Math.sin(x * 0.02) * 4;
      fill(c, 3); c.beginPath(); c.moveTo(0, H); for (let x = 0; x <= WD; x += 6) c.lineTo(x, top(x)); c.lineTo(WD, H); c.fill();
      for (let i = 0; i < 260; i++) { const x = r() * WD; const y = 244 + r() * (H - 244); line(c, r() > 0.3 ? 2 : 4, 1.4, x, y, x + 4 + r() * 14, y + r() * 2); }
      for (let i = 0; i < 14; i++) { const x = 200 + r() * 560; const y = 250 + r() * 70; ell(c, 2, x, y, 14 + r() * 26, 3 + r() * 3); } // manchas
      // cratera onde rebentam os impactos
      ell(c, 1, 520, 300, 46, 10); ell(c, 2, 520, 298, 36, 6);
      for (let i = 0; i < 8; i++) rrect(c, 4, 488 + i * 9, 294 - (i % 3) * 3, 8, 6, 3);
    }), 0, 0);
    out.drawImage(layer(C, lv, true, (c) => { for (let i = 0; i < 22; i++) { const x = 160 + r() * 640; const y = 252 + r() * 150; ell(c, 4, x, y, 2 + r() * 4, 1.5 + r() * 2.5); } }), 0, 0);
    // primeiro plano: fenda da trincheira, sacos de areia e arame farpado
    out.drawImage(layer(C, lv, true, (c) => {
      poly(c, 0, [404, H, 420, 380, 432, 366, 448, 352, 470, 350, 476, 362, 466, 382, 470, H]);
      poly(c, 1, [424, H, 434, 382, 452, 362, 462, 368, 452, 392, 456, H]);
      line(c, 1, 2, 470, 350, 500, 346); line(c, 1, 2, 404, 380, 370, 392);
    }), 0, 0);
    const bag = (c, x, y, w = 30, h = 15) => { rrect(c, 4, x, y, w, h, 7); line(c, 5, 2, x + 6, y + 4, x + w - 8, y + 4); line(c, 3, 1.5, x + 5, y + h - 3, x + w - 5, y + h - 3); };
    out.drawImage(layer(C, lv, true, (c) => {
      // pilha diagonal ao lado da trincheira
      for (let j = 0; j < 3; j++) for (let i = 0; i < 4 - j; i++) bag(c, 476 + i * 30 + j * 16 - j * 10, 372 - j * 13 - i * 9);
      for (let i = 0; i < 3; i++) bag(c, 486 + i * 28, 342 - i * 6, 26, 13);
      // pilha à frente, em baixo
      for (let i = 0; i < 7; i++) bag(c, 272 + i * 32, H - 22 + (i % 2) * 2);
      for (let i = 0; i < 5; i++) bag(c, 290 + i * 32, H - 36);
    }), 0, 0);
    out.drawImage(layer(C, lv, true, (c) => {
      const post = (x, y, h) => poly(c, 1, [x, y, x + 3, y - h, x + 12, y - h - 2, x + 10, y]);
      const wire = (x0, y0, x1, y1) => { const n = Math.hypot(x1 - x0, y1 - y0); for (let i = 0; i < n; i += 2) { const x = x0 + (x1 - x0) * i / n; const y = y0 + (y1 - y0) * i / n + Math.sin(i * 0.25) * 3; rect(c, 0, x, y, 2, 1.6); if (i % 12 === 0) { rect(c, 0, x - 2, y - 3, 1.5, 6); rect(c, 0, x - 3, y, 6, 1.5); } } };
      post(640, H, 46); post(726, H, 62); post(830, H - 6, 80); post(912, H, 50);
      wire(640, H - 30, 726, H - 46); wire(726, H - 46, 830, H - 64); wire(830, H - 64, 960, H - 50); wire(640, H - 14, 960, H - 26);
      post(20, H, 54); wire(0, H - 36, 170, H - 20); wire(0, H - 16, 190, H - 6);
      line(c, 0, 4, 60, H - 30, 120, H - 50); line(c, 0, 4, 120, H - 50, 160, H - 34); // ramo seco
      for (let i = 0; i < 8; i++) ell(c, 3, 180 + r() * 600, H - 6 - r() * 10, 3 + r() * 5, 2 + r() * 2);
    }), 0, 0);
  });
}

// ---------- Bases: entrada oval de abrigo escavada na rocha, com aro blindado ----------
function baseSprite(C, era, hurt) {
  return sheet(`${C.key}|base${era}${hurt ? 1 : 0}`, 240, H, (out) => {
    const lv = C.lvBg; const r = rng(11 + era); const cx = 112; const cy = 188; const rx = 60; const ry = 82;
    out.drawImage(layer(C, lv, true, (c) => { // massa rochosa
      poly(c, 3, [0, 40, 40, 30, 80, 48, 130, 40, 176, 64, 206, 108, 222, 170, 226, 250, 232, LANE + 14, 0, LANE + 30]);
    }), 0, 0);
    out.drawImage(layer(C, lv, true, (c) => { // pedregulhos com volume
      for (const [x, y, w, h] of [[30, 60, 40, 26], [92, 54, 46, 24], [160, 80, 36, 26], [196, 136, 26, 34], [208, 214, 22, 40], [16, 140, 30, 40], [22, 236, 30, 46], [190, 290, 34, 30], [56, 300, 60, 26]]) {
        rrect(c, 3, x - w, y - h, w * 2, h * 2, h * 0.9); rrect(c, 4, x - w * 0.8, y - h * 0.85, w * 1.2, h * 0.8, h * 0.5); line(c, 2, 1.5, x - w * 0.4, y + h * 0.4, x + w * 0.6, y + h * 0.5);
      }
    }), 0, 0);
    out.drawImage(layer(C, lv, true, (c) => { // aro blindado grosso à volta da entrada
      ell(c, 3, cx, cy, rx + 16, ry + 16); ell(c, 4, cx - 4, cy - 4, rx + 10, ry + 10); ell(c, 2, cx + 2, cy + 3, rx + 6, ry + 6);
      for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; circ(c, 5, cx + Math.cos(a) * (rx + 10), cy + Math.sin(a) * (ry + 10), 2.6); }
    }), 0, 0);
    out.drawImage(layer(C, lv, true, (c) => { // interior escuro com fendas e porta encostada
      ell(c, 0, cx, cy, rx, ry); ell(c, 1, cx + 6, cy + 4, rx - 14, ry - 16);
      for (let i = 0; i < 7; i++) { const y = cy - ry + 26 + i * 20; line(c, 2, 1.6, cx - rx + 16 + r() * 8, y, cx + rx - 18 - r() * 8, y + (r() - 0.5) * 16); }
      line(c, 2, 1.6, cx - 6, cy - ry + 14, cx + 4, cy + ry - 12); line(c, 2, 1.6, cx + 22, cy - ry + 20, cx + 18, cy + ry - 20);
    }), 0, 0);
    out.drawImage(layer(C, lv, true, (c) => { // anel exterior encostado à borda do ecrã
      c.lineWidth = 26; c.strokeStyle = L[3]; c.beginPath(); c.arc(-30, 260, 92, -1.2, 1.25); c.stroke();
      c.lineWidth = 6; c.strokeStyle = L[4]; c.beginPath(); c.arc(-30, 260, 100, -1.15, 1.2); c.stroke();
      for (let i = 0; i < 7; i++) { const a = -1.05 + i * 0.36; circ(c, 2, -30 + Math.cos(a) * 92, 260 + Math.sin(a) * 92, 3.4); }
    }), 0, 0);
    out.drawImage(layer(C, lv, true, (c) => { // detalhes da era no topo
      if (era === 0) { line(c, 1, 3, 70, 40, 70, 6); circ(c, 5, 70, 6, 6); rect(c, 0, 66, 4, 3, 3); rect(c, 0, 71, 4, 3, 3); }
      if (era === 1) for (let i = 0; i < 6; i++) poly(c, i % 2 ? 3 : 4, [20 + i * 24, 46, 28 + i * 24, 8 + (i % 3) * 6, 36 + i * 24, 46]);
      if (era === 2) { rect(c, 2, 40, 0, 18, 46); rect(c, 3, 37, 0, 24, 6); }
      if (era === 3) { line(c, 1, 3, 150, 50, 150, 0); for (let i = 0; i < 5; i++) bagS(c, 20 + i * 26, 30); }
      if (era === 4) { rrect(c, 3, 40, 14, 90, 26, 6); for (let i = 0; i < 6; i++) rect(c, AMBER, 48 + i * 13, 22, 7, 6); rect(c, AMBER, cx - 3, cy - ry - 20, 6, 5); }
      if (hurt) { for (const [x, y] of [[40, 120], [196, 200], [30, 250]]) circ(c, AMBER, x, y, 5); }
    }), 0, 0);
  });
}
function bagS(c, x, y) { rrect(c, 4, x, y, 24, 13, 6); line(c, 5, 2, x + 5, y + 3, x + 18, y + 3); }

// moldura translúcida do HUD junto a cada base (barra vertical de vida e caixa do "500 HP")
function drawHudFrames(c, C, g) {
  [0, 1].forEach((side) => {
    const sd = g.sides[side]; const p = Math.max(0, sd.hp / BASE_HP);
    const bx = side === 0 ? 226 : WD - 238; const bh = 172;
    c.fillStyle = C.ink; R(c, bx - 2, 0, 16, bh + 2);
    c.fillStyle = C.dark; R(c, bx, 0, 12, bh);
    c.fillStyle = p < 0.3 ? C.red : side === 0 ? C.hi : C.fire; const fh = Math.round(bh * p); R(c, bx, bh - fh, 12, fh);
    c.fillStyle = C.ink; for (let y = 10; y < bh; y += 12) R(c, bx, y, 12, 2);
    // caixa do HP
    const fx = side === 0 ? 214 : WD - 334; c.strokeStyle = C.mid; c.lineWidth = 3; c.globalAlpha = 0.85;
    c.beginPath(); c.roundRect ? c.roundRect(fx, bh + 4, 120, 70, 10) : c.rect(fx, bh + 4, 120, 70); c.stroke();
    c.globalAlpha = 0.25; c.fillStyle = C.dark; c.fill(); c.globalAlpha = 1;
  });
}

// torres: plataformas nas rochas por cima da entrada
const TUR = [{ x: 150, y: 50 }, { x: 70, y: 52 }, { x: 196, y: 92 }];
function turretSprite(C, era) {
  return sheet(`${C.key}|tur${era}`, 46, 38, (c) => {
    c.translate(1, 1);
    rrect(c, 1, 2, 26, 40, 9, 2); rect(c, 3, 4, 28, 36, 3);
    if (era === 0) { poly(c, 2, [10, 26, 22, 6, 34, 26]); line(c, 3, 2, 22, 6, 22, 26); circ(c, 4, 22, 8, 4); }
    else if (era === 1) { rect(c, 2, 8, 16, 28, 10); line(c, 4, 2, 10, 14, 34, 14); circ(c, 3, 22, 18, 4); }
    else if (era === 2) { rrect(c, 2, 8, 10, 26, 16, 4); rect(c, 1, 14, 2, 5, 9); circ(c, 4, 21, 18, 5); }
    else if (era === 3) { for (let i = 0; i < 3; i++) { rrect(c, 1, 3 + i * 13, 17, 14, 10, 5); rrect(c, 4, 4 + i * 13, 18, 12, 8, 4); } rect(c, 2, 14, 10, 16, 8); }
    else { rrect(c, 3, 10, 4, 24, 22, 6); rect(c, 1, 14, 9, 16, 6); rect(c, AMBER, 15, 11, 14, 2); }
  }, C.lvA, true);
}
function drawTurrets(c, C, side, sd) {
  for (let k = 0; k < sd.slots; k++) {
    const p = TUR[k]; const x = side === 0 ? p.x : CANVAS.w - p.x; const y = p.y;
    const t = sd.turrets[k];
    c.fillStyle = C.ink; R(c, x - 24, y + 31, 48, 6); c.fillStyle = C.low; R(c, x - 22, y + 32, 44, 2);
    if (!t) continue;
    const sp = turretSprite(C, t.era);
    c.save(); c.translate(x, y); if (side === 1) c.scale(-1, 1); c.drawImage(sp, -23, 0); c.restore();
    if (t.era === 0) continue;
    const tx = t.aim ? X(t.aim) : (side === 0 ? x + 160 : x - 160);
    const ang = Math.atan2(LANE - 30 - (y + 16), tx - x); const len = 24;
    c.strokeStyle = C.ink; c.lineWidth = 7; c.beginPath(); c.moveTo(x, y + 16); c.lineTo(x + Math.cos(ang) * len, y + 16 + Math.sin(ang) * len); c.stroke();
    c.strokeStyle = t.era === 4 ? C.fire : C.mid; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y + 16); c.lineTo(x + Math.cos(ang) * (len - 2), y + 16 + Math.sin(ang) * (len - 2)); c.stroke();
  }
}

// ---------- Projéteis e efeitos (em coordenadas do mundo, ampliadas) ----------
function drawShots(c, C, shots) {
  for (const s of shots) {
    if (s.era === 4) { c.fillStyle = C.fire; R(c, s.x - 5, s.y, 10, 1); c.fillStyle = C.white; R(c, s.x - 2, s.y, 4, 1); }
    else if (s.era === 1 && s.kind === 'unit') { c.fillStyle = C.ink; R(c, s.x - 4, s.y, 8, 1); }
    else if (s.era === 0) { c.fillStyle = C.ink; R(c, s.x - 1.5, s.y - 1.5, 3, 3); }
    else { c.fillStyle = C.fire; R(c, s.x - 2, s.y, 4, 1); c.fillStyle = C.white; R(c, s.x, s.y, 1, 1); }
  }
}
function drawFx(c, C, fx, t) {
  let plane = false; const W = WORLD.w; const G = WORLD.ground;
  for (const f of fx) {
    if (f.kind === 'boom') {
      const k = f.t / f.life; const r = (f.big ? 13 : 7) * (0.4 + k);
      c.fillStyle = k < 0.4 ? C.white : k < 0.7 ? C.fire : C.ink;
      for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; R(c, f.x + Math.cos(a) * r, f.y + Math.sin(a) * r * 0.6, 2, 2); }
      if (k < 0.35) { c.fillStyle = C.fire; R(c, f.x - 4, f.y - 4, 8, 8); c.fillStyle = C.white; R(c, f.x - 2, f.y - 2, 4, 4); }
      continue;
    }
    if (f.delay > 0) continue;
    if (f.kind === 'meteor') {
      c.fillStyle = C.fire2; for (let i = 1; i < 7; i++) R(c, f.x - i * 1.5, f.y - i * 4, 4 - i * 0.4, 3);
      c.fillStyle = C.ink; R(c, f.x - 4, f.y - 4, 8, 8); c.fillStyle = C.fire; R(c, f.x - 3, f.y - 3, 6, 6); c.fillStyle = C.low; R(c, f.x - 1, f.y - 2, 3, 3);
    } else if (f.kind === 'shells') { c.fillStyle = C.ink; R(c, f.x - 2, f.y - 4, 4, 7); c.fillStyle = C.mid; R(c, f.x - 1, f.y - 3, 2, 4); c.fillStyle = C.fire; R(c, f.x, f.y - 8, 1, 3); }
    else if (f.kind === 'bombs') { plane = true; c.fillStyle = C.ink; R(c, f.x - 2, f.y - 5, 5, 8); R(c, f.x - 3, f.y - 6, 7, 1); }
    else if (f.kind === 'gas') {
      const a = Math.min(1, f.t / 0.4) * Math.min(1, (f.life - f.t) / 0.8);
      c.globalAlpha = 0.55 * a;
      for (let i = 0; i < 16; i++) { const ang = i * 2.4 + t * 1.5; const rr = (f.r - 6) * ((i % 5) / 5 + 0.3); c.fillStyle = i % 3 ? C.hi : C.fire; R(c, f.x + Math.cos(ang) * rr - 4, f.y + Math.sin(ang * 1.3) * 8 - 3, 8, 6); }
      c.globalAlpha = 1;
    } else if (f.kind === 'nuke') {
      c.fillStyle = C.ink; R(c, f.x - 4, f.y - 7, 8, 12); R(c, f.x - 6, f.y - 9, 12, 2); c.fillStyle = C.fire; R(c, f.x - 2, f.y - 3, 4, 4);
    } else if (f.kind === 'shock') {
      const k = f.t / f.life;
      if (k < 0.25) { c.globalAlpha = (0.25 - k) * 3.2; c.fillStyle = C.white; R(c, 0, -OFF, W, WORLD.h + OFF); c.globalAlpha = 1; }
      const rr = k * 260; c.fillStyle = k < 0.5 ? C.fire : C.hi;
      for (let i = 0; i < 60; i++) { const a = (i / 60) * Math.PI; R(c, f.x + Math.cos(a) * rr, G - Math.sin(a) * rr * 0.35, 3, 2); }
      const h = Math.min(1, k * 2.2) * 80; const top = G - h;
      c.fillStyle = C.ink; R(c, f.x - 6, top, 12, h); c.fillStyle = C.fire; R(c, f.x - 4, top, 8, h); c.fillStyle = C.hi; R(c, f.x - 1, top, 2, h);
      const cw = 20 + k * 28;
      c.fillStyle = C.ink; R(c, f.x - cw, top - 18, cw * 2, 22); R(c, f.x - cw * 0.7, top - 26, cw * 1.4, 10);
      c.fillStyle = k < 0.6 ? C.fire : C.mid; R(c, f.x - cw + 2, top - 16, cw * 2 - 4, 18); R(c, f.x - cw * 0.7 + 2, top - 24, cw * 1.4 - 4, 8);
      c.fillStyle = C.white; R(c, f.x - cw / 2, top - 12, cw, 3); c.fillStyle = C.fire2; R(c, f.x - cw + 2, top, cw * 2 - 4, 2);
    }
  }
  if (plane) {
    const x = ((t * 140) % (W + 80)) - 40; const y = 4;
    c.fillStyle = C.ink; R(c, x - 14, y, 28, 4); R(c, x - 3, y - 6, 6, 16); R(c, x - 14, y - 3, 3, 3); R(c, x + 12, y + 1, 4, 2);
  }
}
function drawUnit(c, C, u) {
  const moving = u.atk <= 0;
  const frame = moving ? Math.floor(u.walk * 4) % 4 : 0;
  const sp = unitSprite(C, u.side, u.era, u.type, frame, u.atk > 0);
  const heavyU = u.type === 2; const w = heavyU ? HW : UW; const h = heavyU ? HH : UH;
  const x = X(u.x); const foot = LANE;
  c.save();
  c.translate(x, foot - h + 2);
  if (u.side === 1) c.scale(-1, 1);
  if (u.hit > 0) c.globalAlpha = 0.55;
  c.drawImage(sp, -w / 2, 0);
  c.restore();
  const bw = heavyU ? 34 : 20; const p = Math.max(0, u.hp / u.maxHp); const by = foot - h - 2;
  c.fillStyle = C.ink; R(c, x - bw / 2 - 1, by - 1, bw + 2, 5);
  c.fillStyle = u.side === 0 ? C.hi : C.fire; R(c, x - bw / 2, by, Math.max(1, Math.round(bw * p)), 3);
}

export function render(ctx, g, C, t) {
  const c = ctx; c.imageSmoothingEnabled = false;
  if (cache.size > 600) cache.clear();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.drawImage(backdrop(C), 0, 0);
  // fumo animado a sair da cratera e das ruínas (nuvens translúcidas)
  c.fillStyle = C.dark;
  for (const [sx, sy, ph] of [[520, 292, 0], [452, 150, 1.7]]) {
    for (let i = 0; i < 6; i++) {
      const k = ((t * 0.35 + ph + i / 6) % 1); const yy = sy - k * 110; const rr = 5 + k * 14;
      c.globalAlpha = 0.45 * (1 - k); c.beginPath(); c.arc(Math.round(sx + Math.sin(k * 6 + ph) * 8), Math.round(yy), rr, 0, Math.PI * 2); c.fill();
    }
  }
  c.globalAlpha = 1;
  const hurt = (sd) => sd.hp < BASE_HP * 0.35;
  c.drawImage(baseSprite(C, g.sides[0].era, hurt(g.sides[0])), 0, 0);
  c.save(); c.translate(CANVAS.w, 0); c.scale(-1, 1); c.drawImage(baseSprite(C, g.sides[1].era, hurt(g.sides[1])), 0, 0); c.restore();
  drawTurrets(c, C, 0, g.sides[0]);
  drawTurrets(c, C, 1, g.sides[1]);
  const units = g.units.slice().sort((a, b) => b.type - a.type); // pesadas por trás
  for (const u of units) drawUnit(c, C, u);
  c.setTransform(S, 0, 0, S, 0, LANE - WORLD.ground * S); // efeitos no mundo, alinhados com a linha de combate
  drawShots(c, C, g.shots);
  drawFx(c, C, g.fx, t);
  c.font = 'bold 8px monospace'; c.textAlign = 'center';
  for (const tx of g.texts) { c.globalAlpha = Math.max(0, 1 - tx.t); c.fillStyle = C.ink; c.fillText(tx.text, tx.x + 1, tx.y - 22 - tx.t * 10 + 1); c.fillStyle = C.fire; c.fillText(tx.text, tx.x, tx.y - 22 - tx.t * 10); }
  c.globalAlpha = 1;
  c.setTransform(1, 0, 0, 1, 0, 0);
  drawHudFrames(c, C, g);
  if (g.t > SIEGE_AT && !g.over) { c.font = 'bold 16px monospace'; c.textAlign = 'center'; c.fillStyle = C.ink; R(c, CANVAS.w / 2 - 150, 8, 300, 24); c.fillStyle = C.red; c.fillText('CERCO: AS BASES PERDEM VIDA', CANVAS.w / 2, 26); }
}

// Ícone de uma tropa para os botões
export function drawIcon(canvas, era, type, C) {
  const c = canvas.getContext('2d'); c.imageSmoothingEnabled = false;
  c.clearRect(0, 0, canvas.width, canvas.height);
  const sp = unitSprite(C, 0, era, type, 0, false);
  const s = Math.min(canvas.width / sp.width, canvas.height / sp.height);
  const w = Math.round(sp.width * s); const h = Math.round(sp.height * s);
  c.drawImage(sp, Math.round((canvas.width - w) / 2), canvas.height - h, w, h);
}
// Ícone de carica (moeda do jogo), 12x12, em pixel art
export function capIcon(C, size = 12) {
  const cv = sheet(`${C.key}|cap`, 12, 12, (c) => {
    const rows = [
      '..k.kkkk.k..',
      '.kkfffffffk.',
      'kffffffffffk',
      '.kffmmmmffk.',
      'kffmffffmffk',
      'kffmfwwfmffk',
      'kffmfwwfmffk',
      'kffmffffmffk',
      '.kffmmmmffk.',
      'kffffffffffk',
      '.kkfffffffk.',
      '..k.kkkk.k..',
    ];
    bitmap(c, rows, 0, 0, { k: '#2a1600', f: C.fire, m: '#b86a00', w: C.white });
  });
  const out = document.createElement('canvas'); out.width = size; out.height = size;
  const o = out.getContext('2d'); o.imageSmoothingEnabled = false; o.drawImage(cv, 0, 0, size, size);
  return out.toDataURL();
}
export const eraName = (i) => ERAS[i].name;
