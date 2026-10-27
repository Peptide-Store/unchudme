// The flame in the statue's hand (index-renaissance.html). The fire is the painted one from the concept art, kept as
// its own light layer (media/renaissance/fire-layer.png: the art with fire minus the art without, so the fingers are
// dark cut-outs) and added back over the clean statue. A small WebGL shader keeps it alive: the flames above the hand
// drift upward and waver, and the fireball breathes. The palm and fingers are left still, so the hand never warps.
// Reduced-motion users get the painted fire as is; without WebGL the layer is shown as a still image.
(function () {
  const canvas = document.querySelector(".ar-fire");
  if (!canvas) return;
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const img = new Image();
  img.src = "media/renaissance/fire-layer.png";

  const gl = canvas.getContext("webgl", { premultipliedAlpha: false, antialias: false });
  if (!gl) {
    img.className = canvas.className;
    canvas.replaceWith(img);
    return;
  }

  // The layer covers art pixels x 120-480, y 0-320 (art is 1245 x 792); the fireball is at art (297, 162).
  const frag = `
    precision highp float;
    uniform sampler2D tex;
    uniform float t;
    varying vec2 uv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
    }
    float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; } return s; }
    vec3 at(vec2 px) { return texture2D(tex, (px - vec2(120.0, 0.0)) / vec2(360.0, 320.0)).rgb; }
    void main() {
      vec2 px = uv * vec2(360.0, 320.0) + vec2(120.0, 0.0);          // art pixels, y down
      // how free this spot is to move: the flames above the fingertips and the wisps right of the hand, not the hand
      float w = max(smoothstep(135.0, 45.0, px.y), smoothstep(300.0, 345.0, px.x) * smoothstep(270.0, 190.0, px.y));
      // turbulence that rises with the flames
      vec2 q = px / 62.0;
      vec2 n = vec2(fbm(q + vec2(0.0, t * 0.9)), fbm(q + vec2(5.2, t * 0.9 + 1.3))) - 0.5;
      // upward flow, two phases cross-faded so it never jumps
      float p0 = fract(t / 1.4), p1 = fract(t / 1.4 + 0.5);
      vec2 d0 = vec2(n.x * 16.0, n.y * 10.0 + p0 * 16.0) * w;
      vec2 d1 = vec2(n.x * 16.0, n.y * 10.0 + p1 * 16.0) * w;
      vec3 col = mix(at(px + d0), at(px + d1), abs(0.5 - p0) * 2.0);
      // the fire breathing unevenly, strongest in the fireball
      float core = 1.0 - smoothstep(0.0, 90.0, distance(px, vec2(297.0, 162.0)));
      float f = 1.0 + (0.1 * (noise(vec2(t * 2.7, 0.0)) - 0.5) + 0.04 * sin(t * 9.3)) * (0.6 + core);
      col *= f * smoothstep(0.0, 22.0, px.y);                         // soften the tips where the art ends
      gl_FragColor = vec4(col, 1.0);
    }`;
  const vert = `
    attribute vec2 p; varying vec2 uv;
    void main() { uv = vec2(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5); gl_Position = vec4(p, 0.0, 1.0); }`;

  const shader = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, vert));
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, frag));
  gl.linkProgram(prog);
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uT = gl.getUniformLocation(prog, "t");

  const size = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(canvas.clientWidth * dpr) || 1;
    canvas.height = Math.round(canvas.clientHeight * dpr) || 1;
    gl.viewport(0, 0, canvas.width, canvas.height);
  };

  let raf = 0, visible = true, ready = false;
  const t0 = performance.now();
  const draw = (now) => {
    gl.uniform1f(uT, still ? 0 : (now - t0) / 1000);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  const frame = (now) => {
    draw(now);
    raf = visible && !document.hidden && !still ? requestAnimationFrame(frame) : 0;
  };
  const wake = () => { if (ready && !raf && visible) raf = requestAnimationFrame(frame); };

  img.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    ready = true;
    size();
    wake();
  };
  new ResizeObserver(() => { size(); if (ready) draw(performance.now()); }).observe(canvas);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; wake(); }).observe(canvas);
  document.addEventListener("visibilitychange", wake);
})();
