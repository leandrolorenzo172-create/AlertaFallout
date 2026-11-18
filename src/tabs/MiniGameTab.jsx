import React, { useEffect, useRef, useState } from 'react';
import { Gamepad2, Swords, Shield, Zap, TrendingUp, Rocket, Worm } from 'lucide-react';
import { mountEraWar, loadStats } from '../game/eraWar';
import { createGame, step, train, DIFFICULTY } from '../game/eraWar/logic';
import { render, themeColors, CANVAS } from '../game/eraWar/render';
import '../game/eraWar/eraWar.css';
import * as audio from '../game/eraWar/audio';
import { mountSpace } from '../game/lcd/space';
import { mountSnake } from '../game/lcd/snake';
import '../game/lcd/lcd.css';

const GAMES = [
  { id: 'erawar', name: 'Guerra das Eras', sub: 'Defesa de base', icon: Swords },
  { id: 'space', name: 'Patrulha Estelar', sub: 'Nave · LCD', icon: Rocket },
  { id: 'snake', name: 'Cobra', sub: 'Cobrinha · LCD', icon: Worm },
];
const LCD_INFO = {
  space: {
    title: 'PATRULHA ESTELAR', tag: 'Shooter de rolagem lateral · ecrã LCD retro',
    text: 'Pilota a nave pelo espaço, abate as vagas de inimigos que chegam pela direita, desvia-te das montanhas e enfrenta o chefe no fim de cada nível.',
    points: ['3 vidas (corações) e bónus de vida', 'Laser especial que limpa a linha', 'Chefes resistentes que disparam em leque', 'Recorde guardado no aparelho'],
  },
  snake: {
    title: 'COBRA', tag: 'O clássico da cobrinha · ecrã LCD retro',
    text: 'Come os pontos para crescer e somar pontos. Não batas nas paredes nem no teu corpo. De vez em quando aparece um bicho de bónus por pouco tempo.',
    points: ['9 níveis de velocidade', 'Bicho de bónus com contagem', 'Deslizar o dedo ou setas', 'Recorde guardado no aparelho'],
  },
};

function LcdGame({ kind, onExit }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    const stop = (kind === 'space' ? mountSpace : mountSnake)(el, { onExit });
    el.scrollIntoView({ block: 'start' });
    return stop;
  }, [kind, onExit]);
  return <div ref={ref} style={{ scrollMarginTop: 46 }} />;
}

const DIFFS = [
  { id: 'easy', desc: 'A IA junta caricas mais devagar e demora a evoluir.' },
  { id: 'medium', desc: 'Ritmo equilibrado de ataque e de evolução.' },
  { id: 'hard', desc: 'Gere bem as caricas, constrói defesas e usa os especiais na altura certa.' },
];

// Pré-visualização animada no cartão: uma batalha IA contra IA a correr em segundo plano
function Preview() {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current; const ctx = cv.getContext('2d');
    const g = createGame({ difficulty: 'medium', seed: 42 });
    g.sides[0].gold = 600; g.sides[1].gold = 600;
    let raf = 0; let last = performance.now(); let C = themeColors();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      // o lado esquerdo também joga sozinho
      if (Math.random() < dt * 0.9) { const t = Math.random() < 0.6 ? 0 : Math.random() < 0.7 ? 1 : 2; const sd = g.sides[0]; if (sd.queue.length < 5) { sd.gold += 30; train(g, 0, t); } }
      step(g, dt);
      if (g.over || g.t > 90) { Object.assign(g, createGame({ difficulty: 'medium', seed: Math.floor(now) })); g.sides[0].gold = 600; g.sides[1].gold = 600; }
      render(ctx, g, C, now / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const mo = new MutationObserver(() => { C = themeColors(); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'data-pb'] });
    return () => { cancelAnimationFrame(raf); mo.disconnect(); };
  }, []);
  return <canvas ref={ref} width={CANVAS.w} height={CANVAS.h} className="w-full block" style={{ imageRendering: 'pixelated' }} aria-hidden="true" />;
}

function Game({ difficulty, onExit }) {
  const ref = useRef(null);
  useEffect(() => mountEraWar(ref.current, { difficulty, onExit }), [difficulty, onExit]);
  return <div ref={ref} />;
}

export default function MiniGameTab() {
  const [playing, setPlaying] = useState(null);
  const [game, setGame] = useState(() => { try { return localStorage.getItem('pb_minijogo_game') || 'erawar'; } catch { return 'erawar'; } });
  const [lcdPlaying, setLcdPlaying] = useState(false);
  const exitLcd = React.useCallback(() => setLcdPlaying(false), []);
  const pickGame = (id) => {
    audio.ui.select(); setGame(id); setLcdPlaying(false);
    try { localStorage.setItem('pb_minijogo_game', id); } catch { /* sem armazenamento */ }
    if (id === 'erawar') { audio.unlock(); audio.playMusic('menu'); } else audio.stopMusic();
  };
  const [diff, setDiff] = useState(() => { try { return localStorage.getItem('pb_erawar_diff') || 'medium'; } catch { return 'medium'; } });
  const [stats, setStats] = useState(loadStats);
  const [snd, setSnd] = useState(audio.getPrefs);
  const exit = React.useCallback(() => { setPlaying(null); setStats(loadStats()); }, []);
  // ao voltar do jogo, a música do menu recomeça depois de o jogo fechar (o fecho do jogo pára a música dele)
  const wasPlaying = useRef(false);
  useEffect(() => { if (playing) wasPlaying.current = true; else if (wasPlaying.current) audio.playMusic('menu'); }, [playing]);
  const choose = (d) => { audio.ui.select(); setDiff(d); try { localStorage.setItem('pb_erawar_diff', d); } catch { /* sem armazenamento */ } };
  const toggle = (k) => { audio.unlock(); audio.setPref(k, !snd[k]); setSnd(audio.getPrefs()); audio.ui.select(); if (k === 'music' && !snd.music) audio.playMusic('menu'); };
  // música do menu: começa no primeiro toque nesta aba (os browsers não deixam tocar som antes) e pára ao sair
  const startMenuMusic = () => { if (!playing && game === 'erawar') { audio.unlock(); audio.playMusic('menu'); } };
  useEffect(() => () => audio.stopMusic(), []);

  if (playing) return <div className="pt-3"><Game difficulty={playing} onExit={exit} /></div>;
  if (lcdPlaying && game !== 'erawar') return <div className="pt-3"><LcdGame kind={game} onExit={exitLcd} /></div>;
  const sndBtn = (k, label) => (
    <button type="button" aria-pressed={snd[k]} onClick={() => toggle(k)} className="px-2 py-1 rounded-sm text-[10px] tracking-wider"
      style={{ border: `1px solid rgb(var(--c) / ${snd[k] ? 0.8 : 0.25})`, color: `rgb(var(--c) / ${snd[k] ? 1 : 0.5})`, textDecoration: snd[k] ? 'none' : 'line-through', background: 'rgb(var(--cb) / 0.8)' }}>
      {label}
    </button>
  );

  const box = { background: 'rgb(var(--cd) / 0.45)', border: '2px solid rgb(var(--c) / 0.3)' };
  return (
    <div className="p-4 max-w-3xl mx-auto" onPointerDown={startMenuMusic}>
      <div className="flex items-center gap-2 mb-4">
        <Gamepad2 size={16} />
        <h2 className="text-sm uppercase tracking-wider font-bold flex-1">Mini Jogo</h2>
        {sndBtn('music', '♫ MÚSICA')}
        {sndBtn('sfx', '♬ EFEITOS')}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3" role="tablist" aria-label="Escolher jogo">
        {GAMES.map((gm) => {
          const on = game === gm.id; const Icon = gm.icon;
          return (
            <button key={gm.id} type="button" role="tab" aria-selected={on} onClick={() => pickGame(gm.id)}
              className="p-2 rounded-sm text-left min-w-0"
              style={{ background: on ? 'rgb(var(--c) / 0.15)' : 'rgb(var(--cb) / 0.8)', border: `2px solid rgb(var(--c) / ${on ? 0.9 : 0.25})`, color: 'rgb(var(--c))' }}>
              <span className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold leading-tight"><Icon size={14} className="shrink-0" /><span>{gm.name}</span></span>
              <span className="block text-[9px] sm:text-[10px] mt-1 leading-tight" style={{ color: 'rgb(var(--c) / 0.65)' }}>{gm.sub}</span>
            </button>
          );
        })}
      </div>

      {game !== 'erawar' && (
        <section className="rounded-md overflow-hidden" style={box}>
          <div className="p-4 flex justify-center" style={{ borderBottom: '2px solid rgb(var(--c) / 0.3)', background: 'rgb(var(--cb) / 0.6)' }}>
            <div className="w-full max-w-sm rounded-lg p-2" style={{ background: 'linear-gradient(#cfd5df, #9aa3b2)' }}>
              <div className="rounded flex items-center justify-center font-bold tracking-widest" style={{ aspectRatio: '84 / 48', background: '#86b08c', color: '#101c12', fontFamily: 'Courier New, monospace', boxShadow: 'inset 0 0 12px rgb(0 0 0 / 0.35)' }}>
                {game === 'space' ? '▶═  ◆ ◆ ◆' : '■■■■■■■  ◆'}
              </div>
            </div>
          </div>
          <div className="p-4">
            <h3 className="text-xl font-bold tracking-widest" style={{ textShadow: '0 0 10px rgb(var(--c) / 0.6)' }}>{LCD_INFO[game].title}</h3>
            <p className="text-[11px] uppercase tracking-wider mb-3" style={{ color: '#ffb000' }}>{LCD_INFO[game].tag}</p>
            <p className="text-xs leading-relaxed mb-3" style={{ color: 'rgb(var(--c) / 0.8)' }}>{LCD_INFO[game].text}</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] mb-4 list-disc pl-4" style={{ color: 'rgb(var(--c) / 0.8)' }}>
              {LCD_INFO[game].points.map((t) => <li key={t}>{t}</li>)}
            </ul>
            <button type="button" onClick={() => { audio.ui.confirm(); setLcdPlaying(true); }} className="w-full py-3 rounded-sm text-sm font-bold tracking-widest"
              style={{ background: 'rgb(var(--c))', color: 'rgb(var(--cb))', boxShadow: '0 0 16px rgb(var(--c) / 0.4)' }}>
              ▶ JOGAR
            </button>
            <p className="text-[10px] mt-2 text-center" style={{ color: 'rgb(var(--c) / 0.55)' }}>
              Telemóvel: teclas no ecrã (2 4 6 8 · 5). PC: setas/WASD e espaço. Funciona sem internet.
            </p>
          </div>
        </section>
      )}

      {game === 'erawar' && (
      <section className="rounded-md overflow-hidden" style={box}>
        <div className="relative" style={{ borderBottom: '2px solid rgb(var(--c) / 0.3)' }}>
          <Preview />
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'repeating-linear-gradient(0deg, rgb(0 0 0 / 0.22) 0 1px, transparent 1px 3px)' }} />
        </div>
        <div className="p-4">
          <h3 className="text-xl font-bold tracking-widest" style={{ textShadow: '0 0 10px rgb(var(--c) / 0.6)' }}>GUERRA DAS ERAS</h3>
          <p className="text-[11px] uppercase tracking-wider mb-3" style={{ color: '#ffb000' }}>Retro 8-bit · defesa de base pós-apocalíptica</p>
          <p className="text-xs leading-relaxed mb-3" style={{ color: 'rgb(var(--c) / 0.8)' }}>
            Destrói o abrigo inimigo antes que ele destrua o teu. Treina exploradores, ganha caricas e XP a cada baixa e faz o teu grupo
            avançar dos Sobreviventes Primitivos até à Armadura Futurista.
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] mb-4" style={{ color: 'rgb(var(--c) / 0.8)' }}>
            <li className="flex gap-2"><Swords size={14} className="shrink-0" /> 3 tropas por era: linha da frente, atiradores e pesadas.</li>
            <li className="flex gap-2"><TrendingUp size={14} className="shrink-0" /> 5 eras: Primitivos, Sucateiros, Milícia, Táticas e Futurista.</li>
            <li className="flex gap-2"><Shield size={14} className="shrink-0" /> Torres na base, até 3 espaços.</li>
            <li className="flex gap-2"><Zap size={14} className="shrink-0" /> Especiais com recarga: destroços, morteiros, gás tóxico, bombardeamento e Mini Nuke.</li>
          </ul>

          <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'rgb(var(--c) / 0.6)' }}>Dificuldade da IA</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4" role="radiogroup" aria-label="Dificuldade">
            {DIFFS.map((d) => {
              const on = diff === d.id; const s = stats[d.id];
              return (
                <button key={d.id} type="button" role="radio" aria-checked={on} onClick={() => choose(d.id)}
                  className="text-left p-3 rounded-sm"
                  style={{ background: on ? 'rgb(var(--c) / 0.15)' : 'rgb(var(--cb) / 0.8)', border: `2px solid rgb(var(--c) / ${on ? 0.9 : 0.25})`, color: 'rgb(var(--c))' }}>
                  <span className="block text-sm font-bold">{DIFFICULTY[d.id].label}{on ? ' ◆' : ''}</span>
                  <span className="block text-[10px] mt-1" style={{ color: 'rgb(var(--c) / 0.7)' }}>{d.desc}</span>
                  <span className="block text-[10px] mt-1" style={{ color: '#ffb000' }}>{s ? `${s.w} vitórias · ${s.l} derrotas` : 'Ainda não jogado'}</span>
                </button>
              );
            })}
          </div>
          <button type="button" onClick={() => { audio.ui.confirm(); setPlaying(diff); }} className="w-full py-3 rounded-sm text-sm font-bold tracking-widest"
            style={{ background: 'rgb(var(--c))', color: 'rgb(var(--cb))', boxShadow: '0 0 16px rgb(var(--c) / 0.4)' }}>
            ▶ JOGAR
          </button>
          <p className="text-[10px] mt-2 text-center" style={{ color: 'rgb(var(--c) / 0.55)' }}>Funciona sem internet. Melhor com o telemóvel na horizontal.</p>
        </div>
      </section>
      )}
    </div>
  );
}
