// Password gate for the whole site, run by Vercel before any page or file is served.
// Temporary pre-launch gate. The password is PASSWORD below; a Vercel env var SITE_PASSWORD overrides it.
// A correct password sets an HttpOnly cookie holding an HMAC of the password: changing the password
// signs everyone out. The NOWPayments webhook stays open so crypto payments still confirm.
export const config = { matcher: '/((?!api/crypto-webhook).*)' };

const PASSWORD = 'aurafarm';
// served without the password: the logo the gate page itself shows
const PUBLIC = new Set(['/media/renaissance/logo-mark.png']);
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
  if (same(readCookie(request), expected) || PUBLIC.has(url.pathname)) return new Response(null, { headers: { 'x-middleware-next': '1' } });
  return gate(safeNext(url.pathname + url.search), '', 401);
}

function gate(next, error, status) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow">
<title>Aura Pharma</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box}
html,body{height:100%;margin:0}
body{font-family:"Cormorant Garamond",Georgia,serif;color:#efe6d4;display:grid;place-items:center;padding:16px;overflow:hidden;position:relative;
background:radial-gradient(70% 55% at 50% 100%,rgba(255,140,50,.12),transparent 70%),radial-gradient(900px 700px at 50% 30%,#1a1f29,transparent 70%),#0f1218}
canvas{position:fixed;inset:0;width:100%;height:100%;pointer-events:none}
main{position:relative;z-index:1;width:100%;max-width:380px;text-align:center}
.mark{display:block;margin:0 auto 18px;height:92px;filter:drop-shadow(0 0 14px rgba(255,170,60,.35))}
.wm b{display:block;font-weight:500;font-size:2.4rem;line-height:1;letter-spacing:.32em;margin-right:-.32em}
.wm small{display:block;font-weight:600;font-size:.82rem;letter-spacing:.72em;margin:10px -.72em 0 0;color:#d4af6a}
p{color:#c9bfae;font-size:1.2rem;margin:30px 0 20px}
form{display:grid;gap:12px}
input{width:100%;font:500 1.1rem "Cormorant Garamond",Georgia,serif;letter-spacing:.04em;color:#efe6d4;background:rgba(13,15,20,.85);border:1px solid rgba(212,175,106,.3);border-radius:999px;padding:14px 22px;outline:none}
input::placeholder{color:#8f8676}
input:focus{border-color:#d4af6a;box-shadow:0 0 0 3px rgba(212,175,106,.18)}
button{font:700 .95rem "Cormorant Garamond",Georgia,serif;letter-spacing:.24em;text-transform:uppercase;color:#1b150b;background:linear-gradient(180deg,#e9cf95,#cfa962);border:0;border-radius:999px;padding:15px 14px;cursor:pointer;box-shadow:0 10px 30px rgba(0,0,0,.45)}
button:hover{filter:brightness(1.08)}
.err{color:#f0b36b;font-size:1.05rem;margin:4px 0 0}
</style></head><body><canvas aria-hidden="true"></canvas><main>
<img class="mark" src="/media/renaissance/logo-mark.png" alt="">
<div class="wm" aria-label="Aura Pharma"><b>AURA</b><small>PHARMA</small></div>
<p>This site is private. Enter the password to continue.</p>
<form method="post" action="/__unlock">
<input type="hidden" name="next" value="${esc(next)}">
<input type="password" name="password" placeholder="Password" aria-label="Password" autocomplete="current-password" required autofocus>
<button type="submit">Enter</button>
${error ? `<div class="err" role="alert">${esc(error)}</div>` : ''}
</form></main>
<script>
(function(){var c=document.querySelector("canvas"),x=c.getContext("2d"),still=matchMedia("(prefers-reduced-motion: reduce)").matches,w,h,d,f=[],s=11,
r=function(){return((s=s*16807%2147483647)-1)/2147483646};
function lay(){d=Math.min(devicePixelRatio||1,2);w=c.clientWidth;h=c.clientHeight;c.width=w*d;c.height=h*d;s=11;f=[];
for(var i=0,n=Math.round(w*h/7000);i<n;i++){var z=r();f.push({x:r()*w,y:r()*h,s:.6+z*z*2.4,a:.18+z*.45,vy:5+z*14,vx:2+z*5,sw:4+r()*10,fq:.2+r()*.5,p:r()*6.28,sp:(r()-.5)*1.2,e:r()<.1})}}
function draw(t){x.setTransform(d,0,0,d,0,0);x.clearRect(0,0,w,h);f.forEach(function(p){var X=(p.x+t*p.vx+Math.sin(t*p.fq+p.p)*p.sw)%w,Y=(p.y-t*p.vy)%h;if(X<0)X+=w;if(Y<0)Y+=h;
if(p.e){var g=x.createRadialGradient(X,Y,0,X,Y,p.s*3.2),k=.55+.45*Math.sin(t*3+p.p);g.addColorStop(0,"rgba(255,196,120,"+(p.a+.3)*k+")");g.addColorStop(1,"rgba(255,120,40,0)");x.globalAlpha=1;x.fillStyle=g;x.beginPath();x.arc(X,Y,p.s*3.2,0,6.283);x.fill()}
else{x.save();x.translate(X,Y);x.rotate(p.p+t*p.sp);x.globalAlpha=p.a;x.fillStyle="#b8b0a3";x.beginPath();x.ellipse(0,0,p.s,p.s*.55,0,0,6.283);x.fill();x.restore()}});x.globalAlpha=1}
lay();addEventListener("resize",lay);var t0=performance.now();(function tick(n){draw((n-t0)/1000);if(!still)requestAnimationFrame(tick)})(t0);})();
</script></body></html>`;
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' },
  });
}
