// Live home-page hero: three sleek vials floating over the page with idle motion (they don't follow the pointer).
// mountHero(container, { mark, specs: [left, centre, right], animate }) → Promise<canvas>. Throws if WebGL is unavailable.
import * as THREE from 'three';
import { makeVial, studioEnvironment, FONTS, LOGO } from './vial-model.js';

// centre vial forward and larger, the flanking pair set back
const SLOTS = [{ x: -2.15, z: -1.1, s: 0.86 }, { x: 0, z: 0.7, s: 1.08 }, { x: 2.15, z: -1.1, s: 0.86 }];

export async function mountHero(container, { mark, specs, animate = true }) {
  await Promise.all([...FONTS.map((f) => document.fonts.load(f)), LOGO.decode()]);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: !animate });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.environment = studioEnvironment(renderer, 0x1d2224, 0.3);

  const camera = new THREE.PerspectiveCamera(22, 1, 0.1, 100);
  camera.position.set(0, 3.1, 17); camera.lookAt(0, 2.35, 0);

  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(-1.5, 10, 4);
  key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 12;
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 7, bottom: -4 });
  scene.add(key);
  // ice-blue rim lights from behind pick out the glass and crimp edges against the dark page
  const rimL = new THREE.DirectionalLight(0x7cc4ff, 3); rimL.position.set(-6, 4, -6); scene.add(rimL);
  const rimR = new THREE.DirectionalLight(0x7cc4ff, 2.2); rimR.position.set(6, 3, -6); scene.add(rimR);
  const fill = new THREE.DirectionalLight(0xffffff, 0.6); fill.position.set(4, 2, 5); scene.add(fill);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.38 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

  const rig = new THREE.Group(); scene.add(rig);
  const vials = SLOTS.map(({ x, z, s }, i) => {
    const v = makeVial(mark, { sleek: true });
    v.drawLabel(specs[i]);
    v.group.position.set(x, 0, z); v.group.scale.setScalar(s);
    v.baseYaw = Math.atan2(camera.position.x - x, camera.position.z - z);
    v.group.rotation.y = v.baseYaw;
    rig.add(v.group); return v;
  });

  const canvas = renderer.domElement;
  container.appendChild(canvas);
  // if the browser drops the WebGL context (GPU reset, too many 3D tabs) the canvas goes blank — show the still instead
  canvas.addEventListener('webglcontextlost', () => container.classList.remove('live'));
  canvas.addEventListener('webglcontextrestored', () => container.classList.add('live'));
  const resize = () => {
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  resize(); new ResizeObserver(() => { resize(); if (!animate) renderer.render(scene, camera); }).observe(container);

  // idle motion: each vial floats and sways on its own phase
  const pose = (t) => {
    vials.forEach((v, i) => {
      v.group.position.y = 0.32 + 0.14 * Math.sin(t * 0.9 + i * 2.1);
      v.group.rotation.y = v.baseYaw + 0.22 * Math.sin(t * 0.42 + i * 1.7);
      v.group.rotation.z = 0.03 * Math.sin(t * 0.65 + i * 2.6);
    });
  };

  if (!animate) { pose(0); renderer.render(scene, camera); return canvas; }

  // only spend frames while the hero is on screen
  let visible = true, raf = 0;
  const t0 = performance.now();
  const tick = () => { pose((performance.now() - t0) / 1000); renderer.render(scene, camera); raf = visible ? requestAnimationFrame(tick) : 0; };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(tick); }).observe(container);
  tick();
  return canvas;
}
