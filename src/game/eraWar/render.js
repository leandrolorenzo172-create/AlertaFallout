// Guerra das Eras — desenho em pixel art numa tela de baixa resolução (480x200), ampliada sem suavização.
// Tudo é desenhado com a cor do tema da app (verde, âmbar, azul...) em vários tons, como num ecrã de fósforo.
import { WORLD, BASE_HP, ERAS, SIEGE_AT } from './logic';

const G = WORLD.ground;

export function themeColors() {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--c').trim() || '0 255 65';
  const [r, g, b] = v.split(/\s+/).map(Number);
  const mix = (k, a = 1) => `rgba(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)},${a})`;
  return { hi: mix(1), mid: mix(0.72), low: mix(0.45), dim: mix(0.25), dark: mix(0.12), bg: mix(0.05), fire: '#ffb000', fire2: '#ff6a00', red: '#ff3b2f' };
}

// pequenos ajudantes de pixel (coordenadas inteiras)
const R = (c, x, y, w, h) => c.fillRect(Math.round(x), Math.round(y), w, h);

// ---------- Cenário ----------
function drawBackdrop(c, C, t) {
  c.fillStyle = C.bg; c.fillRect(0, 0, WORLD.w, WORLD.h);
  // montes ao longe
  c.fillStyle = C.dark;
  for (let x = 0; x < WORLD.w; x += 2) {
    const h = 26 + Math.sin(x * 0.021) * 10 + Math.sin(x * 0.057 + 1) * 6;
    R(c, x, G - 40 - h, 2, h + 40);
  }
  // árvores
  c.fillStyle = C.dim;
  for (let i = 0; i < 9; i++) {
    const x = 70 + i * 42 + (i % 3) * 7; const h = 18 + (i % 4) * 5;
    R(c, x, G - h - 6, 2, h + 6);
    for (let k = 0; k < h; k += 3) R(c, x - Math.floor((h - k) / 3), G - h - 6 + k, Math.floor((h - k) / 1.5) + 2, 2);
  }
  // chão com textura
  c.fillStyle = C.low; R(c, 0, G, WORLD.w, 1);
  c.fillStyle = C.dark; R(c, 0, G + 1, WORLD.w, WORLD.h - G);
  c.fillStyle = C.dim;
  for (let x = (t * 0) | 0; x < WORLD.w; x += 7) R(c, x + ((x * 13) % 5), G + 4 + ((x * 7) % 14), 2, 1);
}

// ---------- Bases (uma forma por era) ----------
function drawBase(c, C, side, era, hp) {
  const flip = side === 1;
  c.save();
  if (flip) { c.translate(WORLD.w, 0); c.scale(-1, 1); }
  const hurt = hp < BASE_HP * 0.35;
  c.fillStyle = C.mid;
  if (era === 0) { // gruta de pedra
    c.fillStyle = C.low; for (let i = 0; i < 6; i++) R(c, 2 + i * 6, G - 30 + Math.abs(3 - i) * 4, 8, 34 - Math.abs(3 - i) * 4);
    c.fillStyle = C.mid; R(c, 6, G - 34, 30, 6); R(c, 2, G - 26, 38, 26);
    c.fillStyle = C.bg; R(c, 24, G - 16, 12, 16);
  } else if (era === 1) { // castelo
    R(c, 4, G - 46, 30, 46); for (let i = 0; i < 4; i++) R(c, 4 + i * 8, G - 52, 5, 6);
    c.fillStyle = C.bg; R(c, 22, G - 16, 10, 16); R(c, 10, G - 36, 4, 6);
  } else if (era === 2) { // forte com bandeira
    R(c, 2, G - 40, 38, 40); R(c, 2, G - 46, 10, 6); R(c, 30, G - 46, 10, 6);
    c.fillStyle = C.hi; R(c, 16, G - 66, 1, 26); R(c, 17, G - 66, 9, 5);
    c.fillStyle = C.bg; R(c, 24, G - 18, 12, 18);
  } else if (era === 3) { // bunker
    R(c, 0, G - 30, 42, 30); c.fillStyle = C.low; R(c, 4, G - 36, 34, 6);
    c.fillStyle = C.bg; R(c, 8, G - 22, 22, 4); R(c, 30, G - 14, 10, 14);
  } else { // cúpula futurista
    for (let y = 0; y < 40; y++) { const w = Math.round(Math.sqrt(1 - (y / 40) ** 2) * 42); R(c, 0, G - y - 1, w, 1); }
    c.fillStyle = C.hi; R(c, 6, G - 30, 22, 2); R(c, 6, G - 20, 30, 1);
    c.fillStyle = C.bg; R(c, 28, G - 14, 10, 14);
  }
  if (hurt) { c.fillStyle = C.fire2; R(c, 12, G - 38, 3, 3); R(c, 26, G - 30, 2, 2); }
  c.restore();
}
function drawTurrets(c, C, side, sd) {
  for (let k = 0; k < sd.slots; k++) {
    const x = side === 0 ? 30 : WORLD.w - 30; const y = G - 44 - k * 13;
    const t = sd.turrets[k];
    c.fillStyle = C.dim; R(c, x - 6, y + 3, 12, 2); // plataforma
    if (!t) { c.fillStyle = C.dim; R(c, x - 4, y - 2, 8, 1); continue; }
    c.fillStyle = C.mid; R(c, x - 4, y - 3, 8, 6);
    const ang = Math.atan2(G - 10 - y, (t.aim || (side === 0 ? x + 60 : x - 60)) - x);
    c.fillStyle = C.hi;
    for (let i = 0; i < 8; i++) R(c, x + Math.cos(ang) * i, y + Math.sin(ang) * i, 2, 1);
    c.fillStyle = C.low; R(c, x - 2, y - 5, 4, 2 + t.era % 2);
  }
}

// ---------- Unidades ----------
function legs(c, C, x, y, phase) {
  const s = Math.sin(phase) > 0 ? 1 : 0;
  R(c, x - 1 - s, y, 1, 4); R(c, x + 1 + s, y, 1, 4);
}
function soldier(c, C, u, t) {
  const y = G - 14; const x = 0; const ph = u.walk * 2;
  c.fillStyle = C.hi;
  legs(c, C, x, y + 10, ph);
  R(c, x - 1, y + 4, 3, 6); // tronco
  R(c, x - 1, y, 3, 3); // cabeça
  const a = u.atk > 0;
  // capacete / adorno por era
  if (u.era === 1) R(c, x - 2, y - 1, 5, 1);
  if (u.era === 2) { R(c, x - 2, y - 1, 5, 1); R(c, x, y - 2, 1, 1); }
  if (u.era === 3) R(c, x - 2, y - 1, 5, 2);
  if (u.era === 4) { c.fillStyle = C.mid; R(c, x - 2, y - 1, 5, 4); c.fillStyle = C.hi; R(c, x + 1, y + 1, 2, 1); }
  c.fillStyle = C.mid;
  if (u.type === 0) { // corpo a corpo
    if (u.era === 0) { for (let i = 0; i < 5; i++) R(c, x + 2 + (a ? i : i * 0.4), y + 4 - i, 2, 1); } // moca
    else if (u.era === 1) { R(c, x - 3, y + 4, 2, 5); for (let i = 0; i < 6; i++) R(c, x + 2 + i, y + 5 - (a ? 0 : i * 0.6), 1, 1); } // espada e escudo
    else if (u.era === 2) { for (let i = 0; i < 12; i++) R(c, x - 2 + i, y + 6 - i * 0.5, 1, 1); } // pique
    else if (u.era === 3) { R(c, x + 2, y + 6, 4, 1); } // faca
    else { c.fillStyle = C.hi; for (let i = 0; i < 7; i++) R(c, x + 2 + i, y + 6 - i, 1, 1); } // lâmina de energia
  } else { // à distância
    if (u.era === 0) { R(c, x + 2, y + 4, 1, 3); if (a) R(c, x + 3, y + 3, 2, 2); } // funda
    else if (u.era === 1) { for (let i = -3; i <= 3; i++) R(c, x + 3 + (3 - Math.abs(i)) * 0.5, y + 6 + i, 1, 1); } // arco
    else { R(c, x + 1, y + 5, u.era === 4 ? 7 : 6, 2); if (u.era === 4) { c.fillStyle = C.hi; R(c, x + 7, y + 5, 1, 1); } } // mosquete / espingarda / laser
  }
}
function heavy(c, C, u) {
  const x = 0; const ph = u.walk * 2; c.fillStyle = C.hi;
  if (u.era === 0) { // dinossauro com cavaleiro
    R(c, x - 8, G - 12, 16, 6); R(c, x + 6, G - 16, 6, 5); R(c, x + 11, G - 14, 3, 2); R(c, x - 12, G - 10, 5, 2);
    const s = Math.sin(ph) > 0 ? 1 : 0; R(c, x - 6 + s, G - 6, 2, 6); R(c, x + 4 - s, G - 6, 2, 6);
    c.fillStyle = C.mid; R(c, x - 2, G - 20, 3, 8); R(c, x - 2, G - 23, 3, 3);
  } else if (u.era === 1) { // cavaleiro a cavalo
    R(c, x - 7, G - 13, 14, 5); R(c, x + 6, G - 18, 3, 7); R(c, x + 8, G - 18, 3, 3);
    const s = Math.sin(ph) > 0 ? 1 : 0; R(c, x - 6 + s, G - 8, 1, 8); R(c, x - 3 - s, G - 8, 1, 8); R(c, x + 3 + s, G - 8, 1, 8); R(c, x + 5 - s, G - 8, 1, 8);
    c.fillStyle = C.mid; R(c, x - 2, G - 22, 3, 9); R(c, x - 2, G - 25, 3, 3); for (let i = 0; i < 12; i++) R(c, x + 1 + i, G - 18 - (u.atk > 0 ? 0 : 2), 1, 1);
  } else if (u.era === 2) { // canhão
    R(c, x - 8, G - 8, 12, 4); for (let i = 0; i < 10; i++) R(c, x - 2 + i, G - 9 - i * 0.3, 2, 2);
    c.fillStyle = C.mid; R(c, x - 6, G - 5, 5, 5); R(c, x + 1, G - 5, 5, 5);
    c.fillStyle = C.hi; R(c, x - 12, G - 14, 3, 10); // artilheiro
  } else if (u.era === 3) { // tanque
    R(c, x - 11, G - 9, 22, 6); R(c, x - 5, G - 14, 11, 5); R(c, x + 5, G - 12, 9, 2);
    c.fillStyle = C.mid; R(c, x - 11, G - 3, 22, 3);
    c.fillStyle = C.dim; for (let i = 0; i < 5; i++) R(c, x - 9 + i * 4 + (Math.floor(ph * 2) % 2), G - 3, 2, 3);
  } else { // tanque laser flutuante
    const hov = Math.sin(ph) * 1.2; R(c, x - 11, G - 12 + hov, 22, 5); R(c, x - 6, G - 17 + hov, 12, 5);
    c.fillStyle = C.mid; R(c, x + 5, G - 15 + hov, 10, 2);
    c.fillStyle = C.hi; R(c, x - 9, G - 5 + hov, 18, 1); R(c, x + 14, G - 15 + hov, 1, 2);
  }
}
function drawUnit(c, C, u, t) {
  c.save();
  c.translate(Math.round(u.x), 0);
  if (u.side === 1) c.scale(-1, 1);
  if (u.hit > 0) c.globalAlpha = 0.55;
  if (u.type === 2) heavy(c, C, u); else soldier(c, C, u, t);
  c.restore();
  // barra de vida
  const w = u.type === 2 ? 16 : 8; const p = Math.max(0, u.hp / u.maxHp);
  c.fillStyle = C.dark; R(c, u.x - w / 2, G - (u.type === 2 ? 30 : 22), w, 1);
  c.fillStyle = u.side === 0 ? C.hi : C.fire; R(c, u.x - w / 2, G - (u.type === 2 ? 30 : 22), Math.max(1, Math.round(w * p)), 1);
}

// ---------- Projéteis e efeitos ----------
function drawShots(c, C, shots) {
  for (const s of shots) {
    c.fillStyle = s.era >= 3 ? C.hi : C.mid;
    if (s.era === 4) { c.fillStyle = C.hi; R(c, s.x - 3, s.y, 6, 1); } else if (s.era === 1 && s.kind === 'unit') R(c, s.x - 2, s.y, 4, 1); else R(c, s.x - 1, s.y - 1, 2, 2);
  }
}
function drawFx(c, C, fx) {
  for (const f of fx) {
    if (f.kind === 'boom') {
      const k = f.t / f.life; const r = (f.big ? 10 : 6) * (0.4 + k);
      c.fillStyle = k < 0.5 ? C.fire : C.mid;
      for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; R(c, f.x + Math.cos(a) * r, f.y + Math.sin(a) * r * 0.6, 2, 2); }
      continue;
    }
    if (f.delay > 0) continue;
    if (f.kind === 'meteor') {
      c.fillStyle = C.fire2; for (let i = 1; i < 6; i++) R(c, f.x - i * 1.5, f.y - i * 4, 4 - i * 0.5, 3);
      c.fillStyle = C.fire; R(c, f.x - 3, f.y - 3, 6, 6); c.fillStyle = C.low; R(c, f.x - 2, f.y - 2, 4, 4);
    } else if (f.kind === 'arrows') { c.fillStyle = C.hi; R(c, f.x, f.y - 5, 1, 6); R(c, f.x - 1, f.y, 3, 1); }
    else if (f.kind === 'shells') { c.fillStyle = C.hi; R(c, f.x - 1, f.y - 2, 3, 4); c.fillStyle = C.fire; R(c, f.x, f.y - 6, 1, 3); }
    else if (f.kind === 'bombs') { c.fillStyle = C.hi; R(c, f.x - 2, f.y - 4, 4, 7); R(c, f.x - 3, f.y - 5, 6, 1); }
    else if (f.kind === 'laser') {
      const a = Math.min(1, (f.t || 0) / 0.5);
      c.fillStyle = a < 1 ? C.dim : C.hi; R(c, f.x - (a < 1 ? 0 : 2), 0, a < 1 ? 1 : 5, G);
      if (a >= 1) { c.fillStyle = C.fire; R(c, f.x - 8, G - 3, 16, 3); }
    }
  }
}

// ---------- Barras de vida das bases (como na referência: verticais, com "500 HP") ----------
function drawBaseBars(c, C, g) {
  [0, 1].forEach((side) => {
    const sd = g.sides[side]; const x = side === 0 ? 6 : WORLD.w - 12; const top = 34; const h = 96;
    const p = Math.max(0, sd.hp / BASE_HP);
    c.fillStyle = C.dark; R(c, x, top, 6, h);
    c.fillStyle = C.low; R(c, x, top, 6, 1); R(c, x, top + h, 6, 1); R(c, x, top, 1, h); R(c, x + 5, top, 1, h);
    c.fillStyle = p < 0.3 ? C.red : side === 0 ? C.hi : C.fire;
    const fh = Math.round((h - 2) * p); R(c, x + 1, top + h - fh, 4, fh);
  });
}

export function render(ctx, g, C, t) {
  const c = ctx; c.imageSmoothingEnabled = false;
  drawBackdrop(c, C, t);
  drawBase(c, C, 0, g.sides[0].era, g.sides[0].hp);
  drawBase(c, C, 1, g.sides[1].era, g.sides[1].hp);
  drawTurrets(c, C, 0, g.sides[0]);
  drawTurrets(c, C, 1, g.sides[1]);
  const units = g.units.slice().sort((a, b) => a.type - b.type); // pesadas atrás
  for (const u of units) drawUnit(c, C, u, t);
  drawShots(c, C, g.shots);
  drawFx(c, C, g.fx);
  drawBaseBars(c, C, g);
  // textos de ouro ganho
  c.font = '8px monospace'; c.textAlign = 'center';
  for (const tx of g.texts) { c.fillStyle = C.fire; c.globalAlpha = 1 - tx.t; c.fillText(tx.text, tx.x, tx.y - tx.t * 10); }
  c.globalAlpha = 1;
  if (g.t > SIEGE_AT && !g.over) { c.fillStyle = C.red; c.textAlign = 'center'; c.fillText('CERCO: AS BASES PERDEM VIDA', WORLD.w / 2, 12); }
}

// Ícone pequeno de uma unidade, para os botões
export function drawIcon(canvas, era, type, C) {
  const c = canvas.getContext('2d'); c.imageSmoothingEnabled = false;
  c.clearRect(0, 0, canvas.width, canvas.height);
  c.save(); c.translate(canvas.width / 2, -(G - canvas.height + 2));
  const u = { era, type, walk: 0.3, atk: 0, x: 0, side: 0 };
  if (type === 2) heavy(c, C, u); else soldier(c, C, u, 0);
  c.restore();
}
export const eraName = (i) => ERAS[i].name;
