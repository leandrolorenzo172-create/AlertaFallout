import React, { useEffect, useRef } from 'react';
import { mountRadio } from '../radio/radioTuner';
import '../radio/radioTuner.css';
import { IS_ARTIFACT } from '@/api/base44Client';

// Endereço público da app, onde o som das emissoras funciona
const LIVE_RADIO_URL = 'https://leandrolorenzo172-create.github.io/AlertaFallout/#/radio';

// Sintonizador analógico com as emissoras portuguesas pré-configuradas.
export default function RadioTab() {
  const ref = useRef(null);

  useEffect(() => {
    const destroy = mountRadio(ref.current);
    return destroy;
  }, []);

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
      <div ref={ref} />
    </div>
  );
}
