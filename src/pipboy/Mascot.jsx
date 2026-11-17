import React, { useId } from 'react';
import mascotPng from '../assets/mascote.png';

// Mascote da app: o explorador de chapéu escolhido pelo utilizador (src/assets/mascote.png).
// A imagem é usada como máscara, por isso o boneco é pintado com a cor do tema ativo.
// Os acessórios do tempo são desenhados por cima.
// mode: 'base' | 'rain' | 'sun' | 'wind' | 'fog' | 'cold' | 'cloud'
const INK = 'rgb(var(--cb))';
const W = 260; const H = 429; // tamanho da imagem do boneco

export default function Mascot({ mode = 'base', className = '', style }) {
  const id = useId().replace(/:/g, '');
  const rain = mode === 'rain'; const sun = mode === 'sun'; const wind = mode === 'wind';
  const fog = mode === 'fog'; const cold = mode === 'cold'; const cloud = mode === 'cloud';
  const acc = { fill: 'currentColor', stroke: INK, strokeWidth: 4, strokeLinejoin: 'round' };
  return (
    <svg viewBox="-42 -64 344 497" className={className} style={{ color: 'rgb(var(--c))', filter: 'drop-shadow(0 0 6px rgb(var(--c) / 0.45))', ...style }} role="img" aria-label="Mascote: o explorador">
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
          <image href={mascotPng} x="0" y="0" width={W} height={H} />
        </mask>
      </defs>

      {sun && (
        <g fill="currentColor">
          <circle cx="262" cy="-18" r="24" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => <rect key={a} x="259" y="-60" width="6" height="14" rx="3" transform={`rotate(${a} 262 -18)`} />)}
        </g>
      )}
      {cloud && <path fill="currentColor" opacity=".85" d="M214-6a20 20 0 0 1 6-38 29 29 0 0 1 56 6 18 18 0 0 1-4 32z" />}
      {rain && <rect x="222" y="-10" width="7" height="312" rx="3.500" fill="currentColor" />}

      {/* o boneco */}
      <rect x="0" y="0" width={W} height={H} fill="currentColor" mask={`url(#${id})`} />

      {rain && <path {...acc} d="M-36-2a166 62 0 0 1 332 0q-28-18-55 0-28-18-56 0-27-18-55 0-28-18-56 0-27-18-55 0-28-18-55 0z" />}
      {sun && (
        <g>
          <path fill={INK} d="M76 110h44v20a22 20 0 0 1-44 0zM142 110h44v20a22 20 0 0 1-44 0z" />
          <path stroke={INK} strokeWidth="6" strokeLinecap="round" d="M118 115h26M76 114l-22-8M186 114l22-8" />
        </g>
      )}
      {(cold || wind) && (
        <g>
          <path {...acc} d="M82 176h98a8 8 0 0 1 8 8v12a8 8 0 0 1-8 8H82a8 8 0 0 1-8-8v-12a8 8 0 0 1 8-8z" />
          <path {...acc} d={wind ? 'M176 180l96-30 8 26-96 32z' : 'M150 200h30v62h-30z'} />
          <path stroke={INK} strokeWidth="3" strokeLinecap="round" d={wind ? 'M262 160l6 20' : 'M150 250h30'} />
        </g>
      )}
      {fog && (
        <g>
          <path stroke="currentColor" strokeWidth="6" strokeLinecap="round" fill="none" d="M232 300v22" />
          <path {...acc} d="M212 322h42l-7 54h-28z" />
          <path fill={INK} d="M226 336h14l-2 26h-10z" opacity=".55" />
          <g fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" opacity=".5"><path d="M-36 150h70M210 196h86M-38 340h84M214 410h82" /></g>
        </g>
      )}
      {wind && <g fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" opacity=".7"><path d="M-38 40h62q18 0 14-16M-34 250h50M228 96h66M222 270h56q16 0 12 14" /></g>}
      {cold && (
        <g fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity=".85">
          {[[-18, 30], [284, 120], [-22, 280], [282, 330], [250, -36]].map(([x, y]) => <path key={`${x}${y}`} d={`M${x} ${y - 12}v24M${x - 12} ${y}h24M${x - 8} ${y - 8}l16 16M${x - 8} ${y + 8}l16-16`} />)}
        </g>
      )}
    </svg>
  );
}
