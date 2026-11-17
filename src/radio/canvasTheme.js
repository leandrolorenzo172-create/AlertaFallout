// Cores do tema em <canvas>: o canvas não entende var(--c), por isso resolvem-se aqui.
// Resolve uma cor CSS com variáveis para um valor que o <canvas> aceite.
const probe = typeof document !== 'undefined' ? document.createElement('span') : null;
const cache = new Map();
export function resolveColor(str) {
  if (typeof str !== 'string' || !str.includes('var(')) return str;
  const key = `${document.documentElement.style.getPropertyValue('--c')}|${str}`;
  if (cache.has(key)) return cache.get(key);
  if (!probe.isConnected) { probe.style.display = 'none'; document.body.appendChild(probe); }
  probe.style.color = ''; probe.style.color = str;
  const out = getComputedStyle(probe).color || str;
  cache.set(key, out);
  return out;
}
// Contexto de canvas que aceita cores do tema (fillStyle, strokeStyle, shadowColor e gradientes).
export function themedCtx(ctx) {
  const wrapGrad = (g) => { const add = g.addColorStop.bind(g); g.addColorStop = (o, c) => add(o, resolveColor(c)); return g; };
  return new Proxy(ctx, {
    get(t, k) {
      const v = t[k];
      if (typeof v !== 'function') return v;
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return (...a) => wrapGrad(v.apply(t, a));
      return v.bind(t);
    },
    set(t, k, v) { t[k] = (k === 'fillStyle' || k === 'strokeStyle' || k === 'shadowColor') ? resolveColor(v) : v; return true; },
  });
}
