import React from 'react';
import { Shield } from 'lucide-react';
import DocLibrary from '../pipboy/DocLibrary';
import { t } from '@/i18n';
import { useCountry } from '@/geo/country';
import { emergencyNumber } from '@/geo/emergency';

export default function SurvivalManualTab() {
  const country = useCountry(); // número de emergência do país detetado
  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Shield size={16} style={{ color: 'rgb(var(--c))' }} />
        <h2 className="text-sm uppercase tracking-wider font-bold" style={{ color: 'rgb(var(--c))' }}>
          {t('Manual de Sobrevivência Tático')}
        </h2>
      </div>

      <div className="p-3 rounded-sm mb-4" style={{ background: '#ffaa0011', border: '1px solid #ffaa0033' }}>
        <p className="text-[10px] uppercase tracking-wider" style={{ color: '#ffaa0099' }}>
          {t('⚠️ Manual tático avançado — FM 21-76 / SAS Handbook. Em emergência real, contacte {n}.', { n: emergencyNumber(country.code) })}
        </p>
      </div>

      {/* o conteúdo do manual está no eBook do sistema (GUIA DE SOBREVIVÊNCIA STEELDECK), no topo da estante */}
      <DocLibrary />
    </div>
  );
}
