// Shared low-poly 3D Ganesha hero — reused by Intro / Hub / Ending only, never on trial screens (TRD).
// Built entirely from Three.js primitives: no modeled assets, no asset pipeline.
import { lerp, easeOutCubic, reducedMotion } from './engine2d.js';

let scene, camera, renderer, group, container;
let raf = null;
let visible = false;
let dolly = null; // { t0, dur, fromZ, toZ, fromFov, toFov } while a reveal tween is in flight

function buildGanesha() {
  const g = new THREE.Group();

  const skin = new THREE.MeshStandardMaterial({ color: 0xd99a5b, flatShading: true, roughness: 0.6 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xffcf4d, flatShading: true, roughness: 0.35, metalness: 0.3 });
  const cloth = new THREE.MeshStandardMaterial({ color: 0xe2542a, flatShading: true, roughness: 0.7 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x3a1740, flatShading: true, roughness: 0.8 });

  // Belly
  const belly = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15, 1), skin);
  belly.position.set(0, -0.35, 0);
  belly.scale.set(1, 1.05, 0.95);
  g.add(belly);

  // Head
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.78, 1), skin);
  head.position.set(0, 1.15, 0);
  g.add(head);

  // Ears
  const earGeo = new THREE.ConeGeometry(0.55, 0.14, 5);
  const earL = new THREE.Mesh(earGeo, skin);
  earL.rotation.z = Math.PI / 2;
  earL.position.set(-0.85, 1.2, 0.05);
  g.add(earL);
  const earR = earL.clone();
  earR.rotation.z = -Math.PI / 2;
  earR.position.set(0.85, 1.2, 0.05);
  g.add(earR);

  // Trunk (a curved chain of small cones)
  const trunk = new THREE.Group();
  const segs = 6;
  for (let i = 0; i < segs; i++) {
    const t = i / (segs - 1);
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.16 - t * 0.09, 0.18 - t * 0.09, 0.28, 6), skin);
    const curve = Math.sin(t * Math.PI * 0.7);
    seg.position.set(Math.sin(t * 2.0) * 0.18, 0.75 - t * 0.95, 0.55 + curve * 0.25);
    seg.rotation.x = t * 1.1;
    trunk.add(seg);
  }
  g.add(trunk);

  // Crown
  const crown = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.55, 6), gold);
  crown.position.set(0, 1.95, 0);
  g.add(crown);
  const crownBase = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.06, 6, 10), gold);
  crownBase.rotation.x = Math.PI / 2;
  crownBase.position.set(0, 1.65, 0);
  g.add(crownBase);

  // Eyes
  const eyeGeo = new THREE.SphereGeometry(0.07, 6, 6);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1a0a20 });
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.28, 1.25, 0.62);
  g.add(eyeL);
  const eyeR = eyeL.clone();
  eyeR.position.set(0.28, 1.25, 0.62);
  g.add(eyeR);

  // Shawl / sash
  const sash = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.14, 6, 12, Math.PI * 1.3), cloth);
  sash.rotation.set(Math.PI / 2, 0, -0.4);
  sash.position.set(0, -0.2, 0);
  g.add(sash);

  // Base / lotus
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.4, 0.22, 8), dark);
  base.position.set(0, -1.55, 0);
  g.add(base);

  g.scale.set(0.85, 0.85, 0.85);
  return g;
}

function init() {
  if (renderer) return;
  container = document.getElementById('hero3d-container');

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0.6, 6.5);
  camera.lookAt(0, 0.3, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  container.appendChild(renderer.domElement);

  const hemi = new THREE.HemisphereLight(0xffd9a0, 0x2a1030, 0.9);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffcf8a, 1.1);
  key.position.set(3, 4, 5);
  scene.add(key);
  const rim = new THREE.PointLight(0xffcf4d, 1.2, 20);
  rim.position.set(-3, 1, 3);
  scene.add(rim);

  group = buildGanesha();
  group.position.y = -0.2;
  scene.add(group);

  resize();
  window.addEventListener('resize', resize);
}

function resize() {
  if (!renderer || !container) return;
  const w = container.clientWidth || window.innerWidth;
  const h = container.clientHeight || window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

let t0 = performance.now();
function loop() {
  raf = requestAnimationFrame(loop);
  const t = (performance.now() - t0) / 1000;
  if (group) {
    group.rotation.y = Math.sin(t * 0.4) * 0.25;
    group.position.y = -0.2 + Math.sin(t * 1.1) * 0.05;
  }
  if (dolly) {
    const p = Math.min(1, (performance.now() - dolly.t0) / dolly.dur);
    const e = easeOutCubic(p);
    camera.position.z = lerp(dolly.fromZ, dolly.toZ, e);
    camera.fov = lerp(dolly.fromFov, dolly.toFov, e);
    camera.updateProjectionMatrix();
    if (p >= 1) dolly = null;
  }
  renderer.render(scene, camera);
}

export const hero3d = {
  mount() {
    init();
    if (!raf) loop();
  },
  show() {
    visible = true;
    document.getElementById('hero3d-container').style.opacity = '1';
  },
  // Reveal beat for the intro/ending cinematics: a short dolly-in instead of a flat opacity fade.
  revealCinematic() {
    this.show();
    if (!camera) return;
    if (reducedMotion) return; // camera z/fov stays put; opacity fade from show() is enough
    dolly = { t0: performance.now(), dur: 1500, fromZ: 6.5, toZ: 5, fromFov: 38, toFov: 34 };
  },
  hide() {
    visible = false;
    const el = document.getElementById('hero3d-container');
    if (el) el.style.opacity = '0';
  },
  // 0 = normal, 1 = slightly sad/dim (used contextually, kept subtle — Ganesha is never shown harmed, PRD C1)
  setMood(level) {
    if (!group) return;
    group.scale.setScalar(0.85 - level * 0.03);
  },
  resize,
};
