import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { mountRadio } from '../radio/radioTuner';
import '../radio/radioTuner.css';
import { IS_ARTIFACT } from '@/api/base44Client';

// Endereço público da app, onde o som das emissoras funciona
const LIVE_SITE = 'https://leandrolorenzo172-create.github.io/AlertaFallout/';
const LIVE_RADIO_URL = `${LIVE_SITE}#/radio`;

// #/radio?f=97.4 (FM) ou #/radio?f=1000&b=AM
const radioHash = (f, band) => `#/radio?f=${f}${band === 'AM' ? '&b=AM' : ''}`;

function Tuner({ initialFreq, band }) {
  const ref = useRef(null);

  useEffect(() => {
    const destroy = mountRadio(ref.current, {
      initialFreq,
      band,
      // Atualiza o endereço sem criar entradas novas no histórico (dentro do claude.ai o endereço não muda)
      onTune: IS_ARTIFACT ? undefined : (f, b) => {
        if (!location.hash.startsWith('#/radio')) return;
        history.replaceState(history.state, '', `${location.pathname}${location.search}${radioHash(f, b)}`);
      },
      // Dentro do claude.ai partilha-se o site público, que é onde o som funciona
      shareUrl: (f, b) => `${IS_ARTIFACT ? LIVE_SITE : `${location.origin}${location.pathname}`}${radioHash(f, b)}`,
    });
    return destroy;
  }, [initialFreq, band]);

  return <div ref={ref} />;
}

// Sintonizador analógico com as emissoras portuguesas pré-configuradas.
export default function RadioTab() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const f = params.get('f');
  const initialFreq = f != null && f !== '' && Number.isFinite(Number(f)) ? Number(f) : undefined;
  const band = params.get('b') === 'AM' ? 'AM' : (initialFreq != null ? 'FM' : undefined);

  return (
    <div>
      {IS_ARTIFACT && (
        <div className="mx-3 mt-3 p-3 rounded-sm text-center" style={{ background: '#331a00', border: '1px solid #ffaa0066' }}>
          <p className="text-xs" style={{ color: '#ffaa00' }}>
            Dentro do claude.ai o som das emissoras está bloqueado. Aqui só se ouve a estática.
          </p>
          <a
            href={LIVE_RADIO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 px-4 py-2 rounded-sm text-xs uppercase tracking-wider font-bold"
            style={{ background: 'rgb(var(--c))', color: 'rgb(var(--cd))' }}
          >
            ▶ Abrir o rádio com som ↗
          </a>
        </div>
      )}
      {/* a chave volta a montar o rádio quando se abre outro link partilhado */}
      <Tuner key={location.search} initialFreq={initialFreq} band={band} />
    </div>
  );
}
