// Classical theme (body.ar), inner pages: the home hero's windy mist as a fixed backdrop (.ar-mist).
// A tileable soft-noise texture drawn as one repeating pattern (separate tiles leave seam lines as they drift),
// two layers scrolled slowly leftward as if in wind; reduced-motion users get a still frame.
(() => {
  const cv = document.querySelector(".ar-mist");
  if (!cv) return;
  const cx = cv.getContext("2d");
  const N = 256, tex = document.createElement("canvas"); tex.width = tex.height = N;
  const tx = tex.getContext("2d"), im = tx.createImageData(N, N);
  const grid = (s) => Array.from({ length: s * s }, () => Math.random());
  const oct = [[4, .5], [8, .28], [16, .14], [32, .08]].map(([s, a]) => ({ s, a, g: grid(s) }));
  const smooth = (t) => t * t * (3 - 2 * t);
  const val = ({ s, g }, x, y) => {      // wrapping value noise at s cells across the tile
    const fx = x / N * s, fy = y / N * s, x0 = Math.floor(fx), y0 = Math.floor(fy), u = smooth(fx - x0), v = smooth(fy - y0);
    const at = (i, j) => g[((j % s) + s) % s * s + ((i % s) + s) % s];
    return (at(x0, y0) * (1 - u) + at(x0 + 1, y0) * u) * (1 - v) + (at(x0, y0 + 1) * (1 - u) + at(x0 + 1, y0 + 1) * u) * v;
  };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let n = 0; for (const o of oct) n += val(o, x, y) * o.a;
    const a = Math.max(0, Math.min(1, (n - .42) / .4));    // wisps, not a flat fog
    const i = (y * N + x) * 4; im.data[i] = 120; im.data[i + 1] = 106; im.data[i + 2] = 88; im.data[i + 3] = a * a * 255;
  }
  tx.putImageData(im, 0, 0);
  const fit = () => { cv.width = Math.round(cv.clientWidth / 2); cv.height = Math.round(cv.clientHeight / 2); };
  addEventListener("resize", fit); fit();
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pat = cx.createPattern(tex, "repeat");
  const layer = (t, size, speed, alpha, yo) => {
    const k = size / N;
    cx.globalAlpha = alpha;
    cx.setTransform(k, 0, 0, k, -t * speed, yo + Math.sin(t / 9000) * 6);
    cx.fillStyle = pat;
    cx.fillRect((t * speed) / k - N, -(yo + 6) / k - N, cv.width / k + 2 * N, cv.height / k + 2 * N);
    cx.setTransform(1, 0, 0, 1, 0, 0);
  };
  const draw = (t) => {
    cx.clearRect(0, 0, cv.width, cv.height);
    const s = Math.max(cv.width, cv.height);
    layer(t, s * 1.2, .0035, .34, 0);
    layer(t + 4e4, s * .8, .006, .2, cv.height * .3);
    if (!still) requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
})();
