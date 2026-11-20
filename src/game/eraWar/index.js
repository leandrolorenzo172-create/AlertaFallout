// Guerra das Eras — interface (HTML + canvas) e ciclo do jogo. JavaScript puro, sem dependências.
import {
  WORLD, BASE_HP, ERAS, QUEUE_MAX, SPECIAL_CD, SLOT_COST, MAX_SLOTS, DIFFICULTY,
  createGame, step, unitStats, turretStats, train, canTrain, evolve, canEvolve, nextEraXp,
  special, canSpecial, buyTurret, canBuyTurret, sellTurret, addSlot, canAddSlot,
} from './logic';
import { render, themeColors, drawIcon, capIcon, CANVAS } from './render';
import * as audio from './audio';
import { card, spritesReady } from './sprites';

const STATS_KEY = 'pb_erawar_stats';
export function loadStats() {
  try { return JSON.parse(localStorage.getItem(STATS_KEY)) || {}; } catch { return {}; }
}
function saveResult(diff, won) {
  const s = loadStats(); const d = s[diff] || { w: 0, l: 0 };
  if (won) d.w += 1; else d.l += 1;
  s[diff] = d;
  try { localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch { /* sem armazenamento */ }
}

const TEMPLATE = `
<div class="ew-hud">
  <button type="button" class="ew-btn ew-pause" data-ew="pause" aria-label="Pausa">&#10074;&#10074;</button>
  <div class="ew-stat ew-caps"><b>CARICAS</b><span><img class="ew-cap" data-ew="capimg" alt="" width="12" height="12" /><span data-ew="gold">0</span></span></div>
  <div class="ew-stat"><b>XP</b><span data-ew="xp">0</span></div>
  <button type="button" class="ew-btn ew-evolve" data-ew="evolve"><b>EVOLUIR</b><span data-ew="evolveinfo"></span></button>
  <button type="button" class="ew-btn ew-special" data-ew="special"><b data-ew="spname">ESPECIAL</b><span data-ew="spinfo"></span><i data-ew="spbar"></i></button>
</div>
<div class="ew-queuebar">
  <span class="ew-label">TREINO</span>
  <div class="ew-queue" data-ew="queue"></div>
  <span class="ew-era" data-ew="eras"></span>
  <span class="ew-audio"><button type="button" data-ew="mus" aria-pressed="true">&#9835; MÚSICA</button><button type="button" data-ew="snd" aria-pressed="true">&#9836; EFEITOS</button></span>
</div>
<div class="ew-screen" data-ew="screen">
  <canvas data-ew="canvas" width="${CANVAS.w}" height="${CANVAS.h}" aria-label="Campo de batalha"></canvas>
  <span class="ew-hp l" data-ew="hp0">500 HP</span><span class="ew-hp r" data-ew="hp1">500 HP</span>
  <div class="ew-banner" data-ew="banner" hidden></div>
  <div class="ew-overlay" data-ew="overlay" hidden></div>
</div>
<div class="ew-tabs" role="tablist">
  <button type="button" role="tab" aria-selected="true" data-ew="tab0">TROPAS</button>
  <button type="button" role="tab" aria-selected="false" data-ew="tab1">DEFESAS</button>
</div>
<div class="ew-panel" data-ew="panel0">
  ${[0, 1, 2].map((i) => `<button type="button" class="ew-unit ew-card" data-ew="unit${i}"><span class="ew-no" data-ew="uno${i}">No.01</span><canvas width="120" height="96" data-ew="icon${i}"></canvas><span class="ew-uname" data-ew="uname${i}"></span><span class="ew-cost" data-ew="ucost${i}"></span><kbd>${i + 1}</kbd></button>`).join('')}
</div>
<div class="ew-panel" data-ew="panel1" hidden>
  <button type="button" class="ew-unit" data-ew="buyturret"><span class="ew-uname" data-ew="tname"></span><span class="ew-cost" data-ew="tcost"></span></button>
  <button type="button" class="ew-unit" data-ew="sellturret"><span class="ew-uname">Vender torre</span><span class="ew-cost">recupera metade</span></button>
  <button type="button" class="ew-unit" data-ew="addslot"><span class="ew-uname">Novo espaço</span><span class="ew-cost" data-ew="slotcost"></span></button>
</div>
<p class="ew-help">Teclas: <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> tropas · <kbd>Q</kbd> especial · <kbd>E</kbd> evoluir · <kbd>T</kbd> torre · <kbd>P</kbd> pausa</p>`;

export function mountEraWar(root, { difficulty = 'medium', onExit = () => {} } = {}) {
  root.classList.add('ew');
  root.innerHTML = TEMPLATE;
  const el = {};
  root.querySelectorAll('[data-ew]').forEach((n) => { el[n.dataset.ew] = n; });
  const ctx = el.canvas.getContext('2d');
  let C = themeColors(); // ecrã: verde fixo
  let CI = themeColors(true); // ícones dos botões: cor do tema
  let g = createGame({ difficulty });
  let paused = false; let destroyed = false; let raf = 0; let last = performance.now(); let acc = 0;
  let iconEra = -1; let bannerTimer = null; let recorded = false; let sirenDone = false;

  const setText = (n, v) => { const s = String(v); if (n.textContent !== s) n.textContent = s; };
  const setDis = (n, d) => { if (n.disabled !== d) n.disabled = d; };
  const fmt = (n) => Math.floor(n).toLocaleString('pt-PT');

  function banner(text) {
    el.banner.textContent = text; el.banner.hidden = false;
    clearTimeout(bannerTimer); bannerTimer = setTimeout(() => { el.banner.hidden = true; }, 2200);
  }
  function overlay(html) { el.overlay.innerHTML = html; el.overlay.hidden = !html; }

  function updateHud() {
    const me = g.sides[0]; const ai = g.sides[1];
    setText(el.gold, fmt(me.gold)); setText(el.xp, fmt(me.xp));
    const need = nextEraXp(me);
    setText(el.evolveinfo, need == null ? 'era máxima' : `${ERAS[me.era + 1].short} · ${fmt(need)} XP`);
    setDis(el.evolve, !canEvolve(g, 0));
    el.evolve.classList.toggle('ready', canEvolve(g, 0));
    setText(el.spname, ERAS[me.era].special.toUpperCase());
    setText(el.spinfo, me.specialCd > 0 ? `recarga ${Math.ceil(me.specialCd)} s` : 'pronto');
    el.spbar.style.width = `${(1 - me.specialCd / SPECIAL_CD) * 100}%`;
    setDis(el.special, !canSpecial(g, 0));
    setText(el.hp0, `${Math.ceil(me.hp)} HP`); setText(el.hp1, `${Math.ceil(ai.hp)} HP`);
    setText(el.eras, `TU: ${ERAS[me.era].short} · IA (${DIFFICULTY[g.difficulty].label}): ${ERAS[ai.era].short}`);
    // fila de treino: 5 casas, a primeira com barra de progresso
    const q = me.queue;
    if (el.queue.childElementCount !== QUEUE_MAX) el.queue.innerHTML = Array.from({ length: QUEUE_MAX }, () => '<i><b></b></i>').join('');
    [...el.queue.children].forEach((slot, i) => {
      const item = q[i]; slot.classList.toggle('on', !!item);
      slot.firstChild.style.width = item && i === 0 ? `${(1 - item.t / item.total) * 100}%` : (item ? '0%' : '0%');
      slot.title = item ? card(item.era, item.type).name : '';
    });
    for (let i = 0; i < 3; i++) {
      const st = unitStats(me.era, i);
      const cd = card(me.era, i); setText(el[`uname${i}`], cd.name); setText(el[`uno${i}`], `No.${String(cd.no).padStart(2, '0')}`); el[`unit${i}`].title = ERAS[me.era].units[i]; setText(el[`ucost${i}`], `${fmt(st.cost)} caricas`);
      setDis(el[`unit${i}`], !canTrain(g, 0, i));
    }
    const ts = turretStats(me.era);
    setText(el.tname, `${ERAS[me.era].turret}`); setText(el.tcost, `${fmt(ts.cost)} caricas · espaços ${me.turrets.slice(0, me.slots).filter(Boolean).length}/${me.slots}`);
    setDis(el.buyturret, !canBuyTurret(g, 0));
    setDis(el.sellturret, !me.turrets.some(Boolean) || !!g.over);
    setText(el.slotcost, me.slots >= MAX_SLOTS ? 'máximo de espaços' : `${fmt(SLOT_COST[me.slots])} caricas`);
    setDis(el.addslot, !canAddSlot(g, 0));
    if (iconEra !== me.era) {
      iconEra = me.era;
      for (let i = 0; i < 3; i++) drawIcon(el[`icon${i}`], me.era, i);
      const cap = capIcon(CI, 12); el.capimg.src = cap; root.style.setProperty('--ew-cap', `url(${cap})`);
    }
  }

  function handleEvents() {
    for (const s of g.sfx) {
      if (s.k === 'atk') audio.attack(s.era, s.type, s.x);
      else if (s.k === 'tur') audio.turret(s.era, s.x);
      else if (s.k === 'die') { audio.death(s.type, s.side, s.x); if (s.side === 1) audio.capGain(); }
      else if (s.k === 'base') audio.baseHit(s.side);
      else if (s.k === 'spawn') audio.trained();
    }
    g.sfx.length = 0;
    const danger = !g.over && g.sides[0].hp < BASE_HP * 0.3;
    audio.setTension(danger || (!g.over && g.t > 600));
    if (danger && !sirenDone) { sirenDone = true; audio.siren(); banner('BASE EM PERIGO!'); }
    for (const e of g.events) {
      if (e.type === 'evolve') { audio.evolveSfx(e.side === 0); if (e.side === 0) audio.setMusicEra(e.era); }
      if (e.type === 'special') { audio.specialSfx(e.kind, e.side); if (e.kind === 'nuke' && e.side === 1) banner('ALERTA: MINI NUKE INIMIGA!'); }
      if (e.type === 'nukeHit') { el.screen.classList.remove('ew-shake'); void el.screen.offsetWidth; el.screen.classList.add('ew-shake'); }
      if (e.type === 'evolve') banner(e.side === 0 ? `NOVA ERA: ${ERAS[e.era].name.toUpperCase()}` : `A IA AVANÇOU PARA: ${ERAS[e.era].name.toUpperCase()}`);
      if (e.type === 'special' && e.side === 1) banner(`IA: ${ERAS[g.sides[1].era].special.toUpperCase()}!`);
    }
    g.events.length = 0;
    if (g.over && !recorded) {
      recorded = true;
      const won = g.over.winner === 0; saveResult(g.difficulty, won);
      audio.jingle(won);
      const me = g.sides[0]; const m = Math.floor(g.t / 60); const s = Math.floor(g.t % 60);
      overlay(`<h2>${won ? 'VITÓRIA' : 'DERROTA'}</h2>
        <p>${won ? 'A base inimiga caiu.' : 'A tua base caiu.'}${g.over.siege ? ' (decidido pelo cerco)' : ''}</p>
        <p class="ew-small">Tempo ${m}m${String(s).padStart(2, '0')}s · Era ${ERAS[me.era].name} · ${me.kills} baixas inimigas · ${me.lost} tropas perdidas</p>
        <div class="ew-row"><button type="button" class="ew-btn" data-act="again">JOGAR OUTRA VEZ</button><button type="button" class="ew-btn" data-act="exit">MENU</button></div>`);
    }
  }

  function setPaused(p) {
    if (g.over) return;
    paused = p;
    audio.pauseAudio(p);
    overlay(p ? `<h2>PAUSA</h2><p class="ew-small">Dificuldade: ${DIFFICULTY[g.difficulty].label}</p>
      <div class="ew-row"><button type="button" class="ew-btn" data-act="resume">CONTINUAR</button><button type="button" class="ew-btn" data-act="restart">RECOMEÇAR</button><button type="button" class="ew-btn" data-act="exit">SAIR</button></div>` : '');
    if (!p) last = performance.now();
  }
  function restart() {
    g = createGame({ difficulty }); recorded = false; sirenDone = false; iconEra = -1; paused = false; overlay(''); last = performance.now();
    audio.pauseAudio(false); audio.ui.start(); audio.playMusic('battle', 0); audio.setMusicEra(0);
  }

  // ---------- Ciclo: passo fixo de 1/60 s ----------
  const DT = 1 / 60;
  function frame(now) {
    if (destroyed) return;
    if (!paused) {
      acc += Math.min(0.25, (now - last) / 1000);
      while (acc >= DT) { step(g, DT); acc -= DT; }
    }
    last = now;
    render(ctx, g, C, now / 1000);
    handleEvents();
    updateHud();
    raf = requestAnimationFrame(frame);
  }

  // ---------- Controlos ----------
  const offs = [];
  const on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); offs.push(() => t.removeEventListener(ev, fn, o)); };
  const act = (fn) => { audio.unlock(); if (fn()) audio.ui.coin(); else audio.ui.error(); };
  const doTrain = (i) => act(() => train(g, 0, i));
  const doEvolve = () => { audio.unlock(); if (!evolve(g, 0)) audio.ui.error(); };
  const doSpecial = () => { audio.unlock(); if (!special(g, 0)) audio.ui.error(); };
  for (let i = 0; i < 3; i++) on(el[`unit${i}`], 'click', () => doTrain(i));
  on(el.evolve, 'click', doEvolve);
  on(el.special, 'click', doSpecial);
  on(el.buyturret, 'click', () => act(() => buyTurret(g, 0)));
  on(el.sellturret, 'click', () => act(() => sellTurret(g, 0)));
  on(el.addslot, 'click', () => act(() => addSlot(g, 0)));
  on(el.pause, 'click', () => { audio.ui.select(); setPaused(!paused); });
  const syncAudioBtns = () => { const pr = audio.getPrefs(); el.mus.setAttribute('aria-pressed', String(pr.music)); el.snd.setAttribute('aria-pressed', String(pr.sfx)); };
  on(el.mus, 'click', () => { audio.unlock(); audio.setPref('music', !audio.getPrefs().music); syncAudioBtns(); audio.ui.select(); });
  on(el.snd, 'click', () => { audio.unlock(); audio.setPref('sfx', !audio.getPrefs().sfx); syncAudioBtns(); audio.ui.select(); });
  syncAudioBtns();
  const tab = (n) => {
    [0, 1].forEach((k) => { el[`panel${k}`].hidden = k !== n; el[`tab${k}`].setAttribute('aria-selected', String(k === n)); });
  };
  on(el.tab0, 'click', () => { audio.ui.select(); tab(0); }); on(el.tab1, 'click', () => { audio.ui.select(); tab(1); });
  on(el.overlay, 'click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'resume') { setPaused(false); audio.ui.confirm(); }
    if (act === 'restart' || act === 'again') restart();
    if (act === 'exit') { audio.pauseAudio(false); audio.ui.back(); onExit(); }
  });
  on(window, 'keydown', (e) => {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    const k = e.key.toLowerCase();
    if (k === 'p' || k === 'escape') { setPaused(!paused); e.preventDefault(); return; }
    if (paused || g.over) return;
    if (k === '1' || k === '2' || k === '3') doTrain(Number(k) - 1);
    else if (k === 'q') doSpecial();
    else if (k === 'e') doEvolve();
    else if (k === 't') act(() => buyTurret(g, 0));
  });
  // pausa sozinho quando a app vai para segundo plano
  on(document, 'visibilitychange', () => { if (document.hidden && !g.over) setPaused(true); });
  // muda de cor com o tema da app
  const themeWatch = new MutationObserver(() => { CI = themeColors(true); iconEra = -1; });
  themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'data-pb'] });

  // as cartas desenham-se quando a folha de personagens acabar de carregar
  spritesReady.then(() => { iconEra = -1; });
  // música de batalha e fanfarra de início (o jogo começa depois de um toque em JOGAR, por isso o som pode tocar)
  audio.unlock(); audio.pauseAudio(false); audio.ui.start(); audio.playMusic('battle', 0);
  // ao começar, o jogo fica no topo do ecrã
  requestAnimationFrame(() => { try { root.scrollIntoView({ block: 'start' }); } catch { /* sem efeito */ } });
  raf = requestAnimationFrame(frame);
  return function destroy() {
    destroyed = true; cancelAnimationFrame(raf); clearTimeout(bannerTimer);
    audio.stopMusic(); audio.pauseAudio(false);
    offs.forEach((f) => f()); themeWatch.disconnect();
    root.innerHTML = ''; root.classList.remove('ew');
  };
}
export { DIFFICULTY, BASE_HP };
