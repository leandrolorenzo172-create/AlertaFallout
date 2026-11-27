// Cobra — o clássico da cobrinha num ecrã LCD (84x48), com recorde guardado no browser.
import { attachLcdRemote } from './remote';
// Direção: setas / WASD / 2 4 6 8 ou deslizar o dedo no ecrã · Nível no menu: ◀ ▶ · Pausa: OK / P · Sair: C / Esc
import { W, createScreen, mountShell, runLoop, SFX, getSound, setSound, loadBest, saveBest } from './engine';

import { lcdMusic } from './music';
import { t as tr } from '../../i18n';

const MUTE = new Proxy({}, { get: () => () => {} });

const BEST = 'pb_lcd_snake_best';
const LEVEL_KEY = 'pb_lcd_snake_level';
const CELL = 3; const COLS = 27; const ROWS = 13; const OX = 1; const OY = 8; // campo: 27x13 casas de 3 píxeis
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
const BUGS = [['# # #', ' ### ', '#####', ' # # '], ['#   #', '#####', ' ### ', '# # #'], [' ### ', '## ##', ' ### ', '# # #']];

// Lógica e desenho do jogo, separados da interface (as pré-visualizações usam o mesmo código a jogar sozinho)
export function createSnake(scr, shell, { demo = false, onQuit = () => {}, music = null } = {}) {
  const SFX_ = demo ? MUTE : SFX;
  const M = music || MUTE; // música chiptune (só no jogo a sério)
  let best = loadBest(BEST);
  let level = 5; try { level = Number(localStorage.getItem(LEVEL_KEY)) || 5; } catch { /* sem armazenamento */ }
  if (demo) level = 7;
  let mode = 'title'; let modeT = 0; let paused = false; let newBest = false;
  let st;

  function reset() {
    const y = Math.floor(ROWS / 2);
    st = { body: [[8, y], [7, y], [6, y], [5, y], [4, y]], dir: 'right', queue: [], acc: 0, grow: 0, score: 0, eaten: 0, food: null, bug: null, dead: 0 };
    placeFood();
  }
  const free = (x, y) => !st.body.some(([bx, by]) => bx === x && by === y) && !(st.bug && y === st.bug.y && (x === st.bug.x || x === st.bug.x + 1));
  function randFree(w = 1) {
    for (let n = 0; n < 500; n++) {
      const x = Math.floor(Math.random() * (COLS - w + 1)); const y = Math.floor(Math.random() * ROWS);
      if (free(x, y) && (w === 1 || free(x + 1, y)) && !(st.food && st.food[0] === x && st.food[1] === y)) return [x, y];
    }
    return null;
  }
  function placeFood() { st.food = randFree(1); }
  const stepTime = () => Math.max(0.05, 0.34 - level * 0.029 - Math.min(0.04, st.eaten * 0.0015));

  function turn(d) {
    if (mode !== 'play' || paused) return;
    const last = st.queue.length ? st.queue[st.queue.length - 1] : st.dir;
    if (d === last || d === OPP[last] || st.queue.length >= 2) return;
    st.queue.push(d);
  }
  shell.onSwipe((d) => { if (mode === 'play') turn(d); else if (mode === 'title' && (d === 'left' || d === 'right')) changeLevel(d === 'right' ? 1 : -1); });
  function changeLevel(dv) { level = Math.max(1, Math.min(9, level + dv)); try { localStorage.setItem(LEVEL_KEY, String(level)); } catch { /* sem armazenamento */ } SFX_.key(); }
  function start() { reset(); mode = 'play'; paused = false; modeT = 0; SFX_.start(); M.play(level); }
  function die() {
    st.dead = 1; mode = 'dying'; modeT = 0; SFX_.die(); M.stop();
    newBest = st.score > best; if (newBest && !demo) { best = st.score; saveBest(BEST, best); }
  }

  function advance() {
    if (st.queue.length) st.dir = st.queue.shift();
    const [dx, dy] = DIRS[st.dir]; const [hx, hy] = st.body[0];
    const nx = hx + dx; const ny = hy + dy;
    // bate nas paredes ou no próprio corpo (a cauda sai do sítio neste passo, por isso não conta)
    const tailMoves = st.grow === 0;
    const hitsBody = st.body.some(([bx, by], i) => bx === nx && by === ny && !(tailMoves && i === st.body.length - 1));
    if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || hitsBody) { die(); return; }
    st.body.unshift([nx, ny]);
    if (st.grow > 0) st.grow -= 1; else st.body.pop();
    if (st.food && nx === st.food[0] && ny === st.food[1]) {
      st.score += level + 3; st.eaten += 1; st.grow += 1; SFX_.eat(); placeFood(); M.speed(level + Math.floor(st.eaten / 6));
      if (st.eaten % 5 === 0 && !st.bug) { const p = randFree(2); if (p) st.bug = { x: p[0], y: p[1], left: 24, kind: Math.floor(Math.random() * BUGS.length) }; }
    } else if (st.bug && ny === st.bug.y && (nx === st.bug.x || nx === st.bug.x + 1)) {
      st.score += 5 * level + st.bug.left * 2; st.grow += 2; st.bug = null; SFX_.bonus();
    }
    if (st.bug) { st.bug.left -= 1; if (st.bug.left <= 0) st.bug = null; }
    if (!st.food) placeFood();
  }

  // piloto automático das pré-visualizações: vai para a comida pelo caminho seguro
  function bot() {
    const [hx, hy] = st.body[0]; const f = st.food || [0, 0];
    const safe = (d) => {
      const [dx, dy] = DIRS[d]; const nx = hx + dx; const ny = hy + dy;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) return false;
      return !st.body.some(([bx, by], i) => i < st.body.length - 1 && bx === nx && by === ny);
    };
    const opts = Object.keys(DIRS).filter((d) => d !== OPP[st.dir] && safe(d));
    if (!opts.length) return;
    opts.sort((a, b) => { const da = Math.abs(hx + DIRS[a][0] - f[0]) + Math.abs(hy + DIRS[a][1] - f[1]); const db = Math.abs(hx + DIRS[b][0] - f[0]) + Math.abs(hy + DIRS[b][1] - f[1]); return da - db; });
    st.queue = [opts[0]];
  }

  function update(dt) {
    if (demo) { if (mode === 'title') start(); if (mode === 'over' && modeT > 1) start(); if (st.body.length > 40) start(); }
    for (const k of shell.take()) {
      if (k === 'mute') { setSound(!getSound()); SFX_.key(); M.sound(getSound()); continue; }
      if (k === 'back') { if (mode === 'play' && !paused) { paused = true; M.pause(true); SFX_.key(); } else { onQuit(); return; } continue; }
      if (mode === 'title') {
        if (k === 'left' || k === 'down') changeLevel(-1); else if (k === 'right' || k === 'up') changeLevel(1);
        else if (k === 'fire' || k === 'ok' || k === 'tap') start();
        continue;
      }
      if (mode === 'over') { if (modeT > 0.6 && (k === 'fire' || k === 'ok' || k === 'tap')) start(); continue; }
      if (mode === 'play') {
        if (k === 'ok' || (paused && (k === 'fire' || k === 'tap'))) { paused = !paused; M.pause(paused); SFX_.key(); continue; }
        if (DIRS[k]) turn(k);
      }
    }
    modeT += dt;
    if (mode === 'dying' && modeT > 1.3) { mode = 'over'; modeT = 0; }
    if (mode !== 'play' || paused) return;
    st.acc += dt;
    const stt = stepTime();
    while (st.acc >= stt && mode === 'play') { st.acc -= stt; if (demo) bot(); advance(); }
  }

  // segmento: bloco 2x2 com ligação ao segmento seguinte (o aspeto "corrente" do LCD)
  function drawSnake() {
    const b = st.body;
    for (let i = b.length - 1; i >= 0; i--) {
      const [x, y] = b[i]; const px = OX + x * CELL; const py = OY + y * CELL;
      if (i === 0) {
        scr.rect(px, py, 3, 3);
        // boca aberta quando a comida está à frente
        const [dx, dy] = DIRS[st.dir]; const f = st.food;
        if (f && f[0] === x + dx && f[1] === y + dy) { if (dx) scr.px(px + (dx > 0 ? 2 : 0), py + 1, 0); else scr.px(px + 1, py + (dy > 0 ? 2 : 0), 0); }
        else { scr.px(px + 1, py + 1, 0); }
        continue;
      }
      scr.rect(px, py, 2, 2);
      const [nx, ny] = b[i - 1];
      if (nx > x) scr.px(px + 2, py); else if (nx < x) scr.px(px - 1, py); else if (ny > y) scr.px(px, py + 2); else scr.px(px, py - 1);
      if (i % 2) scr.px(px + 1, py + 1, 0);
    }
  }
  function draw() {
    scr.clear(); const t = performance.now() / 1000;
    if (mode === 'title') {
      scr.text(tr('COBRA'), W / 2, 3, { align: 'center' });
      // cobra animada a percorrer um retângulo
      const path = []; for (let x = 10; x < 74; x += 3) path.push([x, 12]); for (let y = 12; y < 20; y += 3) path.push([73, y]); for (let x = 73; x > 10; x -= 3) path.push([x, 20]); for (let y = 20; y > 12; y -= 3) path.push([10, y]);
      const head = Math.floor(t * 12) % path.length;
      for (let i = 0; i < 12; i++) { const [x, y] = path[(head - i + path.length) % path.length]; scr.rect(x, y, i ? 2 : 3, i ? 2 : 3); }
      scr.text(`${tr('NIVEL')} < ${level} >`, W / 2, 26, { align: 'center' });
      if (Math.floor(t * 2) % 2) scr.text(tr('A: JOGAR'), W / 2, 33, { align: 'center' });
      scr.text(`${tr('RECORDE')} ${scr.num(best, 4)}`, W / 2, 41, { align: 'center' });
      scr.present(); return;
    }
    // barra de estado: pontos à esquerda, contagem do bicho de bónus e recorde à direita
    scr.text(scr.num(st.score, 4), 0, 0);
    if (st.bug) { scr.sprite(BUGS[st.bug.kind], 40, 0); scr.text(scr.num(st.bug.left, 2), 47, 0); }
    else scr.text(`R${scr.num(best, 4)}`, W, 0, { align: 'right' });
    scr.frame(0, 7, W, 41);
    if (st.food) { const px = OX + st.food[0] * CELL; const py = OY + st.food[1] * CELL; scr.sprite([' # ', '# #', ' # '], px, py); }
    if (st.bug && Math.floor(t * 4) % 4) { scr.sprite(BUGS[st.bug.kind], OX + st.bug.x * CELL, OY + st.bug.y * CELL - 1); }
    if (!(mode === 'dying' && Math.floor(t * 6) % 2)) drawSnake();
    if (paused) { scr.rect(14, 17, 56, 15, 0); scr.frame(14, 17, 56, 15); scr.text('PAUSA', W / 2, 19, { align: 'center' }); scr.text(tr('A: CONTINUAR'), W / 2, 25, { align: 'center' }); }
    if (mode === 'over') {
      scr.rect(8, 10, 68, 32, 0); scr.frame(8, 10, 68, 32);
      scr.text(tr('FIM DO JOGO'), W / 2, 13, { align: 'center' });
      scr.text(`${tr('PONTOS')} ${scr.num(st.score, 4)}`, W / 2, 21, { align: 'center' });
      scr.text(newBest ? tr('NOVO RECORDE!') : `${tr('RECORDE')} ${scr.num(best, 4)}`, W / 2, 28, { align: 'center' });
      if (modeT > 0.6 && Math.floor(t * 2) % 2) scr.text(tr('A: OUTRA VEZ'), W / 2, 35, { align: 'center' });
    }
    scr.present();
  }

  reset();
  return {
    update, draw, pause() { if (mode === 'play') { paused = true; M.pause(true); } },
    // menu ≡: estado e recomeçar já
    get status() { return { mode, paused }; },
    restart() { start(); },
  };
}

export function mountSnake(root, { onExit = () => {}, autoStart = false } = {}) {
  const shell = mountShell(root, {
    title: tr('Cobra'), stick: 'dominant',
    a: { k: 'ok', label: tr('PAUSA') }, b: { k: 'mute', label: tr('SOM') },
    mids: [{ k: 'back', label: tr('SAIR') }],
    help: tr('PC: setas/WASD mudam a direção · espaço/Enter começa · ◀ ▶ escolhem o nível no menu · P pausa · Esc sai · M som'),
  });
  let stopped = false;
  const cleanup = () => { stopped = true; offRemote(); music.stop(); stopLoop(); document.removeEventListener('visibilitychange', onHide); shell.destroy(); };
  const music = lcdMusic('snake');
  const game = createSnake(createScreen(shell.canvas), shell, { music, onQuit: () => { if (!stopped) { cleanup(); onExit(); } } });
  const stopLoop = runLoop(game.update, game.draw);
  const offRemote = attachLcdRemote(shell, game);
  if (autoStart) game.restart(); // começado pelo menu ≡ (REINICIAR PARTIDA): salta o ecrã inicial
  const onHide = () => { if (document.hidden) game.pause(); };
  document.addEventListener('visibilitychange', onHide);
  return () => { if (!stopped) cleanup(); };
}
