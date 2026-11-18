// As 16 emissoras principais, com frequências fixas e endereços alternativos testados.
// Ficheiro sem dependências: é lido pela app, pelo rádio autónomo e por scripts/fetch-stations.mjs.
// url = endereço principal; alt = alternativas tentadas por ordem se o principal falhar; page = site oficial
export const DEFAULT_STATIONS = [
  { band: 'FM', freq: 89.5, name: 'TSF Rádio Notícias', genre: 'Informação contínua, análise e desporto', url: 'https://tsfdirecto.tsf.pt/tsfdirecto.mp3', alt: ['https://tsfdirecto.tsf.pt/tsfdirecto.aac'], page: 'https://www.tsf.pt/emdireto' },
  { band: 'FM', freq: 90.4, name: 'Rádio Oxigénio', genre: 'Eletrónica, funk, soul e hip-hop', url: 'https://proic1.evsportugal.pt:8000/oxigenio_mp3', alt: ['https://proic1.evsportugal.pt:8000/oxigenio_aac'] },
  { band: 'FM', freq: 92.0, name: 'Rádio Amália', genre: 'Fado', url: 'https://centova.radios.pt/proxy/496?mp=/stream' },
  { band: 'FM', freq: 92.4, name: 'Mega Hits', genre: 'Pop, R&B e dance', url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/MEGA_HITS.mp3', alt: ['https://playerservices.streamtheworld.com/api/livestream-redirect/MEGA_HITSAAC.aac'], page: 'https://megahits.fm/ouvir-emissao-mega-hits' },
  { band: 'FM', freq: 93.2, name: 'RFM', genre: 'Êxitos internacionais e nacionais', url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/RFM.mp3', alt: ['https://playerservices.streamtheworld.com/api/livestream-redirect/RFMAAC.aac'], page: 'https://rfm.pt/ouvir-emissao-rfm' },
  { band: 'FM', freq: 94.4, name: 'Antena 2 (RTP)', genre: 'Música erudita, jazz, fado e cultura', url: 'https://radiocast.rtp.pt/antena280a.mp3', alt: ['https://streaming-live.rtp.pt/liveradio/antena280a/playlist.m3u8', 'https://streaming-live.rtp.pt/liveradio/antena280a/chunklist.m3u8'] },
  { band: 'FM', freq: 95.7, name: 'Antena 1 (RTP)', genre: 'Informação, desporto e música em português', url: 'https://radiocast.rtp.pt/antena180a.mp3', alt: ['https://streaming-live.rtp.pt/liveradio/antena180a/playlist.m3u8', 'https://streaming-live.rtp.pt/liveradio/antena180a/chunklist.m3u8'], page: 'https://www.rtp.pt/play/direto/antena1' },
  { band: 'FM', freq: 96.6, name: 'Smooth FM', genre: 'Jazz, soul, blues e bossa nova', url: 'https://stream-icy.bauermedia.pt/smooth.mp3', alt: ['https://stream-icy.bauermedia.pt/smooth.aac'] },
  { band: 'FM', freq: 97.4, name: 'Rádio Comercial', genre: 'Pop/rock atual e entretenimento', url: 'https://stream-icy.bauermedia.pt/comercial.mp3', alt: ['https://stream-icy.bauermedia.pt/comercial.aac'], page: 'https://rayo.pt/radio-comercial' },
  { band: 'FM', freq: 98.7, name: 'Rádio Observador', genre: 'Informação, opinião e desporto', url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/OBSERVADOR.mp3', alt: ['https://playerservices.streamtheworld.com/api/livestream-redirect/OBSERVADORAAC.aac'] },
  { band: 'FM', freq: 100.3, name: 'Antena 3 (RTP)', genre: 'Música alternativa e novas bandas portuguesas', url: 'https://radiocast.rtp.pt/antena380a.mp3', alt: ['https://streaming-live.rtp.pt/liveradio/antena380a/playlist.m3u8', 'https://streaming-live.rtp.pt/liveradio/antena380a/chunklist.m3u8'] },
  { band: 'FM', freq: 101.3, name: 'Rádio Nova Era', genre: 'Dance music, house e R&B', url: 'https://centova.radios.pt/proxy/478?mp=/stream' },
  { band: 'FM', freq: 101.9, name: 'Estação Orbital', genre: 'Música de dança e êxitos eletrónicos', url: 'https://centova.radios.pt/proxy/401?mp=/stream' },
  { band: 'FM', freq: 103.4, name: 'Rádio Renascença', genre: 'Informação e pop/rock dos anos 70 a 90', url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/RADIO_RENASCENCA.mp3', alt: ['https://playerservices.streamtheworld.com/api/livestream-redirect/RADIO_RENASCENCAAAC.aac'] },
  { band: 'FM', freq: 104.3, name: 'M80 Rádio', genre: 'Clássicos dos anos 70, 80, 90 e 2000', url: 'https://stream-icy.bauermedia.pt/m80.mp3', alt: ['https://stream-icy.bauermedia.pt/m80.aac'], page: 'https://rayo.pt/m80' },
  // Favorita do dono da app: fica sempre na lista e sempre nos 520 AM, mesmo que esteja momentaneamente fora do ar
  { band: 'AM', freq: 520, name: 'Rádio Meio do Mato', genre: 'Variedades · a favorita', url: 'https://radio.meiodomato.com/stream', page: 'https://radio.meiodomato.com/' },
  { band: 'FM', freq: 106.2, name: 'Cidade FM', genre: 'Hip-hop, R&B, reggaeton e música urbana', url: 'https://stream-icy.bauermedia.pt/cidade.mp3', alt: ['https://stream-icy.bauermedia.pt/cidade.aac'] },
];

// Limites das bandas e distância mínima entre emissoras (o dobro da zona em que uma emissora se ouve).
export const BAND_LIMITS = { FM: { min: 88, max: 108 }, AM: { min: 520, max: 1600 } };
export const SPACING = { FM: 0.6, AM: 10 };
