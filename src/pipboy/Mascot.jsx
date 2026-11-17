import React from 'react';

// "Sentinela": mascote original da app (explorador de capacete), com acessórios conforme o tempo.
// mode: 'base' | 'rain' | 'sun' | 'wind' | 'fog' | 'cold' | 'cloud'
const INK = 'rgb(var(--cb))';
const line = { fill: 'none', stroke: INK, strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' };

export default function Mascot({ mode = 'base', className = '', style }) {
  const rain = mode === 'rain'; const sun = mode === 'sun'; const wind = mode === 'wind';
  const fog = mode === 'fog'; const cold = mode === 'cold'; const cloud = mode === 'cloud';
  return (
    <svg viewBox="0 0 140 170" className={className} style={{ color: 'rgb(var(--c))', filter: 'drop-shadow(0 0 6px rgb(var(--c) / 0.45))', ...style }} role="img" aria-label="Mascote Sentinela">
      <g fill="currentColor">
        {sun && (
          <g>
            <circle cx="112" cy="26" r="13" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
              <rect key={a} x="110.500" y="3" width="3" height="8" rx="1.5" transform={`rotate(${a} 112 26)`} />
            ))}
          </g>
        )}
        {cloud && <path d="M92 34a10 10 0 0 1 3-19 14 14 0 0 1 27 3 9 9 0 0 1-2 16z" opacity=".85" />}
        {rain && (
          <g>
            <path d="M14 46a56 44 0 0 1 112 0q-9-8-19 0-9-8-18 0-10-8-19 0-9-8-19 0-9-8-18 0-10-8-19 0z" />
            <rect x="68.500" y="44" width="3" height="78" rx="1.5" transform="rotate(14 70 44)" />
          </g>
        )}
        {/* pernas e botas */}
        <path d="M54 118h14v30H54zM72 118h14v30H72z" />
        <path d="M48 146h22v10H46a4 4 0 0 1 2-10zM70 146h22a4 4 0 0 1 2 10H70z" />
        {/* tronco e braços */}
        <path d="M48 74h44a8 8 0 0 1 8 8v40H40V82a8 8 0 0 1 8-8z" />
        <path d="M40 82l-13 26a6 6 0 0 0 11 5l9-18zM100 82l13 26a6 6 0 0 1-11 5l-9-18z" />
        {/* mochila */}
        <rect x="34" y="80" width="8" height="30" rx="3" opacity=".7" />
        {/* cabeça e capacete */}
        <circle cx="70" cy="48" r="24" />
        <path d="M44 44a26 26 0 0 1 52 0v3H44z" />
        <rect x="64" y="20" width="12" height="8" rx="2" />
        {cold && <g><path d="M46 36a24 24 0 0 1 48 0z" /><circle cx="70" cy="12" r="6" /></g>}
        {(cold || wind) && <path d={wind ? 'M50 70h40v9H50zM88 72l30-8 3 9-30 10z' : 'M50 70h40v9H50zM78 76h9v22h-9z'} />}
        {fog && <g><rect x="108" y="100" width="3" height="16" /><path d="M101 116h17l-3 20h-11z" opacity=".9" /></g>}
      </g>
      {/* traços interiores */}
      <path {...line} d="M44 47h52" />
      <path {...line} d="M70 74v48M40 104h60" />
      <rect x="62" y="98" width="16" height="12" rx="2" {...line} />
      <path {...line} d="M68 118v28" opacity=".5" />
      {sun ? (
        <g><path d="M53 52h14v8a7 7 0 0 1-14 0zM73 52h14v8a7 7 0 0 1-14 0z" fill={INK} /><path {...line} d="M67 54h6" /></g>
      ) : (
        <g fill={INK}><circle cx="61" cy="56" r="3" /><circle cx="79" cy="56" r="3" /></g>
      )}
      <path {...line} d={rain || cold || fog ? 'M63 65h14' : 'M62 63q8 7 16 0'} />
      {fog && <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity=".5"><path d="M6 60h40M96 76h38M4 132h34M100 150h34" /></g>}
      {wind && <g fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity=".7"><path d="M2 40h30q8 0 6-7M4 96h22M106 44h28M110 132h24q7 0 5 6" /></g>}
      {cold && <g fill="currentColor" opacity=".8">{[[14, 30], [124, 50], [18, 110], [122, 120], [108, 18]].map(([x, y]) => <path key={`${x}${y}`} d={`M${x} ${y - 5}v10M${x - 5} ${y}h10M${x - 3.500} ${y - 3.500}l7 7M${x - 3.500} ${y + 3.500}l7-7`} stroke="currentColor" strokeWidth="1.6" />)}</g>}
    </svg>
  );
}
