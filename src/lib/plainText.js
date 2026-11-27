// Converte texto vindo de feeds (às vezes com HTML cru ou codificado: "<p>", "&lt;br&gt;") em texto limpo para mostrar.
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', ndash: '–', mdash: '—', laquo: '«', raquo: '»' };
const decode = (s) => s
  .replace(/&#(\d+);/g, (_m, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_m, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m);
export function plainText(s) {
  if (s == null) return '';
  let out = String(s);
  for (let i = 0; i < 2; i++) out = decode(out.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<\s*br\s*\/?>/gi, ' ').replace(/<\/?[a-z][^>]*>/gi, ' ')); // 2 passagens: HTML codificado duas vezes
  return out.replace(/<\/?[a-z][^>]*>/gi, ' ').replace(/\s+/g, ' ').trim();
}
