// Números de emergência por país (ISO 3166-1 alpha-2). Fonte: números oficiais de cada país.
// Fallback global 112: funciona na UE e é reencaminhado em muitas redes móveis GSM fora dela.
const EU_112 = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  'NO', 'IS', 'CH', 'LI', 'AD', 'MC', 'SM', 'VA', 'IN', 'TR', 'UA', 'RS', 'ME', 'MK', 'AL', 'BA', 'MD', 'GE'];
const NUM_999 = ['GB', 'IE', 'HK', 'SG', 'MY', 'GH', 'KE', 'BW', 'ZW', 'BD', 'QA', 'BH'];
const NUM_911 = ['US', 'CA', 'MX', 'AR', 'PH', 'PA', 'CR', 'SV', 'GT', 'HN', 'DO', 'PR', 'UY', 'PY', 'EC'];

export const EMERGENCY = {
  ...Object.fromEntries(EU_112.map((c) => [c, '112'])),
  ...Object.fromEntries(NUM_999.map((c) => [c, '999'])),
  ...Object.fromEntries(NUM_911.map((c) => [c, '911'])),
  AE: '999', SA: '911', // Emirados: polícia 999; Arábia Saudita: número unificado 911
  AU: '000', NZ: '111', BR: '190', ZA: '10111', JP: '110', CN: '110', KR: '112', IL: '100', RU: '112',
};
export const FALLBACK_EMERGENCY = '112';
export const emergencyNumber = (code) => EMERGENCY[String(code || '').toUpperCase()] || FALLBACK_EMERGENCY;

// Linha de apoio em sofrimento emocional (usada pelo assistente). null = sem linha conhecida: sugere o número de emergência.
const CRISIS = { PT: 'SNS 24 (808 24 24 24)', GB: 'Samaritans (116 123)', IE: 'Samaritans (116 123)', US: '988', CA: '988', ES: '024', FR: '3114', BR: 'CVV (188)', AU: 'Lifeline (13 11 14)' };
export const crisisLine = (code) => CRISIS[String(code || '').toUpperCase()] || null;

// Unidades: só os EUA usam °F; EUA e Reino Unido usam mph no vento.
export const usesFahrenheit = (code) => ['US', 'LR', 'MM', 'BS', 'BZ', 'KY', 'PW'].includes(String(code || '').toUpperCase());
export const usesMph = (code) => ['US', 'GB', 'LR', 'MM'].includes(String(code || '').toUpperCase());
