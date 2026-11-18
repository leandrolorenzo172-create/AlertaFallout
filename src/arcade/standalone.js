// Mini Arcade Retro — versão de ficheiro único (HTML com CSS e JavaScript embutidos) com os 3 jogos da app:
// Guerra das Eras, Patrulha Estelar e Cobra. Gerado por scripts/build-arcade.mjs. Funciona sem internet.
import { mountEraWar } from '../game/eraWar';
import * as audio from '../game/eraWar/audio';
import { mountSpace } from '../game/lcd/space';
import { mountSnake } from '../game/lcd/snake';
import eraCss from '../game/eraWar/eraWar.css';
import lcdCss from '../game/lcd/lcd.css';

const css = `
:root { --c: 0 255 65; --cd: 0 26 0; --cb: 0 10 0; color-scheme: dark; }
* { box-sizing: border-box; }
html, body { margin: 0; min-height: 100%; background: #020802; color: rgb(var(--c)); font-family: 'Courier New', ui-monospace, monospace; }
body::after { content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 50; background: repeating-linear-gradient(0deg, rgb(0 0 0 / 0.18) 0 1px, transparent 1px 3px); }
.arc-top { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; gap: 10px; padding: 8px 14px; background: rgb(var(--cd)); border-bottom: 2px solid rgb(var(--c) / 0.35); }
.arc-top h1 { margin: 0; flex: 1; font-size: 14px; letter-spacing: .2em; text-shadow: 0 0 8px rgb(var(--c) / 0.6); }
.arc-btn { font: inherit; font-size: 12px; letter-spacing: .1em; color: rgb(var(--c)); background: rgb(var(--cb)); border: 2px solid rgb(var(--c) / 0.4); border-radius: 3px; padding: 6px 12px; cursor: pointer; }
.arc-btn:hover, .arc-btn:focus-visible { border-color: rgb(var(--c)); outline: none; }
.arc-menu { max-width: 760px; margin: 0 auto; padding: 22px 16px 40px; }
.arc-menu p { font-size: 12px; line-height: 1.6; color: rgb(var(--c) / 0.75); }
.arc-list { display: grid; gap: 12px; margin-top: 16px; }
.arc-item { display: grid; grid-template-columns: 48px 1fr; gap: 12px; align-items: center; text-align: left; padding: 14px; font: inherit; color: rgb(var(--c));
  background: rgb(var(--cd) / 0.6); border: 2px solid rgb(var(--c) / 0.35); border-radius: 4px; cursor: pointer; }
.arc-item:hover, .arc-item:focus-visible { border-color: rgb(var(--c)); background: rgb(var(--c) / 0.1); outline: none; }
.arc-item b { display: block; font-size: 16px; letter-spacing: .12em; }
.arc-item span { display: block; margin-top: 4px; font-size: 11px; color: rgb(var(--c) / 0.7); }
.arc-num { display: flex; align-items: center; justify-content: center; width: 48px; height: 48px; font-size: 24px; font-weight: bold; border: 2px solid rgb(var(--c) / 0.6); border-radius: 50%; }
.arc-item .arc-num { display: flex; margin-top: 0; font-size: 24px; color: rgb(var(--c)); }
.arc-item .arc-diff { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.arc-diff button[aria-pressed="true"] { background: rgb(var(--c) / 0.2); border-color: rgb(var(--c)); }
.arc-stage { padding-top: 10px; }
`;

const style = document.createElement('style');
style.textContent = css + eraCss + lcdCss;
document.head.appendChild(style);

const app = document.getElementById('app');
let stop = null;
let diff = 'medium';
try { diff = localStorage.getItem('pb_erawar_diff') || 'medium'; } catch { /* sem armazenamento */ }

function menu() {
  if (stop) { stop(); stop = null; }
  audio.stopMusic();
  document.title = 'Mini Arcade Retro';
  app.innerHTML = `
<header class="arc-top"><h1>MINI ARCADE RETRO</h1></header>
<main class="arc-menu">
  <p>Escolhe um jogo: toca no cartão ou carrega no número no teclado. Dentro de cada jogo, <b>C</b> ou <b>Esc</b> volta a este menu. Funciona sem internet, no telemóvel e no computador.</p>
  <div class="arc-list">
    <button type="button" class="arc-item" data-g="space"><span class="arc-num">1</span><span><b>PATRULHA ESTELAR</b><span>Nave espacial de rolagem lateral num ecrã LCD retro: vagas de inimigos, montanhas, laser e chefes.</span></span></button>
    <button type="button" class="arc-item" data-g="snake"><span class="arc-num">2</span><span><b>COBRA</b><span>O clássico da cobrinha: come para crescer, não batas nas paredes nem em ti. Recorde guardado.</span></span></button>
    <div class="arc-item" style="cursor:default"><span class="arc-num">3</span><span><b>GUERRA DAS ERAS</b><span>Defesa de base em pixel art de fósforo verde, 5 eras e IA ajustável.</span>
      <span class="arc-diff" role="group" aria-label="Dificuldade">
        ${[['easy', 'Fácil'], ['medium', 'Médio'], ['hard', 'Difícil']].map(([id, l]) => `<button type="button" class="arc-btn" data-d="${id}" aria-pressed="${diff === id}">${l}</button>`).join('')}
        <button type="button" class="arc-btn" data-g="erawar">▶ JOGAR</button>
      </span></span></div>
  </div>
</main>`;
}

function play(g) {
  audio.unlock();
  app.innerHTML = `<header class="arc-top"><h1>${g === 'space' ? 'PATRULHA ESTELAR' : g === 'snake' ? 'COBRA' : 'GUERRA DAS ERAS'}</h1><button type="button" class="arc-btn" data-act="menu">◀ MENU</button></header><main class="arc-stage"><div id="stage"></div></main>`;
  const stage = document.getElementById('stage');
  const onExit = () => { stop = null; menu(); };
  if (g === 'space') stop = mountSpace(stage, { onExit });
  else if (g === 'snake') stop = mountSnake(stage, { onExit });
  else stop = mountEraWar(stage, { difficulty: diff, onExit });
}

app.addEventListener('click', (e) => {
  const d = e.target.closest('[data-d]');
  if (d) { diff = d.dataset.d; try { localStorage.setItem('pb_erawar_diff', diff); } catch { /* sem armazenamento */ } app.querySelectorAll('[data-d]').forEach((b) => b.setAttribute('aria-pressed', String(b === d))); return; }
  const gb = e.target.closest('[data-g]'); if (gb) { play(gb.dataset.g); return; }
  if (e.target.closest('[data-act="menu"]')) menu();
});
window.addEventListener('keydown', (e) => {
  if (stop) return; // dentro de um jogo, as teclas são do jogo
  if (e.key === '1') play('space'); else if (e.key === '2') play('snake'); else if (e.key === '3') play('erawar');
});
menu();
