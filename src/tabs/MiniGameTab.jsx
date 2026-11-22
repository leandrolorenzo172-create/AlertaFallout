import React, { useEffect, useRef, useState } from 'react';
import { Gamepad2, Swords, Shield, Zap, TrendingUp, Rocket, Worm, Heart, Crosshair, Trophy, Bug, Gauge, Joystick } from 'lucide-react';
import { mountEraWar, loadStats } from '../game/eraWar';
import { createGame, step, train, DIFFICULTY } from '../game/eraWar/logic';
import { render, themeColors, CANVAS } from '../game/eraWar/render';
import '../game/eraWar/eraWar.css';
import * as audio from '../game/eraWar/audio';
import { mountSpace, createSpace } from '../game/lcd/space';
import { mountSnake, createSnake } from '../game/lcd/snake';
import { createScreen, demoInput, runLoop, loadBest } from '../game/lcd/engine';
import '../game/lcd/lcd.css';
import { t } from '@/i18n';

const GAMES = [
  { id: 'erawar', name: t('Guerra das Eras'), sub: t('Defesa de base'), icon: Swords },
  { id: 'space', name: t('Patrulha Estelar'), sub: t('Nave · LCD'), icon: Rocket },
  { id: 'snake', name: t('Cobra'), sub: t('Cobrinha · LCD'), icon: Worm },
];
const LCD_INFO = {
  space: {
    title: t('PATRULHA ESTELAR'), tag: t('Retro LCD · shooter de rolagem lateral'), best: 'pb_lcd_space_best', digits: 5,
    text: t('Pilota a nave pelo espaço, abate as vagas de inimigos que chegam pela direita, desvia-te das montanhas e enfrenta o chefe no fim de cada nível.'),
    points: [[Heart, t('3 vidas em corações e bónus de vida pelo caminho.')], [Crosshair, t('Disparo automático ao manter A e laser especial no B.')], [Zap, t('Chefes resistentes que disparam em leque.')], [Joystick, t('Analógico no ecrã ou setas/WASD no PC.')]],
  },
  snake: {
    title: t('COBRA'), tag: t('Retro LCD · o clássico da cobrinha'), best: 'pb_lcd_snake_best', digits: 4,
    text: t('Come os pontos para crescer e somar pontos. Não batas nas paredes nem no teu corpo. De vez em quando aparece um bicho de bónus por pouco tempo.'),
    points: [[Gauge, t('9 níveis de velocidade, escolhe no menu.')], [Bug, t('Bicho de bónus com contagem decrescente.')], [Joystick, t('Analógico, deslizar o dedo ou setas no PC.')], [Trophy, t('Recorde guardado no aparelho.')]],
  },
};

// Pré-visualização animada: o jogo a jogar sozinho, sem som e sem mexer nos recordes
function LcdPreview({ kind }) {
  const ref = useRef(null);
  useEffect(() => {
    const scr = createScreen(ref.current);
    const game = (kind === 'space' ? createSpace : createSnake)(scr, demoInput(), { demo: true });
    return runLoop(game.update, game.draw);
  }, [kind]);
  return (
    <div className="p-3" style={{ background: 'rgb(var(--cd) / 0.7)' }}>
      <div className="rounded overflow-hidden" style={{ background: '#86b08c', boxShadow: 'inset 0 0 0 2px rgb(0 0 0 / 0.35)' }}>
        <canvas ref={ref} width={84} height={48} className="w-full block" style={{ imageRendering: 'pixelated', aspectRatio: '84 / 48' }} aria-hidden="true" />
      </div>
    </div>
  );
}

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
  { id: 'easy', desc: t('A IA junta caricas mais devagar e demora a evoluir.') },
  { id: 'medium', desc: t('Ritmo equilibrado de ataque e de evolução.') },
  { id: 'hard', desc: t('Gere bem as caricas, constrói defesas e usa os especiais na altura certa.') },
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
        <h2 className="text-sm uppercase tracking-wider font-bold flex-1">{t('Mini Jogo')}</h2>
        {sndBtn('music', t('♫ MÚSICA'))}
        {sndBtn('sfx', t('♬ EFEITOS'))}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3" role="tablist" aria-label={t('Escolher jogo')}>
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
          <div className="relative" style={{ borderBottom: '2px solid rgb(var(--c) / 0.3)' }}>
            <LcdPreview kind={game} />
          </div>
          <div className="p-4">
            <h3 className="text-xl font-bold tracking-widest" style={{ textShadow: '0 0 10px rgb(var(--c) / 0.6)' }}>{LCD_INFO[game].title}</h3>
            <p className="text-[11px] uppercase tracking-wider mb-3" style={{ color: '#ffb000' }}>{LCD_INFO[game].tag}</p>
            <p className="text-xs leading-relaxed mb-3" style={{ color: 'rgb(var(--c) / 0.8)' }}>{LCD_INFO[game].text}</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] mb-4" style={{ color: 'rgb(var(--c) / 0.8)' }}>
              {LCD_INFO[game].points.map(([Icon, t]) => <li key={t} className="flex gap-2"><Icon size={14} className="shrink-0" /> {t}</li>)}
            </ul>
            <div className="flex items-center justify-between gap-2 p-3 mb-4 rounded-sm" style={{ background: 'rgb(var(--cb) / 0.8)', border: '2px solid rgb(var(--c) / 0.25)' }}>
              <span className="flex items-center gap-2 text-[10px] uppercase tracking-wider" style={{ color: 'rgb(var(--c) / 0.7)' }}><Trophy size={14} />{' '}{t('Recorde')}</span>
              <span className="text-lg font-bold tabular-nums" style={{ color: '#ffb000' }}>{String(loadBest(LCD_INFO[game].best)).padStart(LCD_INFO[game].digits, '0')}</span>
            </div>
            <button type="button" onClick={() => { audio.ui.confirm(); setLcdPlaying(true); }} className="w-full py-3 rounded-sm text-sm font-bold tracking-widest"
              style={{ background: 'rgb(var(--c))', color: 'rgb(var(--cb))', boxShadow: '0 0 16px rgb(var(--c) / 0.4)' }}>
              {t('▶ JOGAR')}
            </button>
            <p className="text-[10px] mt-2 text-center" style={{ color: 'rgb(var(--c) / 0.55)' }}>
              {t('Telemóvel: analógico à esquerda, botões A e B à direita. PC: setas/WASD e espaço. Funciona sem internet.')}
            </p>
          </div>
        </section>
      )}

      {game === 'erawar' && (
      <section className="rounded-md overflow-hidden" style={box}>
        <div className="relative" style={{ borderBottom: '2px solid rgb(var(--c) / 0.3)' }}>
          <Preview />
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'repeating-linear-gradient(0deg, rgb(0 0 0 / 0.06) 0 1px, transparent 1px 3px)' }} />
        </div>
        <div className="p-4">
          <h3 className="text-xl font-bold tracking-widest" style={{ textShadow: '0 0 10px rgb(var(--c) / 0.6)' }}>{t('GUERRA DAS ERAS')}</h3>
          <p className="text-[11px] uppercase tracking-wider mb-3" style={{ color: '#ffb000' }}>{t('Retro 8-bit · defesa de base pós-apocalíptica')}</p>
          <p className="text-xs leading-relaxed mb-3" style={{ color: 'rgb(var(--c) / 0.8)' }}>
            {t('Destrói o abrigo inimigo antes que ele destrua o teu. Treina exploradores, ganha caricas e XP a cada baixa e faz o teu grupo avançar dos Sobreviventes Primitivos até à Armadura Futurista.')}
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] mb-4" style={{ color: 'rgb(var(--c) / 0.8)' }}>
            <li className="flex gap-2"><Swords size={14} className="shrink-0" />{' '}{t('3 tropas por era: linha da frente, atiradores e pesadas.')}</li>
            <li className="flex gap-2"><TrendingUp size={14} className="shrink-0" />{' '}{t('5 eras: Primitivos, Sucateiros, Milícia, Táticas e Futurista.')}</li>
            <li className="flex gap-2"><Shield size={14} className="shrink-0" />{' '}{t('Torres na base, até 3 espaços.')}</li>
            <li className="flex gap-2"><Zap size={14} className="shrink-0" />{' '}{t('Especiais com recarga: destroços, morteiros, gás tóxico, bombardeamento e Mini Nuke.')}</li>
          </ul>

          <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'rgb(var(--c) / 0.6)' }}>{t('Dificuldade da IA')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4" role="radiogroup" aria-label={t('Dificuldade')}>
            {DIFFS.map((d) => {
              const on = diff === d.id; const s = stats[d.id];
              return (
                <button key={d.id} type="button" role="radio" aria-checked={on} onClick={() => choose(d.id)}
                  className="text-left p-3 rounded-sm"
                  style={{ background: on ? 'rgb(var(--c) / 0.15)' : 'rgb(var(--cb) / 0.8)', border: `2px solid rgb(var(--c) / ${on ? 0.9 : 0.25})`, color: 'rgb(var(--c))' }}>
                  <span className="block text-sm font-bold">{DIFFICULTY[d.id].label}{on ? ' ◆' : ''}</span>
                  <span className="block text-[10px] mt-1" style={{ color: 'rgb(var(--c) / 0.7)' }}>{d.desc}</span>
                  <span className="block text-[10px] mt-1" style={{ color: '#ffb000' }}>{s ? t('{w} vitórias · {l} derrotas', { w: s.w, l: s.l }) : t('Ainda não jogado')}</span>
                </button>
              );
            })}
          </div>
          <button type="button" onClick={() => { audio.ui.confirm(); setPlaying(diff); }} className="w-full py-3 rounded-sm text-sm font-bold tracking-widest"
            style={{ background: 'rgb(var(--c))', color: 'rgb(var(--cb))', boxShadow: '0 0 16px rgb(var(--c) / 0.4)' }}>
            {t('▶ JOGAR')}
          </button>
          <p className="text-[10px] mt-2 text-center" style={{ color: 'rgb(var(--c) / 0.55)' }}>{t('Funciona sem internet. Melhor com o telemóvel na horizontal.')}</p>
        </div>
      </section>
      )}
    </div>
  );
}
