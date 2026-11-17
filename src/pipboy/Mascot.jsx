import React from 'react';

// "Sentinela": mascote original da app — um pequeno explorador de chapéu de aba larga,
// camisa de bolsos, calções, botas e mochila, desenhado a uma cor no estilo de terminal.
// mode: 'base' | 'rain' | 'sun' | 'wind' | 'fog' | 'cold' | 'cloud'
const INK = 'rgb(var(--cb))';
const line = { fill: 'none', stroke: INK, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };

export default function Mascot({ mode = 'base', className = '', style }) {
  const rain = mode === 'rain'; const sun = mode === 'sun'; const wind = mode === 'wind';
  const fog = mode === 'fog'; const cold = mode === 'cold'; const cloud = mode === 'cloud';
  return (
    <svg viewBox="0 -18 140 188" className={className} style={{ color: 'rgb(var(--c))', filter: 'drop-shadow(0 0 6px rgb(var(--c) / 0.45))', ...style }} role="img" aria-label="Mascote Sentinela, o explorador">
      <g fill="currentColor">
        {sun && (
          <g>
            <circle cx="118" cy="2" r="11" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
              <rect key={a} x="116.500" y="-17" width="3" height="7" rx="1.5" transform={`rotate(${a} 118 2)`} />
            ))}
          </g>
        )}
        {cloud && <path d="M96 8a9 9 0 0 1 3-17 13 13 0 0 1 25 3 8 8 0 0 1-2 14z" opacity=".85" />}
        {rain && (
          <g>
            <path d="M12 12a58 30 0 0 1 116 0q-10-7-19 0-10-7-20 0-9-7-19 0-10-7-19 0-10-7-20 0-9-7-19 0z" />
            <rect x="110" y="10" width="3" height="92" rx="1.5" />
          </g>
        )}
        {/* mochila atrás dos ombros */}
        <rect x="40" y="80" width="60" height="30" rx="8" opacity=".55" />
        {/* pernas, meias e botas */}
        <rect x="56" y="126" width="10" height="20" rx="3" />
        <rect x="74" y="126" width="10" height="20" rx="3" />
        <path d="M50 144h18v12H48a5 5 0 0 1 2-12zM72 144h18a5 5 0 0 1 2 12H72z" />
        {/* calções */}
        <path d="M50 108h40v20H72l-2-8-2 8H50z" />
        {/* camisa de manga curta */}
        <path d="M52 76h36l12 8-5 14-7-4v16H52V94l-7 4-5-14z" />
        {/* braços */}
        <rect x="38" y="92" width="9" height="22" rx="4.500" transform="rotate(12 42 92)" />
        {rain
          ? <rect x="99" y="76" width="9" height="24" rx="4.500" transform="rotate(-150 103 98)" />
          : <rect x="93" y="92" width="9" height="22" rx="4.500" transform="rotate(-12 98 92)" />}
        {/* cabeça e cabelo */}
        <circle cx="70" cy="50" r="25" />
        <path d="M44 44q-6 8-1 18l6-4zM96 44q6 8 1 18l-6-4z" />
        {/* chapéu de aba larga */}
        <ellipse cx="70" cy="33" rx="46" ry="9" />
        <path d="M46 33q0-24 24-24t24 24z" />
        {(cold || wind) && <path d={wind ? 'M52 72h36v9H52zM86 74l30-9 3 9-30 10z' : 'M52 72h36v9H52zM76 78h9v20h-9z'} />}
        {fog && <g><rect x="104" y="108" width="3" height="12" /><path d="M97 120h17l-3 20h-11z" opacity=".9" /></g>}
      </g>

      {/* fita do chapéu e traços interiores */}
      <path {...line} strokeWidth="3" d="M47 28q23 6 46 0" />
      <path {...line} d="M30 36q40 9 80 0" opacity=".45" />
      {!cold && !wind && <path {...line} d="M63 77l7 8 7-8" />}
      <path {...line} d="M70 85v23" />
      <rect x="55" y="88" width="10" height="9" rx="1.5" {...line} />
      <rect x="75" y="88" width="10" height="9" rx="1.5" {...line} />
      <path {...line} d="M55 91h10M75 91h10" />
      <path {...line} d="M54 78l-2 30M86 78l2 30" opacity=".7" />
      <path {...line} strokeWidth="3" d="M50 109h40" />
      <rect x="66" y="105.500" width="8" height="7" rx="1" fill="currentColor" stroke={INK} strokeWidth="2" />
      <path {...line} d="M70 120v8" />
      <path {...line} d="M49 151h19M72 151h19" opacity=".7" />
      <path {...line} d="M56 140h10M74 140h10" opacity=".6" />
      {sun ? (
        <g><path d="M52 50h15v7a7.500 7 0 0 1-15 0zM73 50h15v7a7.500 7 0 0 1-15 0z" fill={INK} /><path {...line} d="M67 52h6" /></g>
      ) : (
        <g fill={INK}><ellipse cx="60" cy="54" rx="3" ry="4" /><ellipse cx="80" cy="54" rx="3" ry="4" /></g>
      )}
      <path {...line} d={rain || cold || fog ? 'M64 65h12' : 'M62 62q8 8 16 0'} />
      {fog && <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity=".5"><path d="M4 62h34M100 78h36M2 134h36M102 152h34" /></g>}
      {wind && <g fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity=".7"><path d="M0 14h26q8 0 6-7M2 98h22M112 46h26M110 134h24q7 0 5 6" /></g>}
      {cold && <g opacity=".8">{[[12, 8], [128, 54], [16, 112], [124, 124], [112, -6]].map(([x, y]) => <path key={`${x}${y}`} d={`M${x} ${y - 5}v10M${x - 5} ${y}h10M${x - 3.500} ${y - 3.500}l7 7M${x - 3.500} ${y + 3.500}l7-7`} stroke="currentColor" strokeWidth="1.6" fill="none" />)}</g>}
    </svg>
  );
}
