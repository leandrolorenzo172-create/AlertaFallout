// SteelDeck — registo automático das notificações (Cloudflare Worker + KV).
// A app regista aqui cada telemóvel quando se carrega em "Ativar notificações" (sem códigos para copiar).
// O GitHub Actions (scripts/send-push.mjs) lê a lista para enviar os avisos e apaga os registos que expiraram.
//
//  POST /subscribe   { subscription, prefs, theme, lang, loc }   (público, só da app; guarda ou atualiza o registo)
//  POST /unsubscribe { endpoint }                     (público; apaga o registo desse telemóvel)
//  GET  /list                                         (só o GitHub Actions: Authorization: Bearer <JWT assinado com a chave VAPID privada>)
//  POST /remove      { endpoints: [...] }             (só o GitHub Actions, mesmo JWT)
//
// Não há segredos novos: o GitHub prova quem é assinando um JWT com a chave VAPID privada (secret VAPID_PRIVATE_KEY),
// e o Worker confirma a assinatura com a chave VAPID pública (env.VAPID_PUBLIC), que já é pública na app.
// Deploy: feito pela API da Cloudflare (ver README, secção Notificações).

const PUSH_HOSTS = /(^|\.)(fcm\.googleapis\.com|push\.services\.mozilla\.com|notify\.windows\.com|push\.apple\.com|web\.push\.apple\.com)$/;
const PREF_KEYS = ['guerra_enabled', 'catastrofes_enabled', 'meteorologia_enabled', 'tensao_global_enabled', 'pizza_index_enabled', 'greves_enabled'];
const THEMES = ['green', 'white', 'amber', 'blue', 'red', 'lilac'];

const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4)), (c) => c.charCodeAt(0));
const keyOf = async (endpoint) => 'sub:' + b64u(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint))).slice(0, 32);

function cors(env, req) {
  const origin = req.headers.get('Origin') || '';
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim());
  return {
    'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0] || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}
const json = (data, status, headers) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...headers } });

// JWT ES256 assinado com a chave VAPID privada (feito em scripts/send-push.mjs), válido por poucos minutos
async function adminOk(req, env) {
  const m = (req.headers.get('Authorization') || '').match(/^Bearer ([\w-]+)\.([\w-]+)\.([\w-]+)$/);
  if (!m) return false;
  try {
    const pub = unb64u(env.VAPID_PUBLIC);
    const key = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: b64u(pub.slice(1, 33)), y: b64u(pub.slice(33, 65)), ext: true },
      { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, unb64u(m[3]), new TextEncoder().encode(`${m[1]}.${m[2]}`));
    if (!ok) return false;
    const p = JSON.parse(new TextDecoder().decode(unb64u(m[2])));
    return p.aud === 'steeldeck-push' && typeof p.exp === 'number' && p.exp > Date.now() / 1000 && p.exp < Date.now() / 1000 + 900;
  } catch { return false; }
}

export default {
  async fetch(req, env) {
    const h = cors(env, req);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    const url = new URL(req.url);
    try {
      if (url.pathname === '/subscribe' && req.method === 'POST') {
        const body = await req.json();
        const s = body?.subscription;
        const ep = s?.endpoint;
        if (typeof ep !== 'string' || ep.length > 1000 || !ep.startsWith('https://') || !PUSH_HOSTS.test(new URL(ep).hostname)) return json({ ok: false, error: 'endpoint inválido' }, 400, h);
        if (typeof s.keys?.p256dh !== 'string' || typeof s.keys?.auth !== 'string' || s.keys.p256dh.length > 200 || s.keys.auth.length > 100) return json({ ok: false, error: 'chaves inválidas' }, 400, h);
        const prefs = Object.fromEntries(PREF_KEYS.map((k) => [k, typeof body.prefs?.[k] === 'boolean' ? body.prefs[k] : k !== 'pizza_index_enabled']));
        const theme = THEMES.includes(body.theme) ? body.theme : 'green';
        const lang = body.lang === 'en' ? 'en' : 'pt'; // idioma das notificações
        // cidade (só a cidade do IPMA, nunca a posição exata): id da previsão, distrito dos avisos e nome
        const l = body.loc || {};
        const loc = Number.isInteger(l.id) && /^[A-Z]{3}$/.test(l.area || '') && typeof l.name === 'string' && l.name.length < 40 ? { id: l.id, area: l.area, name: l.name } : null;
        const rec = { sub: { endpoint: ep, expirationTime: null, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } }, prefs, theme, lang, loc, updated: new Date().toISOString() };
        await env.SUBS.put(await keyOf(ep), JSON.stringify(rec));
        return json({ ok: true }, 200, h);
      }
      if (url.pathname === '/unsubscribe' && req.method === 'POST') {
        const { endpoint } = await req.json();
        if (typeof endpoint === 'string') await env.SUBS.delete(await keyOf(endpoint));
        return json({ ok: true }, 200, h);
      }
      if (url.pathname === '/list' && req.method === 'GET') {
        if (!(await adminOk(req, env))) return json({ ok: false }, 401, h);
        const out = []; let cursor;
        do {
          const page = await env.SUBS.list({ prefix: 'sub:', cursor });
          for (const k of page.keys) { const v = await env.SUBS.get(k.name, 'json'); if (v) out.push(v); }
          cursor = page.list_complete ? null : page.cursor;
        } while (cursor);
        return json({ ok: true, count: out.length, records: out }, 200, h);
      }
      if (url.pathname === '/remove' && req.method === 'POST') {
        if (!(await adminOk(req, env))) return json({ ok: false }, 401, h);
        const { endpoints } = await req.json();
        for (const ep of (endpoints || []).slice(0, 100)) await env.SUBS.delete(await keyOf(ep));
        return json({ ok: true }, 200, h);
      }
      if (url.pathname === '/') return json({ ok: true, service: 'SteelDeck — registo de notificações' }, 200, h);
      return json({ ok: false }, 404, h);
    } catch (e) {
      return json({ ok: false, error: 'pedido inválido' }, 400, h);
    }
  },
};
