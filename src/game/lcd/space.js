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
const BOSSES = [
  { w: 18, h: 14, f: [[
    '      ######      ', '    ##########    ', '   ###      ###   ', '  ##  ######  ##  ', ' ##  ##    ##  ## ', ' ## ##  ##  ## ## ', '##  ## #### ##  ##',
    ' ## ##  ##  ## ## ', ' ##  ##    ##  ## ', '  ##  ######  ##  ', '   ###      ###   ', '  # ########## #  ', ' #  # # # # #  #  ', '#  #  #  #  #   # ',
  ], [
    '      ######      ', '    ##########    ', '   ###      ###   ', '  ##  ######  ##  ', ' ##  ##    ##  ## ', ' ## ## #### ## ## ', '##  ## #  # ##  ##',
    ' ## ## #### ## ## ', ' ##  ##    ##  ## ', '  ##  ######  ##  ', '   ###      ###   ', '  # ########## #  ', '  # # # # # # #   ', ' #  #  #  #  #  # ',
  ]] },
  { w: 18, h: 11, f: [[
    '        ####      ', '      ########    ', '    ############  ', '  #### ## ## #### ', ' ################ ', '##################',
    '# # # # # # # # ##', ' ################ ', '   ##  ##  ##  ## ', '    ## ## ## ##   ', '     #  #  #  #   ',
  ], [
    '        ####      ', '      ########    ', '    ############  ', '  #### ## ## #### ', ' ################ ', '##################',
    ' # # # # # # # # #', ' ################ ', '   ##  ##  ##  ## ', '   ##  ##  ##  ## ', '    #  #  #  #    ',
  ]] },
];
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
    const k = (st.level - 1) % BOSSES.length; const b = BOSSES[k];
    st.boss = { k, x: W + 2, y: 18, t: 0, hp: 24 + st.level * 10, max: 24 + st.level * 10, shoot: 1.5, flash: 0, w: b.w, h: b.h };
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
      st.score += 200 * st.level; st.boss = null; st.shots = [];
      mode = 'level'; modeT = 0; SFX_.level();
    }
  }

  // piloto automático das pré-visualizações
  function bot() {
    if (mode === 'title' || mode === 'over') { reset(); mode = 'play'; }
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
      if (mode === 'over' && modeT > 0.8 && (k === 'fire' || k === 'ok' || k === 'tap')) { reset(); mode = 'play'; SFX_.start(); continue; }
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
    if (mode === 'over') return;

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
      if (st.levelScore >= 250 + st.level * 100) startBoss();
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
    if (b) {
      b.t += dt; b.flash -= dt;
      const tx = W - b.w - 3; if (b.x > tx) b.x -= 16 * dt;
      b.y = TOP + 2 + (H - TOP - b.h - (hasHills() ? 14 : 4)) * (0.5 + 0.5 * Math.sin(b.t * (0.9 + st.level * 0.08)));
      b.shoot -= dt;
      if (b.shoot <= 0 && b.x <= tx + 1) {
        const cy = b.y + b.h / 2;
        if (Math.floor(b.t) % 3 === 0) for (const vy of [-14, 0, 14]) st.shots.push({ x: b.x, y: cy, vx: -42, vy });
        else { const ang = Math.atan2(st.y + 3 - cy, st.x - b.x); st.shots.push({ x: b.x, y: cy, vx: Math.cos(ang) * 50, vy: Math.sin(ang) * 50 }); }
        b.shoot = Math.max(0.6, 1.4 - st.level * 0.08);
      }
      for (const bl of st.bullets) if (!bl.dead && overlap(bl.x, bl.y, 3, 1, b.x, b.y, b.w, b.h)) { bl.dead = true; damageBoss(1); if (!st.boss) break; }
      if (st.boss && overlap(st.x + 1, st.y + 1, 7, 5, b.x, b.y, b.w, b.h)) hitPlayer();
    }
    // tiros inimigos
    for (const s of st.shots) { s.x += s.vx * dt; s.y += s.vy * dt; if (overlap(s.x, s.y, 2, 1, st.x + 1, st.y + 2, 7, 3)) { s.dead = true; hitPlayer(); } }
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
      const bw = Math.ceil((b.hp / b.max) * 20); scr.frame(W - 23, TOP, 22, 3); scr.hline(W - 22, TOP + 1, bw);
    }
    for (const bl of st.bullets) scr.hline(bl.x, bl.y, 3);
    for (const s of st.shots) { scr.px(s.x, s.y); scr.px(s.x + 1, s.y); }
    if (st.beam > 0) { scr.rect(st.x + 9, st.beamY, W, 2); if (Math.floor(t * 40) % 2) scr.hline(st.x + 9, st.beamY - 1, W); }
    if (mode !== 'over' && !(st.inv > 0 && Math.floor(t * 12) % 2)) scr.sprite(SHIP, st.x, st.y);
    for (const p of st.parts) scr.px(p.x, p.y);
    hud();
    if (mode === 'level') { scr.text(`NIVEL ${st.level + 1}`, W / 2, 20, { align: 'center', inv: true }); }
    if (paused) { scr.rect(14, 17, 56, 15, 0); scr.frame(14, 17, 56, 15); scr.text('PAUSA', W / 2, 19, { align: 'center' }); scr.text('A: CONTINUAR', W / 2, 25, { align: 'center' }); }
    if (mode === 'over') {
      scr.rect(8, 10, 68, 32, 0); scr.frame(8, 10, 68, 32);
      scr.text('FIM DO JOGO', W / 2, 13, { align: 'center' });
      scr.text(`PONTOS ${scr.num(st.score, 5)}`, W / 2, 21, { align: 'center' });
      scr.text(newBest ? 'NOVO RECORDE!' : `RECORDE ${scr.num(best, 5)}`, W / 2, 28, { align: 'center' });
      if (modeT > 0.8 && Math.floor(t * 2) % 2) scr.text('A: OUTRA VEZ', W / 2, 35, { align: 'center' });
    }
    scr.present();
  }

  return { update, draw, pause() { if (mode === 'play') paused = true; } };
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
