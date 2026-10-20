// Password gate for the whole site, run by Vercel before any page or file is served.
// Temporary pre-launch gate. The password is PASSWORD below; a Vercel env var SITE_PASSWORD overrides it.
// A correct password sets an HttpOnly cookie holding an HMAC of the password: changing the password
// signs everyone out. The NOWPayments webhook stays open so crypto payments still confirm.
export const config = { matcher: '/((?!api/crypto-webhook).*)' };

const PASSWORD = 'aura123';
const COOKIE = 'aura_gate';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const enc = new TextEncoder();

async function token(secret) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode('aura-gate-v1'));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function same(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
const readCookie = (req) => (req.headers.get('cookie') || '').split(/;\s*/).find((c) => c.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1) || '';
const safeNext = (v) => (typeof v === 'string' && v.startsWith('/') && !v.startsWith('//') && !v.startsWith('/\\') ? v : '/');
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export default async function middleware(request) {
  const url = new URL(request.url);
  const secret = process.env.SITE_PASSWORD || PASSWORD;
  const expected = await token(secret);
  if (url.pathname === '/__unlock' && request.method === 'POST') {
    const form = await request.formData();
    const next = safeNext(form.get('next'));
    if (same(await token(String(form.get('password') || '')), expected)) {
      return new Response(null, {
        status: 303,
        headers: {
          Location: next,
          'Set-Cookie': `${COOKIE}=${expected}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`,
          'Cache-Control': 'no-store',
        },
      });
    }
    return gate(next, 'That password is not right.', 401);
  }
  if (same(readCookie(request), expected)) return new Response(null, { headers: { 'x-middleware-next': '1' } });
  return gate(safeNext(url.pathname + url.search), '', 401);
}

function gate(next, error, status) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow">
<title>Aura Pharma</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box}
html,body{height:100%;margin:0}
body{font-family:"Inter",system-ui,-apple-system,sans-serif;color:#eceae4;background:#0f1215;display:grid;place-items:center;padding:16px;overflow:hidden;position:relative}
body:before{content:"";position:fixed;inset:0;pointer-events:none;opacity:.8;background:
radial-gradient(1px 1px at 12% 18%,#fff 50%,transparent 51%),radial-gradient(1px 1px at 27% 72%,#cfeaff 50%,transparent 51%),
radial-gradient(1.5px 1.5px at 44% 34%,#fff 50%,transparent 51%),radial-gradient(1px 1px at 63% 12%,#a9dcff 50%,transparent 51%),
radial-gradient(1px 1px at 78% 58%,#fff 50%,transparent 51%),radial-gradient(1.5px 1.5px at 88% 26%,#cfeaff 50%,transparent 51%),
radial-gradient(1px 1px at 8% 64%,#fff 50%,transparent 51%),radial-gradient(1px 1px at 55% 86%,#a9dcff 50%,transparent 51%),
radial-gradient(1px 1px at 35% 8%,#fff 50%,transparent 51%),radial-gradient(1px 1px at 93% 82%,#fff 50%,transparent 51%),
radial-gradient(1px 1px at 70% 40%,#cfeaff 50%,transparent 51%),radial-gradient(1px 1px at 19% 44%,#fff 50%,transparent 51%)}
body:after{content:"";position:fixed;left:-20%;right:-20%;bottom:-62vh;height:80vh;border-radius:50%;pointer-events:none;
background:radial-gradient(ellipse at 50% 0%,#172330 0%,#0b0e11 60%);box-shadow:0 -2px 30px rgba(140,200,240,.35),inset 0 2px 0 rgba(230,245,255,.35)}
main{position:relative;z-index:1;width:100%;max-width:360px;text-align:center}
.mark{display:block;margin:0 auto 14px}
.wm b{display:block;font-weight:500;font-size:1.6rem;letter-spacing:.3em;margin-right:-.3em}
.wm small{display:block;font-weight:500;font-size:.68rem;letter-spacing:.6em;margin:7px -.6em 0 0;color:#8cc8f0}
p{color:#9aa2ad;font-size:.95rem;margin:28px 0 18px}
form{display:grid;gap:10px}
input{width:100%;font:inherit;font-size:1rem;color:#eceae4;background:#171b20;border:1px solid #2a3038;border-radius:12px;padding:13px 14px;outline:none}
input:focus{border-color:#8cc8f0;box-shadow:0 0 0 3px rgba(140,200,240,.18)}
button{font:inherit;font-weight:600;font-size:1rem;color:#0f1215;background:#8cc8f0;border:0;border-radius:12px;padding:13px 14px;cursor:pointer}
button:hover{filter:brightness(1.08)}
.err{color:#f0b36b;font-size:.88rem;margin:2px 0 0}
</style></head><body><main>
<svg class="mark" width="72" height="72" viewBox="0 0 48 48" fill="none" aria-hidden="true"><defs> <clipPath id="mk0c"><rect width="48" height="48" rx="11"/></clipPath> <mask id="mk0m" maskUnits="userSpaceOnUse" x="-8" y="-8" width="64" height="64"><rect x="-8" y="-8" width="64" height="64" fill="#fff"/><path d="M-8 41Q24 23 56 41V56H-8Z" fill="#000"/></mask> <linearGradient id="mk0a" x1="0" y1="6" x2="0" y2="40" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#2b3947"/><stop offset="1" stop-color="#06090d"/></linearGradient> <linearGradient id="mk0e" x1="0" y1="5" x2="0" y2="36" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#a9dcff"/><stop offset="1" stop-color="#5aa9e6" stop-opacity=".25"/></linearGradient> <linearGradient id="mk0r" x1="-8" y1="0" x2="56" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#5aa9e6" stop-opacity="0"/><stop offset=".5" stop-color="#e6f5ff"/><stop offset="1" stop-color="#5aa9e6" stop-opacity="0"/></linearGradient> <linearGradient id="mk0b" x1="0" y1="-2" x2="0" y2="7" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#a9dcff" stop-opacity="0"/><stop offset="1" stop-color="#fff"/></linearGradient> <radialGradient id="mk0h" cx="24" cy="31" r="22" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#7cc4ff" stop-opacity=".35"/><stop offset="1" stop-color="#7cc4ff" stop-opacity="0"/></radialGradient> <filter id="mk0g" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.1"/></filter></defs> <g><g mask="url(#mk0m)"><rect x="-8" y="-8" width="64" height="64" fill="url(#mk0h)"/> <path d="M24 -2V7" stroke="url(#mk0b)" stroke-width="2.2" filter="url(#mk0g)"/><path d="M24 -2V7" stroke="url(#mk0b)" stroke-width=".7"/> <path d="M24 4.5L37.5 40H30.5L24 21.5L17.5 40H10.5Z" fill="url(#mk0a)"/> <path d="M10.5 40L24 4.5L37.5 40" stroke="url(#mk0e)" stroke-width="1.8" filter="url(#mk0g)"/><path d="M10.5 40L24 4.5L37.5 40" stroke="url(#mk0e)" stroke-width=".75"/> <path d="M17.5 40L24 21.5L30.5 40" stroke="#9fd4ff" stroke-opacity=".35" stroke-width=".5"/></g> <path d="M-8 41Q24 23 56 41" stroke="url(#mk0r)" stroke-width="2.4" filter="url(#mk0g)"/><path d="M-8 41Q24 23 56 41" stroke="url(#mk0r)" stroke-width=".7"/> <circle cx="24" cy="30.3" r="2.6" fill="#bfe6ff" opacity=".55" filter="url(#mk0g)"/> <path d="M19.5 30.3H28.5" stroke="#cfeaff" stroke-width=".35" opacity=".7"/><path d="M24 27.2L24.45 29.85L27.1 30.3L24.45 30.75L24 33.4L23.55 30.75L20.9 30.3L23.55 29.85Z" fill="#fff"/></g></svg>
<div class="wm" aria-label="Aura Pharma"><b>ΛURΛ</b><small>PHARMA</small></div>
<p>This site is private. Enter the password to continue.</p>
<form method="post" action="/__unlock">
<input type="hidden" name="next" value="${esc(next)}">
<input type="password" name="password" placeholder="Password" aria-label="Password" autocomplete="current-password" required autofocus>
<button type="submit">Enter</button>
${error ? `<div class="err" role="alert">${esc(error)}</div>` : ''}
</form></main></body></html>`;
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' },
  });
}
