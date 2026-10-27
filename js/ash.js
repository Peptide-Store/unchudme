// Classical theme (body.ar): ash drifting through the night sky, and the fireball's
// light flickering on the statue's hand. Same rules as the starfield (js/space.js): the ash drifts slowly in one direction
// (rising, a little to the right), nothing follows the pointer, and reduced-motion users get a still scene.
(function () {
  // on the home page the ash fills the hero; on other pages it is a fixed backdrop (.ar-ash-page)
  const ashCanvas = document.querySelector(".ar-ash");
  const flameCanvas = document.querySelector(".ar-flame");
  if (!ashCanvas) return;
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ash = ashCanvas.getContext("2d");
  const flame = flameCanvas && flameCanvas.getContext("2d");

  // the fire in the art, in image pixels (art is 1245 x 792); must match .ar-flame in renaissance.css
  const SRC = { x: 150, y: 0, w: 320, h: 290 };
  const CORE = { x: 147, y: 162 };                     // the fireball in the palm, in that region

  let seed = 11;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

  let w = 0, h = 0, dpr = 1, flakes = [];
  const layout = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = ashCanvas.clientWidth; h = ashCanvas.clientHeight;
    ashCanvas.width = Math.round(w * dpr); ashCanvas.height = Math.round(h * dpr);
    seed = 11;
    flakes = Array.from({ length: Math.round((w * h) / 7000) }, () => {
      const depth = rand();                            // 0 far … 1 near: nearer flakes are bigger and faster
      return {
        x: rand() * w, y: rand() * h, depth,
        s: 0.6 + depth * depth * 2.4,                  // size, px
        a: 0.18 + depth * 0.45,                        // opacity
        vy: 5 + depth * 14, vx: 2 + depth * 5,         // px/s, upward and to the right
        sway: 4 + rand() * 10, f: 0.2 + rand() * 0.5, ph: rand() * 6.28, spin: (rand() - 0.5) * 1.2,
        ember: rand() < 0.1,                           // a few glowing embers among the ash
      };
    });
    if (flameCanvas) { flameCanvas.width = SRC.w * RES; flameCanvas.height = SRC.h * RES; }
  };


  let t = 0, last = 0;
  const drawAsh = (dt) => {
    ash.setTransform(dpr, 0, 0, dpr, 0, 0);
    ash.clearRect(0, 0, w, h);
    for (const p of flakes) {
      let x = (p.x + t * p.vx + Math.sin(t * p.f + p.ph) * p.sway) % w, y = (p.y - t * p.vy) % h;
      if (x < 0) x += w; if (y < 0) y += h;
      if (p.ember) {
        const glow = 0.55 + 0.45 * Math.sin(t * 3 + p.ph);
        const g = ash.createRadialGradient(x, y, 0, x, y, p.s * 3.2);
        g.addColorStop(0, `rgba(255,196,120,${(p.a + 0.3) * glow})`); g.addColorStop(1, "rgba(255,120,40,0)");
        ash.fillStyle = g; ash.beginPath(); ash.arc(x, y, p.s * 3.2, 0, 6.283); ash.fill();
      } else {
        // a flake: a small tumbling sliver of grey
        ash.save(); ash.translate(x, y); ash.rotate(p.ph + t * p.spin);
        ash.globalAlpha = p.a; ash.fillStyle = "#b8b0a3";
        ash.beginPath(); ash.ellipse(0, 0, p.s, p.s * 0.55, 0, 0, 6.283); ash.fill();
        ash.restore();
      }
    }
    ash.globalAlpha = 1;

  };

  // The fire itself is js/fire.js; this canvas only adds the fireball's flickering light on the hand.
  const RES = 2;                                       // canvas pixels per art pixel, for crisp edges
  const drawFlame = () => {
    if (!flame) return;
    flame.setTransform(RES, 0, 0, RES, 0, 0);
    flame.clearRect(0, 0, SRC.w, SRC.h);
    flame.globalCompositeOperation = "lighter";
    // the fireball's light breathing unevenly, as fire does
    const pulse = 0.14 + 0.06 * Math.sin(t * 7.3) + 0.04 * Math.sin(t * 13.1 + 1) + 0.03 * Math.sin(t * 2.1);
    const glow = flame.createRadialGradient(CORE.x, CORE.y, 0, CORE.x, CORE.y, 95);
    glow.addColorStop(0, `rgba(255,200,130,${pulse})`); glow.addColorStop(1, "rgba(255,120,40,0)");
    flame.fillStyle = glow; flame.fillRect(0, 0, SRC.w, SRC.h);
    flame.globalCompositeOperation = "source-over";
  };

  let raf = 0, visible = true;
  const tick = (now) => {
    const dt = Math.min(0.1, last ? (now - last) / 1000 : 0); last = now; t += dt;
    drawAsh(dt); drawFlame();
    raf = visible && !document.hidden ? requestAnimationFrame(tick) : (last = 0);
  };
  const wake = () => { if (!raf && visible && !still) raf = requestAnimationFrame(tick); };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; wake(); }).observe(ashCanvas);
  document.addEventListener("visibilitychange", wake);
  new ResizeObserver(() => { layout(); drawAsh(0); }).observe(ashCanvas);
  layout(); drawAsh(0);
  if (!still) wake();
})();
