import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { mountRadio } from '../radio/radioTuner';
import '../radio/radioTuner.css';
import { IS_ARTIFACT } from '@/api/base44Client';
import { t } from '@/i18n';
import { useCountry } from '@/geo/country';

// Endereço público da app, onde o som das emissoras funciona
const LIVE_SITE = 'https://steeldeck.github.io/SteelDeck/';
const LIVE_RADIO_URL = `${LIVE_SITE}#/radio`;

// #/radio?f=97.4 (FM) ou #/radio?f=1000&b=AM
const radioHash = (f, band) => `#/radio?f=${f}${band === 'AM' ? '&b=AM' : ''}`;

function Tuner({ initialFreq, band, onCountryChange }) {
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
      // botão 🌍 País: o separador volta a montar o rádio com as emissoras do país escolhido
      onCountryChange,
      shareUrl: (f, b) => `${IS_ARTIFACT ? LIVE_SITE : `${location.origin}${location.pathname}`}${radioHash(f, b)}`,
    });
    return destroy;
  }, [initialFreq, band]);

  return <div ref={ref} />;
}

// Sintonizador analógico com as emissoras do país do utilizador (Portugal: lista curada; outros: radio-browser.info).
export default function RadioTab() {
  const loc = useLocation();
  const country = useCountry();
  const [radioCc, setRadioCc] = React.useState(() => { try { return localStorage.getItem('rf_country_override') || ''; } catch { return ''; } });
  // o separador fica montado noutros separadores (para o som continuar): guarda o último endereço do /radio
  const last = useRef(loc);
  if (loc.pathname === '/radio') last.current = loc;
  const location = last.current;
  const params = new URLSearchParams(location.search);
  const f = params.get('f');
  const initialFreq = f != null && f !== '' && Number.isFinite(Number(f)) ? Number(f) : undefined;
  const band = params.get('b') === 'AM' ? 'AM' : (initialFreq != null ? 'FM' : undefined);

  return (
    <div>
      {IS_ARTIFACT && (
        <div className="mx-3 mt-3 p-3 rounded-sm text-center" style={{ background: '#331a00', border: '1px solid #ffaa0066' }}>
          <p className="text-xs" style={{ color: '#ffaa00' }}>
            {t('Dentro do claude.ai o som das emissoras está bloqueado. Aqui só se ouve a estática.')}
          </p>
          <a
            href={LIVE_RADIO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 px-4 py-2 rounded-sm text-xs uppercase tracking-wider font-bold"
            style={{ background: 'rgb(var(--c))', color: 'rgb(var(--cd))' }}
          >
            {t('▶ Abrir o rádio com som ↗')}
          </a>
        </div>
      )}
      {/* a chave volta a montar o rádio quando se abre outro link partilhado */}
      {/* a chave volta a montar o rádio com as emissoras do novo país quando o utilizador muda de país */}
      <Tuner key={`${location.search}|${country.code || ''}|${radioCc}`} initialFreq={initialFreq} band={band} onCountryChange={(code) => setRadioCc(code || '')} />
    </div>
  );
}
