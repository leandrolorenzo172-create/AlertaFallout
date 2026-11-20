// Guerra das Eras — as 15 tropas (folha de personagens do dono da app, recortada para assets/tropas.webp).
// Índice = era * 3 + tipo (0 linha da frente, 1 atirador, 2 pesada/cavalaria). Todas viradas para a direita.
import atlasUrl from './assets/tropas.webp';
import animUrl from './assets/anim.webp';
import ANIM from './assets/anim.json';

export const CARDS = [
  { no: 1, name: 'KROG' }, { no: 2, name: 'LYLA' }, { no: 3, name: 'TUSK' },
  { no: 4, name: 'SCRAP' }, { no: 5, name: 'STALKER' }, { no: 6, name: 'ZIP' },
  { no: 7, name: 'BULK' }, { no: 8, name: 'SARG' }, { no: 9, name: 'BOLT' },
  { no: 10, name: 'IRON' }, { no: 11, name: 'BLAST' }, { no: 12, name: 'TINK' },
  { no: 13, name: 'CRON' }, { no: 14, name: 'RAY' }, { no: 15, name: 'APEX' },
];
// [x, y, largura, altura] de cada tropa na folha
const RECTS = [[0, 0, 176, 164], [178, 10, 142, 154], [322, 0, 182, 164], [506, 0, 204, 164], [712, 14, 167, 150], [881, 16, 200, 148], [1083, 13, 158, 151], [1243, 15, 133, 149], [1378, 1, 172, 163], [1552, 4, 226, 160], [1780, 9, 168, 155], [1950, 14, 170, 150], [2122, 4, 138, 160], [2262, 9, 158, 155], [2422, 4, 141, 160]];
export const card = (era, type) => CARDS[era * 3 + type];
export const rect = (era, type) => RECTS[era * 3 + type];

let atlas = null;
export const spritesReady = typeof Image === 'undefined' ? Promise.resolve(null) : new Promise((resolve) => {
  const img = new Image();
  img.onload = () => { atlas = img; resolve(img); };
  img.onerror = () => resolve(null);
  img.src = atlasUrl;
});
export const getAtlas = () => atlas;

// Animações (andar, atacar, morrer) das personagens da pasta do dono da app. ANIM.units[era*3+tipo] = { walk, attack, death } (índices em ANIM.rects) ou null
let anim = null;
if (typeof Image !== 'undefined') { const im = new Image(); im.onload = () => { anim = im; }; im.src = animUrl; }
export const getAnim = () => anim;
export function animFrame(era, type, kind, i) {
  const u = ANIM.units[era * 3 + type]; if (!u) return null;
  const list = u[kind]; if (!list || !list.length) return null;
  return ANIM.rects[list[Math.min(list.length - 1, i % (kind === 'death' ? 99 : list.length))]];
}
export const animCount = (era, type, kind) => { const u = ANIM.units[era * 3 + type]; return u && u[kind] ? u[kind].length : 0; };
