import React, { useEffect, useRef, useState } from 'react';
import { Gamepad2, Swords, Shield, Zap, TrendingUp } from 'lucide-react';
import { mountEraWar, loadStats } from '../game/eraWar';
import { createGame, step, train, DIFFICULTY } from '../game/eraWar/logic';
import { render, themeColors } from '../game/eraWar/render';
import '../game/eraWar/eraWar.css';
import * as audio from '../game/eraWar/audio';

const DIFFS = [
  { id: 'easy', desc: 'A IA junta ouro mais devagar e hesita nas compras.' },
  { id: 'medium', desc: 'Ritmo equilibrado de tropas e de evolução.' },
  { id: 'hard', desc: 'Reage logo, gere bem o ouro e ataca em vagas.' },
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
  return <canvas ref={ref} width={480} height={200} className="w-full block" style={{ imageRendering: 'pixelated' }} aria-hidden="true" />;
}

function Game({ difficulty, onExit }) {
  const ref = useRef(null);
  useEffect(() => mountEraWar(ref.current, { difficulty, onExit }), [difficulty, onExit]);
  return <div ref={ref} />;
}

export default function MiniGameTab() {
  const [playing, setPlaying] = useState(null);
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
  const startMenuMusic = () => { if (!playing) { audio.unlock(); audio.playMusic('menu'); } };
  useEffect(() => () => audio.stopMusic(), []);

  if (playing) return <div className="pt-3"><Game difficulty={playing} onExit={exit} /></div>;
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

      <section className="rounded-md overflow-hidden" style={box}>
        <div className="relative" style={{ borderBottom: '2px solid rgb(var(--c) / 0.3)' }}>
          <Preview />
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'repeating-linear-gradient(0deg, rgb(0 0 0 / 0.22) 0 1px, transparent 1px 3px)' }} />
        </div>
        <div className="p-4">
          <h3 className="text-xl font-bold tracking-widest" style={{ textShadow: '0 0 10px rgb(var(--c) / 0.6)' }}>GUERRA DAS ERAS</h3>
          <p className="text-[11px] uppercase tracking-wider mb-3" style={{ color: '#ffb000' }}>Retro 8-bit · defesa de base</p>
          <p className="text-xs leading-relaxed mb-3" style={{ color: 'rgb(var(--c) / 0.8)' }}>
            Destrói a base inimiga antes que ela destrua a tua. Treina tropas, ganha ouro e XP a cada baixa e faz a tua civilização avançar
            da Idade da Pedra até à Era Futurista.
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] mb-4" style={{ color: 'rgb(var(--c) / 0.8)' }}>
            <li className="flex gap-2"><Swords size={14} className="shrink-0" /> 3 tropas por era: linha da frente, atiradores e pesadas.</li>
            <li className="flex gap-2"><TrendingUp size={14} className="shrink-0" /> 5 eras: Pedra, Média, Renascimento, Moderna e Futurista.</li>
            <li className="flex gap-2"><Shield size={14} className="shrink-0" /> Torres na base, até 3 espaços.</li>
            <li className="flex gap-2"><Zap size={14} className="shrink-0" /> Ataque especial por era, com tempo de recarga.</li>
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
    </div>
  );
}
