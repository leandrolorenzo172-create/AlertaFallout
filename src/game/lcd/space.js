// Patrulha Estelar — shooter de rolagem lateral no ecrã LCD (84x48). Original, inspirado nos jogos de telemóvel antigos.
// Mover: setas / WASD / 2 4 6 8 · Disparar: espaço / 5 (manter = automático) · Laser: X / 0 · Pausa: OK / P · Sair: C / Esc
import { W, H, createScreen, mountShell, runLoop, SFX, getSound, setSound, loadBest, saveBest } from './engine';

const MUTE = new Proxy({}, { get: () => () => {} });

const BEST = 'pb_lcd_space_best';
const TOP = 7; // a área de jogo começa abaixo da barra de estado

const SHIP = [
  '##       ',
  ' ###     ',
  ' ######  ',
  '#########',
  ' ######  ',
  ' ###     ',
  '##       ',
];
const ENEMY = {
  drone: { w: 7, h: 5, hp: 1, pts: 5, f: [['  ###  ', ' ##### ', '## # ##', ' ##### ', '# # # #'], ['  ###  ', ' ##### ', '## # ##', ' ##### ', ' # # # ']] },
  dart: { w: 7, h: 5, hp: 1, pts: 10, f: [['    ## ', '  #### ', '#######', '  #### ', '    ## '], ['    ## ', '  #### ', '###### ', '  #### ', '    ## ']] },
  spin: { w: 5, h: 5, hp: 2, pts: 15, f: [['#   #', ' ### ', ' # # ', ' ### ', '#   #'], ['  #  ', ' ### ', '## ##', ' ### ', '  #  ']] },
  saucer: { w: 9, h: 4, hp: 3, pts: 20, f: [['   ###   ', ' ####### ', '# # # # #', ' ####### '], ['   ###   ', ' ####### ', ' # # # # ', ' ####### ']] },
};
// 10 chefes, um por nível, do mais fácil ao mais difícil. move: como se desloca; attacks: ataques em ciclo;
// cd: tempo entre ataques (s); bs: velocidade das balas; enrage: fica mais rápido com menos de metade da vida
const BOSS_DEFS = [
  { name: 'SENTINELA', hp: 16, move: 'sine', spd: 0.8, attacks: ['single'], cd: 1.5, bs: 38, rows: [
    '    ######    ', '  ##########  ', ' ###  ##  ### ', '##############', '# ## #### ## #', '##############', ' ############ ', '  #  #  #  #  ', ' #  #  #  #   '] },
  { name: 'MEDUSA', hp: 22, move: 'sine', spd: 0.9, attacks: ['aimed', 'single'], cd: 1.4, bs: 42, rows: [
    '      ######      ', '    ##########    ', '   ###      ###   ', '  ##  ######  ##  ', ' ##  ##    ##  ## ', ' ## ##  ##  ## ## ', '##  ## #### ##  ##',
    ' ## ##  ##  ## ## ', ' ##  ##    ##  ## ', '  ##  ######  ##  ', '   ###      ###   ', '  # ########## #  ', ' #  # # # # #  #  ', '#  #  #  #  #   # '] },
  { name: 'NAVE-MAE', hp: 28, move: 'sine', spd: 1, attacks: ['spread3', 'aimed'], cd: 1.3, bs: 44, rows: [
    '        ####      ', '      ########    ', '    ############  ', '  #### ## ## #### ', ' ################ ', '##################',
    '# # # # # # # # ##', ' ################ ', '   ##  ##  ##  ## ', '    ## ## ## ##   ', '     #  #  #  #   '] },
  { name: 'CARANGUEJO', hp: 34, move: 'track', spd: 0.9, attacks: ['aimed', 'aimed', 'spread3'], cd: 1.2, bs: 46, rows: [
    '##              ##', '# #            # #', '#  #   ####   #  #', ' #  # ###### #  # ', '  ## ######## ##  ', '   ############   ',
    '  ##############  ', '  ## ## ## ## ##  ', '   ############   ', '  #  #      #  #  ', ' #  #        #  # ', '#  #          #  #'] },
  { name: 'ESCARAVELHO', hp: 40, move: 'charge', spd: 1, attacks: ['spread3', 'burst'], cd: 1.15, bs: 48, rows: [
    '      ####      ', '    ########    ', '   ##########   ', '  ###  ##  ###  ', ' ############## ', '################',
    '# ############ #', '################', ' ## ######## ## ', '  #  ######  #  ', ' #    ####    # ', '#      ##      #'] },
  { name: 'SERPENTE', hp: 46, move: 'eight', spd: 1.1, attacks: ['wave', 'aimed', 'wave'], cd: 1.05, bs: 50, rows: [
    '  ####              ', ' ######   ####      ', '## ## ## ######  ## ', '########## ## ######', ' ######  ######  ## ', '  ####    ####   #  ', '   ##      ##       ', '  #  #    #  #      '] },
  { name: 'FORTALEZA', hp: 54, move: 'sine', spd: 0.7, attacks: ['spread5', 'minions', 'aimed'], cd: 1, bs: 50, rows: [
    '#  #  #      #  #  #', '####################', '#  ####  ##  ####  #', '####################', ' ################## ', ' ##  ##  ##  ##  ## ',
    ' ################## ', ' #### ######## #### ', ' ###   ######   ### ', ' #### ######## #### ', ' ################## ', '  ################  ',
    '   ##  ##  ##  ##   ', '  ################  ', ' #  #  #    #  #  # '] },
  { name: 'VESPA', hp: 60, move: 'erratic', spd: 1.4, attacks: ['burst', 'spread3', 'burst'], cd: 0.9, bs: 56, rows: [
    '   ##      ##   ', '  #  #    #  #  ', ' #    #  #    # ', '#   ########   #', '   ##########   ', '  ### ## ## ### ',
    '################', '  ############  ', '   # # ## # #   ', '  #  #    #  #  ', ' #            # '] },
  { name: 'OLHO LASER', hp: 68, move: 'track', spd: 1.1, attacks: ['beam', 'aimed', 'spread5'], cd: 0.85, bs: 56, enrage: true, rows: [
    '   ####    ####   ', '  ######  ######  ', ' ##    ####    ## ', ' # #### ## #### # ', ' # #  # ## #  # # ', ' # #### ## #### # ', ' ##    ####    ## ',
    '  ######  ######  ', '   ############   ', '  ##############  ', ' ## ## #### ## ## ', ' #  #   ##   #  # ', '#  #    ##    #  #'] },
  { name: 'NUCLEO', hp: 80, move: 'eight', spd: 1.2, attacks: ['spread5', 'beam', 'burst', 'minions', 'wave'], cd: 0.75, bs: 60, enrage: true, rows: [
    '      ########      ', '    ############    ', '  ####  ####  ####  ', ' ##  ## #### ##  ## ', ' #  #  ##  ##  #  # ', '##  # ##    ## #  ##',
    '#  ## #  ##  # ##  #', '#  ## #  ##  # ##  #', '##  # ##    ## #  ##', ' #  #  ##  ##  #  # ', ' ##  ## #### ##  ## ', '  ####  ####  ####  ',
    '    ############    ', '   # #  #  #  # #   ', '  #  #  #  #  #  #  '] },
];
// segunda imagem da animação: as duas últimas linhas (patas/propulsores) deslocam-se
const BOSSES = BOSS_DEFS.map((d) => {
  const h = d.rows.length; const w = d.rows[0].length;
  const f2 = d.rows.map((r, i) => (i >= h - 2 ? r.slice(1) + r[0] : r));
  return { ...d, w, h, f: [d.rows, f2] };
});
export const BOSS_COUNT = BOSSES.length;
const POWER = { life: ['## ##', '#####', ' ### ', '  #  '], laser: ['#####', '#   #', '# # #', '#   #', '#####'] };

// Lógica e desenho do jogo, separados da interface (as pré-visualizações usam o mesmo código a jogar sozinho)
export function createSpace(scr, shell, { demo = false, onQuit = () => {} } = {}) {
  const SFX_ = demo ? MUTE : SFX;
  let best = loadBest(BEST);
  let st; // estado do jogo
  let mode = 'title'; let modeT = 0; let paused = false; let newBest = false;

  const rnd = (a, b) => a + Math.random() * (b - a);
  function reset() {
    st = {
      x: 6, y: 24, lives: 3, lasers: 3, score: 0, level: 1, levelScore: 0, inv: 2, cd: 0,
      bullets: [], enemies: [], shots: [], parts: [], powers: [], beam: 0, beamY: 0,
      scroll: 0, spawnT: 1.5, boss: null, stars: Array.from({ length: 9 }, () => ({ x: rnd(0, W), y: rnd(TOP + 2, H - 14), v: rnd(10, 24) })),
    };
  }
  reset();

  // relevo do fundo: montanhas com padrão quadriculado nos níveis ímpares, nuvens nos pares
  const ground = (wx) => 3 + Math.floor(Math.abs(Math.sin(wx * 0.06)) * 5 + Math.abs(Math.sin(wx * 0.021 + 1)) * 4);
  const hasHills = () => st.level % 2 === 1;

  function boom(x, y, n = 8) { for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; st.parts.push({ x, y, vx: Math.cos(a) * rnd(14, 26), vy: Math.sin(a) * rnd(10, 20), t: 0, life: rnd(0.25, 0.5) }); } }
  function hitPlayer() {
    if (st.inv > 0 || mode !== 'play') return;
    st.lives -= 1; st.inv = 2; boom(st.x + 4, st.y + 3, 12); SFX_.die();
    if (st.lives <= 0) { mode = 'over'; modeT = 0; newBest = st.score > best; if (newBest && !demo) { best = st.score; saveBest(BEST, best); } }
  }
  function spawnWave() {
    const types = ['drone', 'dart', 'spin', 'saucer'];
    const type = types[Math.min(types.length - 1, Math.floor(Math.random() * (1.6 + st.level * 0.6)))];
    const pattern = ['line', 'sine', 'dive'][Math.floor(Math.random() * 3)];
    const n = type === 'saucer' ? 2 : 3 + Math.floor(Math.random() * 3);
    const by = rnd(TOP + 4, H - (hasHills() ? 22 : 12));
    const sp = (type === 'dart' ? 34 : 20) + st.level * 2.5;
    for (let i = 0; i < n; i++) {
      const d = ENEMY[type];
      st.enemies.push({ type, x: W + 2 + i * (d.w + 6), y: by, by, vx: sp, hp: d.hp + Math.floor(st.level / 3), pattern, t: i * 0.4, shoot: rnd(1.2, 2.6), flash: 0 });
    }
  }
  function startBoss() {
    const k = Math.min(BOSSES.length - 1, st.level - 1); const d = BOSSES[k];
    st.boss = { k, x: W + 2, y: Math.round((TOP + H - d.h) / 2), t: 0, hp: d.hp, max: d.hp, shoot: 1.2, flash: 0, w: d.w, h: d.h, ai: 0, queue: [], beamWarn: 0, beamOn: 0, beamY: 0, ty: 20, retarget: 0 };
    st.enemies = [];
    SFX_.level();
  }
  const overlap = (ax, ay, aw, ah, bx, by, bw, bh) => ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;

  function damageEnemy(e, dmg) {
    e.hp -= dmg; e.flash = 0.1;
    if (e.hp <= 0) {
      e.dead = true; const d = ENEMY[e.type]; st.score += d.pts; st.levelScore += d.pts; boom(e.x + d.w / 2, e.y + d.h / 2); SFX_.boom();
      if (Math.random() < 0.07) st.powers.push({ kind: Math.random() < 0.5 ? 'life' : 'laser', x: e.x, y: e.y });
    } else SFX_.hit();
  }
  function damageBoss(dmg) {
    const b = st.boss; b.hp -= dmg; b.flash = 0.08; SFX_.hit();
    if (b.hp <= 0) {
      for (let i = 0; i < 5; i++) boom(b.x + rnd(0, b.w), b.y + rnd(0, b.h), 10);
      st.score += 300 * (b.k + 1); st.boss = null; st.shots = []; st.enemies = [];
      st.lives = Math.min(5, st.lives + 1); st.lasers = Math.min(9, st.lasers + 1);
      modeT = 0; SFX_.level();
      if (b.k >= BOSSES.length - 1) { mode = 'win'; newBest = st.score > best; if (newBest && !demo) { best = st.score; saveBest(BEST, best); } } else mode = 'level';
    }
  }

  // ---------- Inteligência dos chefes ----------
  function bossShot(b, kind, d) {
    const cx = b.x; const cy = b.y + b.h / 2; const v = d.bs;
    const aim = () => { const ang = Math.atan2(st.y + 3 - cy, st.x + 4 - cx); return { vx: Math.cos(ang) * v, vy: Math.sin(ang) * v }; };
    if (kind === 'single') st.shots.push({ x: cx, y: cy, vx: -v, vy: 0 });
    else if (kind === 'aimed') st.shots.push({ x: cx, y: cy, ...aim() });
    else if (kind === 'spread3') for (const vy of [-14, 0, 14]) st.shots.push({ x: cx, y: cy, vx: -v, vy });
    else if (kind === 'spread5') for (const vy of [-26, -13, 0, 13, 26]) st.shots.push({ x: cx, y: cy, vx: -v * 0.9, vy });
    else if (kind === 'burst') for (let i = 0; i < 3; i++) b.queue.push({ t: i * 0.14, kind: 'aimed' });
    else if (kind === 'wave') for (const ph of [0, Math.PI]) st.shots.push({ x: cx, y: cy, vx: -v * 0.8, vy: 0, base: cy, ph, wt: 0 });
    else if (kind === 'minions') for (const dy of [-8, 8]) st.enemies.push({ type: 'drone', x: b.x - 6, y: Math.max(TOP, Math.min(H - 6, cy + dy)), by: cy + dy, vx: 20 + b.k * 2, hp: 1, pattern: 'dive', t: 0, shoot: 99, flash: 0 });
    else if (kind === 'beam') { b.beamWarn = 0.9; b.beamY = Math.round(cy); SFX_.power(); }
  }
  function bossAI(b, dt) {
    const d = BOSSES[b.k];
    b.t += dt; b.flash -= dt;
    const tx = W - b.w - 3;
    if (b.x > tx + 0.5 && b.dashT === undefined) { b.x -= 18 * dt; return; } // a entrar no ecrã
    const yMin = TOP + 4; const yMax = H - b.h - (hasHills() ? 12 : 2); const mid = (yMin + yMax) / 2; const amp = (yMax - yMin) / 2;
    const rage = d.enrage && b.hp < b.max / 2 ? 1.4 : 1;
    const sp = d.spd * rage;
    if (b.beamWarn <= 0 && b.beamOn <= 0) { // não se mexe na vertical enquanto carrega o raio
      if (d.move === 'sine') b.y = mid + amp * Math.sin(b.t * sp);
      else if (d.move === 'track') { const want = st.y + 3 - b.h / 2; b.y += Math.sign(want - b.y) * Math.min(Math.abs(want - b.y), 16 * sp * dt); }
      else if (d.move === 'eight') { b.y = mid + amp * Math.sin(b.t * sp); b.x = tx - 6 + 6 * Math.sin(b.t * sp * 2); }
      else if (d.move === 'erratic') { b.retarget -= dt; if (b.retarget <= 0) { b.ty = yMin + Math.random() * (yMax - yMin); b.retarget = 0.5 / sp + Math.random() * 0.3; } b.y += Math.sign(b.ty - b.y) * Math.min(Math.abs(b.ty - b.y), 40 * sp * dt); }
      else if (d.move === 'charge') {
        b.y = mid + amp * Math.sin(b.t * sp * 0.8);
        const c = b.t % 6; // investida a cada 6 s
        if (c > 4 && c < 4.8) { b.dashT = 1; b.x = Math.max(24, b.x - 70 * dt); } else if (b.x < tx) { b.x = Math.min(tx, b.x + 40 * dt); } else b.dashT = undefined;
      }
    }
    b.y = Math.max(yMin, Math.min(yMax, b.y));
    // raio: aviso a piscar e depois o disparo em toda a linha
    if (b.beamWarn > 0) { b.beamWarn -= dt; if (b.beamWarn <= 0) { b.beamOn = 0.5; SFX_.boom(); } }
    if (b.beamOn > 0) { b.beamOn -= dt; if (overlap(0, b.beamY - 1, b.x, 3, st.x + 1, st.y + 1, 7, 5)) hitPlayer(); }
    // rajadas em fila
    for (const q of b.queue) { q.t -= dt; if (q.t <= 0) { q.done = true; bossShot(b, q.kind, d); } }
    b.queue = b.queue.filter((q) => !q.done);
    b.shoot -= dt;
    if (b.shoot <= 0 && b.beamWarn <= 0 && b.beamOn <= 0) {
      bossShot(b, d.attacks[b.ai % d.attacks.length], d); b.ai += 1;
      b.shoot = d.cd / rage;
    }
    for (const bl of st.bullets) if (!bl.dead && overlap(bl.x, bl.y, 3, 1, b.x, b.y, b.w, b.h)) { bl.dead = true; damageBoss(1); if (!st.boss) break; }
    if (st.boss && overlap(st.x + 1, st.y + 1, 7, 5, b.x, b.y, b.w, b.h)) hitPlayer();
  }

  // piloto automático das pré-visualizações
  function bot() {
    if (mode === 'title' || mode === 'over' || mode === 'win') { reset(); mode = 'play'; }
    const k = shell.keys; k.fire = true;
    let ty = 22; let best2 = 1e9;
    for (const e of st.enemies) { const dd = e.x - st.x; if (dd > 0 && dd < best2) { best2 = dd; ty = e.y; } }
    if (st.boss) ty = st.boss.y + st.boss.h / 2 - 3;
    if (hasHills()) ty = Math.min(ty, H - 24);
    k.up = st.y > ty + 1; k.down = st.y < ty - 1; k.left = st.x > 10; k.right = st.x < 6;
    if (st.lasers > 0 && st.boss && Math.abs(st.y + 2 - (st.boss.y + st.boss.h / 2)) < 4 && st.beam <= 0) shell.take = () => ['alt'];
  }

  function update(dt) {
    if (demo) bot();
    const pressed = shell.take();
    if (demo) shell.take = () => [];
    for (const k of pressed) {
      if (k === 'mute') { setSound(!getSound()); SFX_.key(); continue; }
      if (k === 'back') { if (mode === 'play' && !paused) { paused = true; SFX_.key(); } else { onQuit(); return; } continue; }
      if (mode === 'title' && (k === 'fire' || k === 'ok' || k === 'tap')) { reset(); mode = 'play'; paused = false; SFX_.start(); continue; }
      if ((mode === 'over' || mode === 'win') && modeT > 1.2 && (k === 'fire' || k === 'ok' || k === 'tap')) { reset(); mode = 'play'; SFX_.start(); continue; }
      if (mode === 'play' && (k === 'ok' || (paused && (k === 'tap' || k === 'fire')))) { paused = !paused; SFX_.key(); continue; }
      if (mode === 'play' && !paused && k === 'alt' && st.lasers > 0 && st.beam <= 0) {
        st.lasers -= 1; st.beam = 0.3; st.beamY = st.y + 2; SFX_.power();
        for (const e of st.enemies) { const d = ENEMY[e.type]; if (!e.dead && e.x > st.x && overlap(0, st.beamY, W, 3, e.x, e.y, d.w, d.h)) damageEnemy(e, 6); }
        if (st.boss && overlap(0, st.beamY, W, 3, st.boss.x, st.boss.y, st.boss.w, st.boss.h)) damageBoss(8);
      }
    }
    modeT += dt;
    if (mode === 'title' || paused) return;
    if (mode === 'level' && modeT > 2.2) { st.level += 1; st.levelScore = 0; st.spawnT = 1.5; mode = 'play'; }

    // fundo
    st.scroll += dt * 18;
    for (const s of st.stars) { s.x -= s.v * dt; if (s.x < -3) { s.x = W + rnd(0, 10); s.y = rnd(TOP + 2, H - 14); } }
    for (const p of st.parts) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    st.parts = st.parts.filter((p) => p.t < p.life);
    if (mode === 'over' || mode === 'win') return;

    // jogador
    const k = shell.keys; const sp = 38;
    if (k.up) st.y -= sp * dt; if (k.down) st.y += sp * dt; if (k.left) st.x -= sp * dt; if (k.right) st.x += sp * dt;
    st.x = Math.max(0, Math.min(W - 10, st.x)); st.y = Math.max(TOP, Math.min(H - 7, st.y));
    st.inv = Math.max(0, st.inv - dt); st.cd -= dt; st.beam -= dt;
    if (k.fire && st.cd <= 0 && st.bullets.length < 5 && mode === 'play') { st.bullets.push({ x: st.x + 9, y: st.y + 3 }); st.cd = 0.2; SFX_.shoot(); }
    for (const b of st.bullets) b.x += 90 * dt;
    st.bullets = st.bullets.filter((b) => b.x < W && !b.dead);

    // colisão com o relevo
    if (hasHills()) for (let i = 1; i < 8; i++) { const gx = st.x + i; if (st.y + 6 >= H - ground(st.scroll + gx)) { hitPlayer(); break; } }

    // inimigos
    if (mode === 'play' && !st.boss) {
      st.spawnT -= dt;
      if (st.spawnT <= 0) { spawnWave(); st.spawnT = Math.max(1.4, 3.6 - st.level * 0.25) + rnd(0, 1); }
      if (st.levelScore >= 150 + st.level * 50) startBoss();
    }
    for (const e of st.enemies) {
      const d = ENEMY[e.type]; e.t += dt; e.x -= e.vx * dt; e.flash -= dt;
      if (e.pattern === 'sine') e.y = e.by + Math.sin(e.t * 3) * 8;
      else if (e.pattern === 'dive' && e.x < W - 10) e.y += Math.sign(st.y - e.y) * Math.min(14 * dt, Math.abs(st.y - e.y));
      e.y = Math.max(TOP, Math.min(H - d.h - 1, e.y));
      if (e.type === 'saucer' || (e.type === 'spin' && st.level > 2)) { e.shoot -= dt; if (e.shoot <= 0 && e.x < W - 4) { st.shots.push({ x: e.x, y: e.y + 2, vx: -48, vy: 0 }); e.shoot = rnd(1.6, 3); } }
      for (const b of st.bullets) if (!b.dead && overlap(b.x, b.y, 3, 1, e.x, e.y, d.w, d.h)) { b.dead = true; damageEnemy(e, 1); if (e.dead) break; }
      if (!e.dead && overlap(st.x + 1, st.y + 1, 7, 5, e.x, e.y, d.w, d.h)) { e.dead = true; boom(e.x + 3, e.y + 2); hitPlayer(); }
    }
    st.enemies = st.enemies.filter((e) => !e.dead && e.x > -12);

    // chefe
    const b = st.boss;
    if (b) bossAI(b, dt);
    // tiros inimigos
    for (const s of st.shots) { s.x += s.vx * dt; if (s.base !== undefined) { s.wt += dt; s.y = s.base + Math.sin(s.wt * 7 + s.ph) * 7; } else s.y += s.vy * dt; if (overlap(s.x, s.y, 2, 1, st.x + 1, st.y + 2, 7, 3)) { s.dead = true; hitPlayer(); } }
    st.shots = st.shots.filter((s) => !s.dead && s.x > -3 && s.x < W + 3 && s.y > TOP - 2 && s.y < H + 2);
    // bónus
    for (const p of st.powers) {
      p.x -= 14 * dt;
      if (overlap(p.x, p.y, 5, 5, st.x, st.y, 9, 7)) { p.dead = true; SFX_.bonus(); if (p.kind === 'life') st.lives = Math.min(5, st.lives + 1); else st.lasers = Math.min(9, st.lasers + 1); }
    }
    st.powers = st.powers.filter((p) => !p.dead && p.x > -6);
  }

  function hud() {
    for (let i = 0; i < Math.max(0, st.lives); i++) scr.heart(i * 6, 0);
    scr.sprite(['#  ##', '#####', '#  ##'], 34, 1); scr.text(scr.num(st.lasers, 2), 40, 0);
    scr.text(scr.num(st.score, 5), W, 0, { align: 'right' });
  }
  function draw() {
    scr.clear(); const t = performance.now() / 1000;
    if (mode === 'title') {
      scr.text('PATRULHA', W / 2, 3, { align: 'center' }); scr.text('ESTELAR', W / 2, 10, { align: 'center' });
      const bob = Math.round(Math.sin(t * 3) * 2);
      scr.sprite(SHIP, 14, 20 + bob); for (let i = 0; i < 3; i++) scr.hline(26 + i * 6 + Math.floor((t * 30) % 6), 23 + bob, 3);
      scr.sprite(ENEMY.drone.f[Math.floor(t * 3) % 2], 62, 18); scr.sprite(ENEMY.dart.f[0], 68, 26);
      if (Math.floor(t * 2) % 2) scr.text('A: JOGAR', W / 2, 33, { align: 'center' });
      scr.text(`RECORDE ${scr.num(best, 5)}`, W / 2, 41, { align: 'center' });
      scr.present(); return;
    }
    for (const s of st.stars) scr.hline(s.x, s.y, 2);
    // relevo
    if (hasHills()) {
      for (let x = 0; x < W; x++) {
        const h = ground(st.scroll + x); const y0 = H - h;
        scr.px(x, y0); for (let y = y0 + 1; y < H; y++) if ((x + y + Math.floor(st.scroll)) % 2 === 0) scr.px(x, y);
      }
    } else {
      for (let i = 0; i < 4; i++) { const cx = ((i * 26 - st.scroll * 0.8) % (W + 26) + W + 26) % (W + 26) - 13; scr.sprite([' ### ', '#   #', ' ### '], cx, H - 5 - (i % 2) * 2); }
      scr.hline(0, H - 1, W);
    }
    for (const p of st.powers) if (Math.floor(t * 6) % 2) scr.sprite(POWER[p.kind], p.x, p.y);
    for (const e of st.enemies) { const d = ENEMY[e.type]; if (e.flash > 0 && Math.floor(t * 30) % 2) continue; scr.sprite(d.f[Math.floor(e.t * 4) % 2], e.x, e.y); }
    if (st.boss) {
      const b = st.boss;
      if (!(b.flash > 0 && Math.floor(t * 30) % 2)) scr.sprite(BOSSES[b.k].f[Math.floor(b.t * 3) % 2], b.x, b.y);
      if (b.beamWarn > 0 && Math.floor(t * 12) % 2) for (let x = 0; x < b.x; x += 3) scr.px(x, b.beamY);
      if (b.beamOn > 0) { scr.rect(0, b.beamY - 1, b.x, 3); }
      if (b.t < 2.2) { scr.text(`CHEFE ${b.k + 1}/10`, W / 2, 14, { align: 'center', inv: true }); scr.text(BOSSES[b.k].name, W / 2, 22, { align: 'center', inv: true }); }
      const bw = Math.ceil((b.hp / b.max) * 20); scr.frame(W - 23, TOP, 22, 3); scr.hline(W - 22, TOP + 1, bw);
    }
    for (const bl of st.bullets) scr.hline(bl.x, bl.y, 3);
    for (const s of st.shots) { scr.px(s.x, s.y); scr.px(s.x + 1, s.y); }
    if (st.beam > 0) { scr.rect(st.x + 9, st.beamY, W, 2); if (Math.floor(t * 40) % 2) scr.hline(st.x + 9, st.beamY - 1, W); }
    if (mode !== 'over' && mode !== 'win' && !(st.inv > 0 && Math.floor(t * 12) % 2)) scr.sprite(SHIP, st.x, st.y);
    for (const p of st.parts) scr.px(p.x, p.y);
    hud();
    if (mode === 'level') { scr.text(`NIVEL ${st.level + 1}/10`, W / 2, 20, { align: 'center', inv: true }); }
    if (paused) { scr.rect(14, 17, 56, 15, 0); scr.frame(14, 17, 56, 15); scr.text('PAUSA', W / 2, 19, { align: 'center' }); scr.text('A: CONTINUAR', W / 2, 25, { align: 'center' }); }
    if (mode === 'over') {
      scr.rect(8, 10, 68, 32, 0); scr.frame(8, 10, 68, 32);
      scr.text('FIM DO JOGO', W / 2, 13, { align: 'center' });
      scr.text(`PONTOS ${scr.num(st.score, 5)}`, W / 2, 21, { align: 'center' });
      scr.text(newBest ? 'NOVO RECORDE!' : `RECORDE ${scr.num(best, 5)}`, W / 2, 28, { align: 'center' });
      if (modeT > 0.8 && Math.floor(t * 2) % 2) scr.text('A: OUTRA VEZ', W / 2, 35, { align: 'center' });
    }
    if (mode === 'win') {
      scr.rect(4, 8, 76, 38, 0); scr.frame(4, 8, 76, 38);
      scr.text('VITORIA!', W / 2, 11, { align: 'center', inv: Math.floor(t * 3) % 2 === 0 });
      scr.text('10 CHEFES VENCIDOS', W / 2, 18, { align: 'center' });
      scr.text(`PONTOS ${scr.num(st.score, 5)}`, W / 2, 25, { align: 'center' });
      scr.text(newBest ? 'NOVO RECORDE!' : `RECORDE ${scr.num(best, 5)}`, W / 2, 32, { align: 'center' });
      if (modeT > 1.2 && Math.floor(t * 2) % 2) scr.text('A: RECOMECAR', W / 2, 39, { align: 'center' });
    }
    scr.present();
  }

  return {
    update, draw, pause() { if (mode === 'play') paused = true; },
    // para testes: saltar para um nível/chefe e ler o estado
    _test: { boss(l) { reset(); st.level = l; mode = 'play'; startBoss(); }, get state() { return { mode, level: st.level, lives: st.lives, score: st.score, boss: st.boss && { k: st.boss.k, hp: st.boss.hp } }; }, set lives(v) { st.lives = v; } },
  };
}

export function mountSpace(root, { onExit = () => {} } = {}) {
  const shell = mountShell(root, {
    title: 'Patrulha Estelar', stick: 'free',
    a: { k: 'fire', label: 'DISPARO' }, b: { k: 'alt', label: 'LASER' },
    mids: [{ k: 'back', label: 'SAIR' }, { k: 'ok', label: 'PAUSA' }, { k: 'mute', label: 'SOM' }],
    help: 'PC: setas/WASD movem · espaço dispara (manter = automático) · X laser · P pausa · Esc sai · M som',
  });
  let stopped = false;
  const cleanup = () => { stopped = true; stopLoop(); document.removeEventListener('visibilitychange', onHide); shell.destroy(); };
  const game = createSpace(createScreen(shell.canvas), shell, { onQuit: () => { if (!stopped) { cleanup(); onExit(); } } });
  const stopLoop = runLoop(game.update, game.draw);
  const onHide = () => { if (document.hidden) game.pause(); };
  document.addEventListener('visibilitychange', onHide);
  return () => { if (!stopped) cleanup(); };
}
