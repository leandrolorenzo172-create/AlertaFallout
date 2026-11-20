// Guerra das Eras — desenho a cores, estilo arcada 16-bit.
// Cenário original de trincheiras (céu, montanhas, pinheiros, trincheiras de madeira, sacos de areia, barris,
// estacas, arame farpado e bunkers nas pontas) pintado em código em pixel art a meia resolução e ampliado 2x.
// As tropas são as 15 personagens da folha do dono da app (sprites.js). Tudo offline.
import { WORLD, BASE_HP, ERAS, SIEGE_AT } from './logic';
import { rect as unitRect, getAtlas, spritesReady, getAnim, animFrame, animCount } from './sprites';
import mapaUrl from './assets/mapa.webp';
import torresUrl from './assets/torres.webp';
import espUrl from './assets/especiais.webp';
import ESP from './assets/especiais.json';

// mapa desenhado pelo dono da app (redesenhado com IA): ocupa a largura toda, na parte de baixo do ecrã
let mapa = null;
if (typeof Image !== 'undefined') { const im = new Image(); im.onload = () => { mapa = im; cache.delete('bgmap'); }; im.src = mapaUrl; }

const S = 2; // píxeis do ecrã por unidade do mundo
const OFF = 24; // céu extra por cima do mundo
export const CANVAS = { w: WORLD.w * S, h: 300 }; // ecrã largo, ao formato do mapa
const X = (x) => Math.round(x * S);
const WD = CANVAS.w; const H = CANVAS.h;
const LANE = 250; // linha de combate (pés das tropas), em píxeis do ecrã: o caminho de terra do mapa
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

// moldura do HUD junto a cada base (barra vertical de vida e caixa do "500 HP")
function drawHudFrames(c, C, g) {
  [0, 1].forEach((side) => {
    const sd = g.sides[side]; const p = Math.max(0, sd.hp / BASE_HP);
    const bx = side === 0 ? 226 : WD - 238; const bh = 96;
    c.fillStyle = C.ink; R(c, bx - 2, 0, 16, bh + 2);
    c.fillStyle = '#3a1410'; R(c, bx, 0, 12, bh);
    c.fillStyle = p < 0.3 && Math.floor(performance.now() / 250) % 2 ? '#ff7a6e' : C.red; const fh = Math.round(bh * p); R(c, bx, bh - fh, 12, fh);
    c.fillStyle = C.ink; for (let y = 10; y < bh; y += 12) R(c, bx, y, 12, 2);
    const fx = side === 0 ? 214 : WD - 334; c.strokeStyle = '#ffe9a0'; c.lineWidth = 3; c.globalAlpha = 0.7;
    c.beginPath(); if (c.roundRect) c.roundRect(fx, bh + 8, 120, 58, 10); else c.rect(fx, bh + 8, 120, 58); c.stroke();
    c.globalAlpha = 0.35; c.fillStyle = '#1a1410'; c.fill(); c.globalAlpha = 1;
  });
}

// ---------- Torres: nas duas bases metálicas de cada bunker ----------
// Bases (centro do disco, em píxeis do ecrã, bunker esquerdo; o direito é espelhado): 0 = topo do bunker, 1 = flanco
const MOUNTS = [{ x: 97, y: 166 }, { x: 67, y: 211 }];
// Torres desenhadas pelo dono da app, com o pedestal original (assets/torres.webp): [x, y, l, a, centro do pedestal, largura do pedestal]
// 0 lança-pedras · 1 balista · 2 metralhadora a vapor · 3/4 ninho (repouso/disparo) · 5/6 torre laser (repouso/carga)
const TURRET_RECTS = [[0, 0, 473, 478, 241.5, 461], [475, 0, 560, 398, 253.0, 506], [1037, 0, 500, 407, 234.5, 451], [1539, 0, 312, 330, 151.5, 303], [1853, 0, 498, 409, 156.0, 312], [2353, 0, 456, 404, 207.0, 414], [2811, 0, 581, 426, 209.5, 419]];
const PED_W = 62; // largura do pedestal no ecrã (cobre a base metálica do bunker)
// boca de fogo de cada torre (fração da imagem) para o clarão ao disparar
const MUZZLE = [[0.12, 0.42], [0.98, 0.1], [0.98, 0.33], null, null, null, null];
let esp = null;
if (typeof Image !== 'undefined') { const im = new Image(); im.onload = () => { esp = im; }; im.src = espUrl; }
// desenha um sprite dos especiais (folhas do dono da app) com a base em (cx, by), altura h, em coordenadas do mundo
function spr(c, name, cx, by, h, flip = false, alpha = 1, anchor = 'bottom') {
  const r = ESP[name]; if (!esp || !r) return false;
  const [sx, sy, sw, sh] = r; const w = (sw / sh) * h;
  c.save(); c.globalAlpha *= Math.max(0, Math.min(1, alpha)); c.translate(cx, by); if (flip) c.scale(-1, 1);
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
  c.drawImage(esp, sx, sy, sw, sh, -w / 2, anchor === 'center' ? -h / 2 : -h, w, h);
  c.restore(); c.imageSmoothingEnabled = false; return true;
}
let torres = null;
if (typeof Image !== 'undefined') { const im = new Image(); im.onload = () => { torres = im; }; im.src = torresUrl; }
// base metálica circular (como no desenho do bunker)
function drawMount(c, x, y) {
  c.fillStyle = 'rgba(20,16,12,0.45)'; c.beginPath(); c.ellipse(x + 2, y + 5, 22, 7, 0, 0, 7); c.fill();
  c.fillStyle = '#1e1d1b'; c.beginPath(); c.ellipse(x, y + 2, 21, 7.5, 0, 0, 7); c.fill();
  c.fillStyle = '#55534e'; c.beginPath(); c.ellipse(x, y + 1, 20, 6.5, 0, 0, 7); c.fill();
  c.fillStyle = '#86847d'; c.beginPath(); c.ellipse(x, y - 1, 20, 6, 0, 0, 7); c.fill();
  c.fillStyle = '#3a3935'; c.beginPath(); c.ellipse(x, y - 1, 14, 4, 0, 0, 7); c.fill();
  c.fillStyle = '#6d6b65'; c.beginPath(); c.ellipse(x, y - 1.5, 12, 3, 0, 0, 7); c.fill();
  c.fillStyle = '#2a2926'; R(c, x - 3, y - 3, 6, 3);
  c.fillStyle = '#b9b7ae'; for (const dx of [-17, -9, 9, 17]) R(c, x + dx, y + (Math.abs(dx) > 10 ? 0 : 3), 1.5, 1.5);
}
function drawTurrets(c, C, side, sd) {
  for (let k = 0; k < MOUNTS.length; k++) {
    const m = MOUNTS[k]; const x = side === 0 ? m.x : WD - m.x; const y = m.y;
    const tu = k < sd.slots ? sd.turrets[k] : null;
    if (!tu) { drawMount(c, x, y); continue; }
    const firing = tu.cd > (tu.rate || 1.3) - 0.2;
    if (!torres) continue;
    const idx = tu.era === 3 ? (firing ? 4 : 3) : tu.era === 4 ? (firing ? 6 : 5) : tu.era;
    const [sx, sy, sw, sh, bx, bw] = TURRET_RECTS[idx];
    const k2 = PED_W / bw; const dw = sw * k2; const dh = sh * k2;
    c.save(); c.translate(x, y + 7); if (side === 1) c.scale(-1, 1);
    const recoil = firing && tu.era > 0 ? -1.5 : 0;
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.drawImage(torres, sx, sy, sw, sh, -bx * k2 + recoil, -dh, dw, dh);
    c.imageSmoothingEnabled = false;
    const mz = MUZZLE[idx];
    if (firing && mz) { // clarão / pedra lançada
      const mx = -bx * k2 + mz[0] * dw; const my = -dh + mz[1] * dh;
      const col = tu.era === 4 ? C.laser : tu.era === 0 ? '#8a7a4a' : C.fire;
      c.fillStyle = col; c.beginPath(); c.arc(mx + 3, my, tu.era === 0 ? 3 : 5, 0, 7); c.fill();
      if (tu.era) { c.fillStyle = C.white; c.beginPath(); c.arc(mx + 3, my, 2, 0, 7); c.fill(); }
    }
    c.restore();
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
  let plane = null; const W = WORLD.w; const G = WORLD.ground;
  for (const f of fx) {
    if (f.kind === 'boom') {
      const k = f.t / f.life; const flip = f.side === 1;
      if (f.src === 'meteor' && spr(c, k < 0.35 ? 'deb_fall' : 'deb_dust', f.x, G + 2, k < 0.35 ? 32 : 34, flip, 1 - Math.max(0, k - 0.6) / 0.4)) continue;
      if (f.src === 'shells' && spr(c, k < 0.45 ? 'tire_boom' : 'tire_smoke', f.x, G + 2, k < 0.45 ? 28 : 34, flip, 1 - Math.max(0, k - 0.7) / 0.3)) continue;
      if (f.src === 'bombs' && spr(c, 'bomb_ground', f.x, G + 3, 20 + k * 8, flip, 1 - Math.max(0, k - 0.6) / 0.4)) continue;
      const r = (f.big ? 13 : 7) * (0.4 + k);
      c.fillStyle = k < 0.35 ? C.white : k < 0.6 ? C.fire : k < 0.8 ? C.fire2 : '#4a3c28';
      for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; R(c, f.x + Math.cos(a) * r, f.y + Math.sin(a) * r * 0.6, 2, 2); }
      if (k < 0.45) { c.fillStyle = C.fire2; R(c, f.x - 5, f.y - 5, 10, 10); c.fillStyle = C.fire; R(c, f.x - 3.5, f.y - 3.5, 7, 7); c.fillStyle = C.white; R(c, f.x - 1.5, f.y - 1.5, 3, 3); }
      continue;
    }
    if (f.kind === 'stranger') { // o Stranger entra, põe a bomba de gás, ativa-a e vai-se embora
      const fr = f.t < 0.45 ? 'str1' : f.t < 0.9 ? 'str2' : f.t < 1.35 ? 'str3' : 'str4';
      spr(c, fr, f.x, G + 1, 40, f.side === 1, Math.min(1, f.t / 0.2, (f.life - f.t) / 0.35));
      continue;
    }
    if (f.kind === 'corpse') continue;
    if (f.delay > 0) { if (f.kind === 'bombs') plane = plane || f; continue; }
    if (f.kind === 'meteor') { // chuva de destroços: pedras e ossos a cair
      if (!spr(c, 'deb_big', f.x, f.y, 34, f.side === 1, 1, 'center')) { c.fillStyle = '#6b5a3a'; R(c, f.x - 3, f.y - 3, 6, 6); }
    } else if (f.kind === 'shells') { // pneus em chamas a cair
      if (!spr(c, 'tire_big', f.x - (f.side === 1 ? -6 : 6), f.y + 4, 26, f.side === 1)) { c.fillStyle = C.ink; R(c, f.x - 2, f.y - 4, 4, 7); }
    } else if (f.kind === 'bombs') { plane = plane || f; if (!spr(c, 'bombs', f.x, f.y, 16, f.side === 1, 1, 'center')) { c.fillStyle = C.ink; R(c, f.x - 2, f.y - 5, 5, 8); } }
    else if (f.kind === 'gas') { // bomba de gás e nuvens (pequena, depois grande)
      const a = Math.min(1, f.t / 0.3) * Math.min(1, (f.life - f.t) / 0.8);
      if (f.t < 1) spr(c, 'gas_bomb', f.x, G + 1, 7);
      if (!spr(c, f.t < 1.1 ? 'gas_small' : 'gas_large', f.x, G + 3, f.t < 1.1 ? 26 + f.t * 8 : 40, f.side === 1, a * 0.92)) {
        c.globalAlpha = 0.5 * a; c.fillStyle = C.gas; R(c, f.x - 20, f.y - 8, 40, 16); c.globalAlpha = 1;
      }
    } else if (f.kind === 'nuke') { // o explorador montado na bomba
      const fr = f.y < G - 70 ? 'nuke1' : f.y < G - 32 ? 'nuke2' : 'nuke3';
      if (!spr(c, fr, f.x, f.y + 12, 42, f.side === 1)) { c.fillStyle = C.ink; R(c, f.x - 4, f.y - 7, 8, 12); }
    } else if (f.kind === 'shock') { // clarão, onda de choque e cogumelo
      const k = f.t / f.life;
      if (k < 0.25) { c.globalAlpha = (0.25 - k) * 3.6; c.fillStyle = C.white; R(c, 0, -200, W, 600); c.globalAlpha = 1; }
      const rr = k * 260; c.fillStyle = k < 0.5 ? C.white : C.fire;
      for (let i = 0; i < 60; i++) { const a = (i / 60) * Math.PI; R(c, f.x + Math.cos(a) * rr, G - Math.sin(a) * rr * 0.35, 3, 2); }
      if (k < 0.3) spr(c, 'nuke_flash', f.x, G + 3, 60 + k * 120, false, 1 - k / 0.3);
      if (k > 0.08) spr(c, 'nuke_boom', f.x, G + 4, Math.min(1, (k - 0.08) * 3) * 105, false, Math.min(1, (1 - k) / 0.25));
    }
  }
  if (plane) { // o avião passa a largar as bombas
    const dir = plane.side === 1 ? -1 : 1; const span = W + 120;
    const x = dir > 0 ? ((t * 150) % span) - 60 : W + 60 - ((t * 150) % span);
    if (!spr(c, 'plane', x, 72, 24, dir < 0)) { c.fillStyle = C.ink; R(c, x - 15, 4, 30, 6); }
  }
}

// ---------- Tropas: sprites da folha de personagens ----------
const SCALE = 0.52; // tamanho no campo (as figuras têm ~150-165 px na folha)
const ANIM_H = 84; // altura de uma personagem a andar, no ecrã
function drawUnit(c, C, u, t) {
  const x = X(u.x); const face = u.side === 0 ? 1 : -1;
  const attacking = u.atk > 0;
  const sheetA = getAnim();
  const fr = sheetA && (attacking ? animFrame(u.era, u.type, 'attack', Math.floor((1 - Math.min(1, u.atk / 0.25)) * animCount(u.era, u.type, 'attack')))
    : animFrame(u.era, u.type, 'walk', Math.floor(u.walk * 6)));
  let h;
  c.fillStyle = 'rgba(26,20,16,0.35)'; c.beginPath(); c.ellipse(x, LANE - 1, 18, 4, 0, 0, 7); c.fill();
  c.save(); if (u.hit > 0) c.globalAlpha = 0.55;
  if (fr) { // animação a sério
    const k = ANIM_H / 110; const [sx, sy, sw, sh] = fr; const w = sw * k; h = sh * k;
    c.translate(x, LANE); c.scale(face, 1);
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.drawImage(sheetA, sx, sy, sw, sh, -w / 2, -h, w, h);
  } else { // personagem sem animação: imagem da carta, com saltinhos
    const atlas = getAtlas(); const [sx, sy, sw, sh] = unitRect(u.era, u.type);
    const w = sw * SCALE; h = sh * SCALE;
    const bob = attacking ? 0 : -Math.abs(Math.sin(u.walk * 5)) * 2.5; const lunge = attacking ? face * 4 : 0;
    c.translate(x + lunge, LANE + bob); c.scale(face, 1); if (!attacking) c.rotate(Math.sin(u.walk * 5) * 0.03);
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    if (atlas) c.drawImage(atlas, sx, sy, sw, sh, -w / 2, -h, w, h);
  }
  c.restore(); c.imageSmoothingEnabled = false;
  const bw = u.type === 2 ? 36 : 24; const p = Math.max(0, u.hp / u.maxHp); const by = LANE - (h || 70) - 6;
  c.fillStyle = C.ink; R(c, x - bw / 2 - 1, by - 1, bw + 2, 5);
  c.fillStyle = C.red; R(c, x - bw / 2, by, Math.max(1, Math.round(bw * p)), 3);
}
// tropas a cair quando morrem (animação de morte), desenhadas antes das vivas
function drawCorpses(c, fx) {
  const sheetA = getAnim(); if (!sheetA) return;
  for (const f of fx) {
    if (f.kind !== 'corpse') continue;
    const n = animCount(f.era, f.type, 'death'); if (!n) continue;
    const i = Math.min(n - 1, Math.floor((f.t / (f.life * 0.6)) * n));
    const [sx, sy, sw, sh] = animFrame(f.era, f.type, 'death', i);
    const k = ANIM_H / 110; const w = sw * k; const h = sh * k;
    c.save(); c.globalAlpha = Math.max(0, Math.min(1, (f.life - f.t) / 0.4));
    c.translate(X(f.x), LANE); c.scale(f.side === 0 ? 1 : -1, 1);
    c.imageSmoothingEnabled = true; c.drawImage(sheetA, sx, sy, sw, sh, -w / 2, -h, w, h);
    c.restore();
  }
  c.imageSmoothingEnabled = false;
}

// fundo final: céu a continuar o azul do mapa e o mapa em baixo, à largura toda
const MAP_H = Math.round(WD * 236 / 1080); const MAP_Y = H - MAP_H;
function mapBackdrop() {
  return sheet('bgmap', WD, H, (c) => {
    const grd = c.createLinearGradient(0, 0, 0, MAP_Y + 4);
    grd.addColorStop(0, '#2f5675'); grd.addColorStop(0.6, '#4b7593'); grd.addColorStop(1, '#5a829a');
    c.fillStyle = grd; c.fillRect(0, 0, WD, MAP_Y + 4);
    for (const [x, y, w] of [[120, 50, 90], [380, 34, 120], [640, 64, 100], [850, 40, 80]]) {
      c.fillStyle = '#6f93ad'; c.beginPath(); c.ellipse(x, y + 6, w * 0.5, 10, 0, 0, 7); c.fill();
      c.fillStyle = '#8fb0c4'; c.beginPath(); c.ellipse(x - 8, y, w * 0.36, 9, 0, 0, 7); c.fill();
      c.fillStyle = '#b5cad6'; c.beginPath(); c.ellipse(x - 16, y - 3, w * 0.18, 5, 0, 0, 7); c.fill();
    }
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.drawImage(mapa, 0, MAP_Y, WD, MAP_H);
  });
}

export function render(ctx, g, C, t) {
  const c = ctx;
  if (cache.size > 100) cache.clear();
  c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false;
  if (mapa) c.drawImage(mapBackdrop(), 0, 0);
  else { c.fillStyle = '#4b7593'; c.fillRect(0, 0, WD, H); }
  // fumo a sair das bases danificadas e de uma fogueira na trincheira
  const smokes = [];
  [0, 1].forEach((side) => { if (g.sides[side].hp < BASE_HP * 0.35) smokes.push([side === 0 ? 110 : WD - 110, 180, side + 1, true]); });
  for (const [sx, sy, ph, fire] of smokes) {
    for (let i = 0; i < 7; i++) {
      const k = ((t * 0.35 + ph + i / 7) % 1); const yy = sy - k * 120; const rr = 5 + k * 16;
      c.globalAlpha = 0.5 * (1 - k); c.fillStyle = k < 0.15 && fire ? C.fire2 : '#4a4038';
      c.beginPath(); c.arc(Math.round(sx + Math.sin(k * 6 + ph) * 8), Math.round(yy), rr, 0, 7); c.fill();
    }
  }
  c.globalAlpha = 1;
  drawTurrets(c, C, 0, g.sides[0]);
  drawTurrets(c, C, 1, g.sides[1]);
  const units = g.units.slice().sort((a, b) => b.type - a.type); // pesadas por trás
  drawCorpses(c, g.fx);
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
