// Guerra das Eras — lógica do jogo (sem desenho nem DOM, para poder ser testada sozinha).
// Duas bases frente a frente: o jogador (lado 0, à esquerda) e a IA (lado 1, à direita).
// Treinam-se tropas com ouro, ganha-se ouro e XP a abater inimigos, e com XP evolui-se de era.

export const WORLD = { w: 480, h: 200, ground: 176, baseW: 44 };
export const BASE_HP = 500;
const SCALE = 2.3; // cada era é ~2,3x mais forte e mais cara que a anterior
const sc = (era) => SCALE ** era;

// tipo 0 = corpo a corpo, 1 = à distância, 2 = pesada
const UNIT_BASE = [
  { hp: 60, dmg: 15, rng: 0, spd: 20, rate: 1.0, cost: 15, time: 1.4 },
  { hp: 42, dmg: 10, rng: 75, spd: 19, rate: 1.3, cost: 25, time: 1.8 },
  { hp: 230, dmg: 36, rng: 0, spd: 14, rate: 1.5, cost: 100, time: 3.6 },
];
export const ERAS = [
  { name: 'Idade da Pedra', xp: 0, units: ['Caçador', 'Fundibulário', 'Cavaleiro de dino'], turret: 'Atirador de pedras', special: 'Chuva de meteoros', fx: 'meteor' },
  { name: 'Idade Média', xp: 1000, units: ['Espadachim', 'Arqueiro', 'Cavaleiro'], turret: 'Balista', special: 'Chuva de flechas', fx: 'arrows' },
  { name: 'Renascimento', xp: 3600, units: ['Piqueiro', 'Mosqueteiro', 'Canhão'], turret: 'Canhão de muralha', special: 'Barragem de artilharia', fx: 'shells' },
  { name: 'Era Moderna', xp: 11000, units: ['Soldado', 'Atirador', 'Tanque'], turret: 'Metralhadora', special: 'Bombardeamento aéreo', fx: 'bombs' },
  { name: 'Era Futurista', xp: 32000, units: ['Ciber-soldado', 'Soldado laser', 'Tanque laser'], turret: 'Canhão de plasma', special: 'Raio orbital', fx: 'laser' },
];
export function unitStats(era, type) {
  const b = UNIT_BASE[type]; const m = sc(era);
  return { hp: Math.round(b.hp * m), dmg: Math.round(b.dmg * m), rng: b.rng, spd: b.spd + era * 1.5, rate: b.rate, cost: Math.round(b.cost * m), time: b.time };
}
export function turretStats(era) {
  const m = sc(era);
  return { dmg: Math.round(8 * m), rng: 100, rate: 1.3, cost: Math.round(120 * m) };
}
export const SLOT_COST = [0, 400, 1500]; // 2.º e 3.º espaço para torres
export const MAX_SLOTS = 3;
export const QUEUE_MAX = 5;
export const SPECIAL_CD = 50; // segundos
const KILL_GOLD = 1.3; // ouro por baixa = 1,3x o custo da unidade abatida
const KILL_XP = 2.2;
const TRICKLE = 0.8; // ouro por segundo, para nunca ficar sem nada

export const DIFFICULTY = {
  easy: { label: 'Fácil', income: 0.7, think: [2.5, 4.5], slack: 0.35, special: 0.25, turretFrom: 2, evolveDelay: 12 },
  medium: { label: 'Médio', income: 1.0, think: [1.0, 1.8], slack: 0.15, special: 0.7, turretFrom: 1, evolveDelay: 3 },
  hard: { label: 'Difícil', income: 1.3, think: [0.25, 0.4], slack: 0, special: 1, turretFrom: 0, evolveDelay: 0 },
};

function newSide() {
  return { gold: 200, xp: 0, era: 0, hp: BASE_HP, queue: [], slots: 1, turrets: [null, null, null], specialCd: 15, kills: 0, lost: 0, spent: 0 };
}
export function createGame({ difficulty = 'medium', seed = Date.now() } = {}) {
  let s = seed >>> 0 || 1;
  const rand = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  return {
    t: 0, over: null, difficulty, ai: DIFFICULTY[difficulty], rand,
    sides: [newSide(), newSide()], units: [], shots: [], fx: [], texts: [], nextId: 1,
    aiTimer: 1.5, aiEvolveWait: 0, events: [],
  };
}

const dirOf = (side) => (side === 0 ? 1 : -1);
const spawnX = (side) => (side === 0 ? WORLD.baseW + 2 : WORLD.w - WORLD.baseW - 2);
const baseFront = (side) => (side === 0 ? WORLD.baseW : WORLD.w - WORLD.baseW); // frente da base deste lado

// ---------- Ações (jogador ou IA) ----------
export function canTrain(g, side, type) {
  const sd = g.sides[side]; const st = unitStats(sd.era, type);
  return !g.over && sd.gold >= st.cost && sd.queue.length < QUEUE_MAX;
}
export function train(g, side, type) {
  if (!canTrain(g, side, type)) return false;
  const sd = g.sides[side]; const st = unitStats(sd.era, type);
  sd.gold -= st.cost; sd.spent += st.cost;
  sd.queue.push({ type, era: sd.era, t: st.time, total: st.time });
  return true;
}
export const nextEraXp = (sd) => (sd.era < ERAS.length - 1 ? ERAS[sd.era + 1].xp : null);
export function canEvolve(g, side) { const sd = g.sides[side]; const need = nextEraXp(sd); return !g.over && need != null && sd.xp >= need; }
export function evolve(g, side) {
  if (!canEvolve(g, side)) return false;
  const sd = g.sides[side]; sd.era += 1;
  g.events.push({ type: 'evolve', side, era: sd.era });
  return true;
}
export function freeSlot(sd) { for (let i = 0; i < sd.slots; i++) if (!sd.turrets[i]) return i; return -1; }
export function canBuyTurret(g, side) { const sd = g.sides[side]; return !g.over && freeSlot(sd) >= 0 && sd.gold >= turretStats(sd.era).cost; }
export function buyTurret(g, side) {
  if (!canBuyTurret(g, side)) return false;
  const sd = g.sides[side]; const st = turretStats(sd.era); const i = freeSlot(sd);
  sd.gold -= st.cost; sd.spent += st.cost;
  sd.turrets[i] = { era: sd.era, ...st, cd: 0.5, aim: 0 };
  return true;
}
export function sellTurret(g, side) { // vende a torre mais antiga por metade do preço
  const sd = g.sides[side]; let best = -1;
  for (let i = 0; i < sd.slots; i++) if (sd.turrets[i] && (best < 0 || sd.turrets[i].era < sd.turrets[best].era)) best = i;
  if (best < 0 || g.over) return false;
  sd.gold += Math.round(sd.turrets[best].cost / 2); sd.turrets[best] = null;
  return true;
}
export function canAddSlot(g, side) { const sd = g.sides[side]; return !g.over && sd.slots < MAX_SLOTS && sd.gold >= SLOT_COST[sd.slots]; }
export function addSlot(g, side) {
  if (!canAddSlot(g, side)) return false;
  const sd = g.sides[side]; sd.gold -= SLOT_COST[sd.slots]; sd.spent += SLOT_COST[sd.slots]; sd.slots += 1;
  return true;
}
export function canSpecial(g, side) { return !g.over && g.sides[side].specialCd <= 0; }
// Ataque especial da era: cai sobre a metade do campo do adversário, com mais força onde há tropas
export function special(g, side) {
  if (!canSpecial(g, side)) return false;
  const sd = g.sides[side]; sd.specialCd = SPECIAL_CD;
  const kind = ERAS[sd.era].fx; const dmg = Math.round(70 * sc(sd.era));
  const enemies = g.units.filter((u) => u.side !== side);
  const n = kind === 'laser' ? 5 : kind === 'arrows' ? 14 : 8;
  for (let i = 0; i < n; i++) {
    const target = enemies.length && g.rand() < 0.7 ? enemies[Math.floor(g.rand() * enemies.length)].x : null;
    const lo = side === 0 ? WORLD.w * 0.25 : WORLD.baseW; const hi = side === 0 ? WORLD.w - WORLD.baseW : WORLD.w * 0.75;
    const x = target != null ? target + (g.rand() - 0.5) * 20 : lo + g.rand() * (hi - lo);
    g.fx.push({ kind, side, x, y: -10 - i * 14 - g.rand() * 20, vy: kind === 'arrows' ? 160 : 120, dmg: kind === 'arrows' ? dmg * 0.45 : dmg, r: kind === 'arrows' ? 10 : 22, delay: i * 0.12, done: false });
  }
  g.events.push({ type: 'special', side, kind });
  return true;
}

// ---------- Simulação ----------
function damageUnit(g, u, amount, bySide) {
  if (u.hp <= 0) return;
  u.hp -= amount; u.hit = 0.12;
  if (u.hp <= 0) {
    const killer = g.sides[bySide]; const st = unitStats(u.era, u.type);
    const mult = incomeOf(g, bySide); // a dificuldade da IA também mexe no ouro e XP ganhos em combate
    killer.gold += Math.round(st.cost * KILL_GOLD * mult); killer.xp += Math.round(st.cost * KILL_XP * mult); killer.kills += 1;
    g.sides[u.side].lost += 1;
    g.fx.push({ kind: 'boom', x: u.x, y: WORLD.ground - 6, t: 0, life: 0.35, big: u.type === 2 });
    if (bySide === 0) g.texts.push({ x: u.x, y: WORLD.ground - 26, text: `+${Math.round(st.cost * KILL_GOLD)}`, t: 0 });
  }
}
function damageBase(g, side, amount, bySide) {
  const sd = g.sides[side]; if (g.over) return;
  sd.hp = Math.max(0, sd.hp - amount);
  g.sides[bySide].xp += Math.round(amount * 0.5);
  if (sd.hp <= 0) g.over = { winner: bySide, t: g.t };
}
const incomeOf = (g, side) => (side === 1 ? g.ai.income : (g.playerIncome || 1));
export const SIEGE_AT = 600; // segundos: depois disto começa o cerco
// Dano contra a base: normalizado pela era, para a base de 500 HP aguentar em todas as eras
const vsBase = (u) => (u.dmg / sc(u.era)) * 0.55;

export function step(g, dt) {
  if (g.over) { g.t += dt; return; }
  g.t += dt;
  const { sides } = g;
  sides.forEach((sd, i) => {
    sd.gold += TRICKLE * dt * incomeOf(g, i);

    if (sd.specialCd > 0) sd.specialCd = Math.max(0, sd.specialCd - dt);
    // treino: a unidade da frente da fila sai quando acaba e há espaço à porta da base
    const q = sd.queue[0];
    if (q) {
      q.t -= dt;
      if (q.t <= 0) {
        const sx = spawnX(i);
        const blocked = g.units.some((u) => u.side === i && Math.abs(u.x - sx) < 10);
        if (!blocked) {
          const st = unitStats(q.era, q.type);
          g.units.push({ id: g.nextId++, side: i, era: q.era, type: q.type, x: sx, hp: st.hp, maxHp: st.hp, dmg: st.dmg, rng: st.rng, spd: st.spd, rate: st.rate, cd: 0.3, walk: 0, hit: 0, atk: 0 });
          sd.queue.shift();
        }
      }
    }
  });

  // Cerco: a partir dos 10 minutos as duas bases vão perdendo vida, cada vez mais depressa (evita empates sem fim)
  if (g.t > SIEGE_AT) {
    const loss = dt * (0.6 + (g.t - SIEGE_AT) / 120);
    sides.forEach((sd) => { sd.hp = Math.max(0, sd.hp - loss); });
    if (sides[0].hp <= 0 || sides[1].hp <= 0) { g.over = { winner: sides[0].hp >= sides[1].hp ? 0 : 1, t: g.t, siege: true }; return; }
  }

  // unidades
  const byX = g.units.slice().sort((a, b) => a.x - b.x);
  for (const u of g.units) {
    if (u.hp <= 0) continue;
    const d = dirOf(u.side);
    u.hit = Math.max(0, u.hit - dt); u.atk = Math.max(0, u.atk - dt);
    // inimigo mais próximo à frente
    let foe = null; let foeDist = Infinity;
    for (const o of byX) {
      if (o.side === u.side || o.hp <= 0) continue;
      const dist = (o.x - u.x) * d;
      if (dist >= -4 && dist < foeDist) { foeDist = dist; foe = o; }
    }
    // companheiro mais próximo à frente (não se atravessam)
    let allyDist = Infinity;
    for (const o of byX) {
      if (o === u || o.side !== u.side || o.hp <= 0) continue;
      const dist = (o.x - u.x) * d;
      if (dist > 0 && dist < allyDist) allyDist = dist;
    }
    const reach = Math.max(u.rng, 11);
    const baseDist = (baseFront(1 - u.side) - u.x) * d;
    let target = null;
    if (foe && foeDist <= reach) target = foe;
    else if (baseDist <= reach && (!foe || foeDist > baseDist)) target = 'base';
    const stop = target || allyDist < 12 || (foe && foeDist < 11) || baseDist <= 2;
    if (!stop) { u.x += d * u.spd * dt; u.walk += dt * u.spd * 0.25; }
    u.cd -= dt;
    if (target && u.cd <= 0) {
      u.cd = u.rate; u.atk = 0.18;
      if (u.rng > 0) {
        const tx = target === 'base' ? baseFront(1 - u.side) + d * 8 : target.x;
        g.shots.push({ x: u.x + d * 4, y: WORLD.ground - (u.type === 2 ? 10 : 12), tx, side: u.side, dmg: u.dmg, base: target === 'base', target: target === 'base' ? null : target.id, era: u.era, kind: 'unit', vsBase: vsBase(u) });
      } else if (target === 'base') damageBase(g, 1 - u.side, vsBase(u), u.side);
      else damageUnit(g, target, u.dmg, u.side);
    }
  }

  // torres
  sides.forEach((sd, i) => {
    for (let k = 0; k < sd.slots; k++) {
      const t = sd.turrets[k]; if (!t) continue;
      t.cd -= dt;
      let best = null; let bd = Infinity;
      for (const o of g.units) {
        if (o.side === i || o.hp <= 0) continue;
        const dist = Math.abs(o.x - baseFront(i));
        if (dist <= t.rng && dist < bd) { bd = dist; best = o; }
      }
      if (best) t.aim = best.x;
      if (best && t.cd <= 0) {
        t.cd = t.rate;
        const tx = i === 0 ? 30 : WORLD.w - 30;
        g.shots.push({ x: tx, y: WORLD.ground - 44 - k * 13, tx: best.x, side: i, dmg: t.dmg, base: false, target: best.id, era: t.era, kind: 'turret', ty: WORLD.ground - 10 });
      }
    }
  });

  // projéteis (acertam ao chegar ao destino)
  for (const p of g.shots) {
    const speed = 230; const dx = p.tx - p.x;
    const ty = p.ty != null ? p.ty : p.y;
    const dist = Math.hypot(dx, ty - p.y);
    const stepLen = speed * dt;
    if (dist <= stepLen) {
      p.done = true;
      if (p.base) damageBase(g, 1 - p.side, p.vsBase, p.side);
      else { const tgt = g.units.find((o) => o.id === p.target && o.hp > 0); if (tgt) damageUnit(g, tgt, p.dmg, p.side); }
    } else { p.x += (dx / dist) * stepLen; p.y += ((ty - p.y) / dist) * stepLen; }
  }
  g.shots = g.shots.filter((p) => !p.done);

  // efeitos dos ataques especiais e explosões
  for (const f of g.fx) {
    if (f.kind === 'boom') { f.t += dt; if (f.t >= f.life) f.done = true; continue; }
    if (f.delay > 0) { f.delay -= dt; continue; }
    if (f.kind === 'laser') { f.t = (f.t || 0) + dt; if (f.t > 0.5 && !f.hitDone) hitArea(g, f); if (f.t > 0.9) f.done = true; continue; }
    f.y += f.vy * dt;
    if (f.y >= WORLD.ground - 4) { hitArea(g, f); f.done = true; g.fx.push({ kind: 'boom', x: f.x, y: WORLD.ground - 4, t: 0, life: 0.4, big: f.kind !== 'arrows' }); }
  }
  g.fx = g.fx.filter((f) => !f.done);
  for (const t of g.texts) t.t += dt;
  g.texts = g.texts.filter((t) => t.t < 1);
  g.units = g.units.filter((u) => u.hp > 0);

  aiStep(g, dt);
}
function hitArea(g, f) {
  f.hitDone = true;
  for (const u of g.units) if (u.side !== f.side && Math.abs(u.x - f.x) <= f.r) damageUnit(g, u, f.dmg, f.side);
}

// ---------- IA ----------
// Fácil: menos rendimento, decide devagar e às vezes hesita. Médio: equilibrado.
// Difícil: decide quase instantaneamente, gere o ouro e pressiona.
export function aiStep(g, dt, side = 1, params = g.ai) {
  const sd = g.sides[side];
  if (sd.era < ERAS.length - 1 && sd.xp >= ERAS[sd.era + 1].xp) {
    g.aiEvolveWait = (g.aiEvolveWait || 0) + dt;
    if (g.aiEvolveWait >= params.evolveDelay) { evolve(g, side); g.aiEvolveWait = 0; }
  }
  g.aiTimer -= dt;
  if (g.aiTimer > 0) return;
  const [a, b] = params.think; g.aiTimer = a + g.rand() * (b - a);
  if (g.rand() < params.slack) return; // hesitação

  const foes = g.units.filter((u) => u.side !== side);
  const mine = g.units.filter((u) => u.side === side);
  const d = dirOf(side);
  const nearMyBase = foes.filter((u) => (baseFront(side) - u.x) * -d < 160).length;
  // especial: quando há tropas inimigas suficientes juntas
  if (canSpecial(g, side) && foes.length >= 4 && g.rand() < params.special) { special(g, side); return; }
  // torres e espaços: quando há ouro a mais e a base está a ser pressionada
  if (sd.era >= params.turretFrom) {
    if (freeSlot(sd) >= 0 && canBuyTurret(g, side) && nearMyBase >= 2 && sd.hp < BASE_HP * 0.85) { buyTurret(g, side); return; }
    if (params === DIFFICULTY.hard) {
      const old = sd.turrets.findIndex((t, i) => i < sd.slots && t && t.era < sd.era);
      if (old >= 0 && sd.gold > turretStats(sd.era).cost * 1.6) { sellTurret(g, side); buyTurret(g, side); return; }
      if (canAddSlot(g, side) && sd.gold > SLOT_COST[sd.slots] + unitStats(sd.era, 2).cost * 2) { addSlot(g, side); return; }
    }
  }
  if (sd.queue.length >= QUEUE_MAX) return;
  // tropas: o difícil responde ao que o jogador tem; os outros escolhem com algum acaso
  const heavyFoes = foes.filter((u) => u.type === 2).length;
  let type;
  if (params === DIFFICULTY.hard) {
    // ataca em vagas: junta ouro e depois enche a fila com uma mistura de pesadas, linha da frente e atiradores
    const heavy = unitStats(sd.era, 2).cost;
    if (heavyFoes > 0 && sd.gold >= heavy) type = 2;
    else if (mine.filter((u) => u.type === 0).length < 2) type = 0;
    else if (sd.gold >= heavy * 1.2) type = 2;
    else if (mine.filter((u) => u.type === 1).length < mine.filter((u) => u.type === 0).length) type = 1;
    else type = 0;
  } else {
    const r = g.rand();
    type = r < 0.45 ? 0 : r < 0.8 ? 1 : 2;
  }
  if (!train(g, side, type)) {
    if (params === DIFFICULTY.hard && type === 2) return; // guarda ouro para a pesada
    train(g, side, 0);
  }
}
