/* E&N — 3D shipping box, scroll-scrubbed through the story.
   Everything is procedural: geometry built in code, textures drawn on canvas. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const root = document.documentElement;
const story = window.ENStory || { t: 0, locals: [0, 0, 0, 0], cfg: { dropStart: .26, dropGap: .125, dropDur: .2, items: 5 }, reduced: false, stageOn: true, on() {} };
const REDUCED = story.reduced;
const STATIC = () => REDUCED || root.classList.contains('no-story');
const canvas = document.getElementById('box-canvas');
const NOSMOOTH = /[?&]nosmooth\b/.test(location.search); // screenshot/test hook

/* ---------- helpers ---------- */
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (v, a, b) => clamp((v - a) / (b - a));
const sstep = (a, b, v) => { const x = seg(v, a, b); return x * x * (3 - 2 * x); };
const easeOut3 = (x) => 1 - Math.pow(1 - x, 3);
const easeInOut = (x) => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeIn3 = (x) => x * x * x;
const backOut = (x, s = 1.6) => { const c3 = s + 1; return 1 + c3 * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

/* ---------- WebGL check ---------- */
let renderer;
try {
  const test = document.createElement('canvas');
  const ok = !!(window.WebGLRenderingContext && (test.getContext('webgl2') || test.getContext('webgl')));
  if (!ok) throw new Error('no webgl');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch (e) {
  root.classList.add('no-story');
  throw e;
}

/* ---------- fonts first (textures use them) ---------- */
async function fontsReady() {
  if (!document.fonts) return;
  const loads = [
    document.fonts.load('900 80px Archivo'),
    document.fonts.load('800 80px Archivo'),
    document.fonts.load('600 30px "IBM Plex Mono"'),
    document.fonts.load('500 30px "IBM Plex Mono"'),
  ];
  await Promise.race([Promise.all(loads), new Promise((r) => setTimeout(r, 2500))]);
}

/* ---------- canvas textures ---------- */
const MAX_ANISO = renderer.capabilities.getMaxAnisotropy();
function canvasTex(cv, { srgb = true, wrap = false } = {}) {
  const t = new THREE.CanvasTexture(cv);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(8, MAX_ANISO);
  if (wrap) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return t;
}
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// Kraft paper: warm base, speckle, fibres and the faint vertical flute banding of corrugated board.
function drawKraft(ctx, w, h, { base = [176, 136, 96], seed = 7, flutes = true, light = 0 } = {}) {
  const r = rng(seed);
  const g = ctx.createLinearGradient(0, 0, w, h);
  const [R, G, B] = base.map((v) => v + light);
  g.addColorStop(0, `rgb(${R + 6},${G + 5},${B + 3})`);
  g.addColorStop(.5, `rgb(${R},${G},${B})`);
  g.addColorStop(1, `rgb(${R - 8},${G - 7},${B - 5})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  // blotches
  for (let i = 0; i < 60; i++) {
    const x = r() * w, y = r() * h, rad = 30 + r() * 140;
    const gg = ctx.createRadialGradient(x, y, 0, x, y, rad);
    const dark = r() > .5;
    gg.addColorStop(0, dark ? 'rgba(90,60,30,.06)' : 'rgba(255,240,215,.06)');
    gg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gg; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // flute banding
  if (flutes) {
    const period = 22;
    for (let x = 0; x < w; x += period) {
      const gg = ctx.createLinearGradient(x, 0, x + period, 0);
      gg.addColorStop(0, 'rgba(255,245,225,.05)');
      gg.addColorStop(.5, 'rgba(80,50,20,.055)');
      gg.addColorStop(1, 'rgba(255,245,225,.05)');
      ctx.fillStyle = gg; ctx.fillRect(x, 0, period, h);
    }
  }
  // fibres
  ctx.lineCap = 'round';
  for (let i = 0; i < 900; i++) {
    const x = r() * w, y = r() * h, len = 4 + r() * 16, a = r() * Math.PI;
    ctx.strokeStyle = r() > .5 ? `rgba(95,62,30,${.05 + r() * .1})` : `rgba(255,236,205,${.05 + r() * .1})`;
    ctx.lineWidth = .6 + r() * .9;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); ctx.stroke();
  }
  // speckle
  const img = ctx.getImageData(0, 0, w, h); const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - .5) * 16;
    d[i] += n; d[i + 1] += n * .92; d[i + 2] += n * .8;
    if (r() < .0018) { d[i] -= 50; d[i + 1] -= 45; d[i + 2] -= 38; }
  }
  ctx.putImageData(img, 0, 0);
}

// Rough "rubber stamp" ink: draw, then knock out speckles.
function roughen(ctx, x, y, w, h, seed, amt = .22) {
  const r = rng(seed);
  ctx.save(); ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < w * h * .004; i++) {
    ctx.fillStyle = `rgba(0,0,0,${amt + r() * .5})`;
    const s = .6 + r() * 2.4;
    ctx.fillRect(x + r() * w, y + r() * h, s, s);
  }
  ctx.restore();
}

function textFit(ctx, str, maxW) { const m = ctx.measureText(str).width; return m > maxW ? maxW / m : 1; }

function makeKraftTex(seed, light = 0) {
  const c = mkCanvas(1024, 1024); drawKraft(c.getContext('2d'), 1024, 1024, { seed, light });
  return canvasTex(c, { wrap: true });
}
function makeInnerTex() {
  const c = mkCanvas(512, 512); drawKraft(c.getContext('2d'), 512, 512, { seed: 11, base: [176, 142, 104], flutes: false });
  return canvasTex(c, { wrap: true });
}
function makeFluteTex() {
  const c = mkCanvas(256, 32); const x = c.getContext('2d');
  x.fillStyle = '#9c7446'; x.fillRect(0, 0, 256, 32);
  x.fillStyle = '#c59a69'; x.fillRect(0, 0, 256, 6); x.fillRect(0, 26, 256, 6);
  x.strokeStyle = '#c9a070'; x.lineWidth = 3; x.beginPath();
  for (let i = 0; i <= 256; i++) { const y = 16 + Math.sin(i / 256 * Math.PI * 2 * 8) * 9; i ? x.lineTo(i, y) : x.moveTo(i, y); }
  x.stroke();
  return canvasTex(c, { wrap: true });
}


// E&N logo from brand/ outlines (logo-paths.js). Draws pebble (+ optional "service company")
// in one colour with the letters knocked out, so the ground shows through them.
function enLogoCanvas(heightPx, color, withText) {
  const L = window.EN_LOGO; if (!L) return null;
  const w = withText ? L.W : 866, k = heightPx / L.H;
  const c = mkCanvas(Math.ceil(w * k), Math.ceil(heightPx)); const x = c.getContext('2d');
  x.scale(k, k); x.fillStyle = color;
  x.fill(new Path2D(L.PEB)); if (withText) x.fill(new Path2D(L.TXT));
  x.globalCompositeOperation = 'destination-out'; x.fill(new Path2D(L.LET));
  return c;
}

// Front panel print: E&N stamp.
function makeFrontTex(W, H) {
  const pxu = 512; const c = mkCanvas(Math.round(W * pxu), Math.round(H * pxu)); const x = c.getContext('2d');
  drawKraft(x, c.width, c.height, { seed: 3 });
  const ink = 'rgba(52,36,24,.86)';
  x.save();
  x.fillStyle = ink; x.strokeStyle = ink;
  const bx = 70, by = c.height - 250;
  const logo = enLogoCanvas(190, ink, true);
  if (logo) x.drawImage(logo, bx - 10, by - 40);
  x.restore();
  roughen(x, bx - 40, by - 50, 500, 280, 21, .25);
  return canvasTex(c);
}

// Side panel print: this-side-up arrows + handling marks.
function makeSideTex(D, H) {
  const pxu = 512; const c = mkCanvas(Math.round(D * pxu), Math.round(H * pxu)); const x = c.getContext('2d');
  drawKraft(x, c.width, c.height, { seed: 5 });
  const ink = 'rgba(52,36,24,.82)';
  x.fillStyle = ink; x.strokeStyle = ink;
  const cx = c.width / 2, top = c.height * .36;
  for (let k = -1; k <= 1; k += 2) {
    const ax = cx + k * 44;
    x.beginPath(); x.moveTo(ax, top); x.lineTo(ax - 30, top + 44); x.lineTo(ax - 10, top + 44); x.lineTo(ax - 10, top + 120);
    x.lineTo(ax + 10, top + 120); x.lineTo(ax + 10, top + 44); x.lineTo(ax + 30, top + 44); x.closePath(); x.fill();
  }
  x.lineWidth = 4; x.strokeRect(cx - 100, top - 26, 200, 170);
  x.font = '600 26px "IBM Plex Mono"'; x.textAlign = 'center';
  x.fillText('THIS SIDE UP', cx, top + 196);
  roughen(x, cx - 130, top - 40, 260, 260, 9, .25);
  return canvasTex(c);
}

function makeTapeTex() {
  const c = mkCanvas(512, 256); const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#ff6a2e'); g.addColorStop(.5, '#f2551d'); g.addColorStop(1, '#e24a15');
  x.fillStyle = g; x.fillRect(0, 0, 512, 256);
  // edges
  x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(0, 0, 512, 6);
  x.fillStyle = 'rgba(0,0,0,.12)'; x.fillRect(0, 250, 512, 6);
  const tl = enLogoCanvas(150, 'rgba(255,255,255,.95)', false);
  if (tl) x.drawImage(tl, 256 - tl.width / 2, 128 - tl.height / 2);
  x.fillStyle = 'rgba(255,255,255,.9)';
  x.fillRect(12, 124, 50, 10); x.fillRect(450, 124, 50, 10);
  return canvasTex(c, { wrap: true });
}

function makeLabelTex() {
  const w = 1024, h = 680; const c = mkCanvas(w, h); const x = c.getContext('2d');
  x.fillStyle = '#fbfaf6'; x.fillRect(0, 0, w, h);
  const ink = '#15171b';
  x.strokeStyle = ink; x.lineWidth = 6; x.strokeRect(26, 26, w - 52, h - 52);
  // header band
  x.fillStyle = ink; x.fillRect(26, 26, w - 52, 118);
  const ll = enLogoCanvas(84, '#fff', true);
  if (ll) x.drawImage(ll, 52, 44);
  x.fillStyle = '#fff'; x.textBaseline = 'middle'; x.font = '600 26px "IBM Plex Mono"';
  x.textAlign = 'right'; x.fillText('1 / 1', w - 60, 90); x.textAlign = 'left';
  // fields
  x.fillStyle = '#6d727a'; x.font = '500 24px "IBM Plex Mono"';
  x.fillText('DELIVER TO', 60, 190);
  x.fillText('CONTENTS', 60, 330);
  x.fillStyle = ink; x.font = '800 64px Archivo';
  x.fillText('Your team', 58, 250);
  x.fillText('Your list', 58, 390);
  // check block
  x.fillStyle = '#f2551d'; x.fillRect(w - 26 - 250, 144, 250, 276);
  x.strokeStyle = '#15171b'; x.lineWidth = 6;
  x.beginPath(); x.moveTo(w - 26 - 250, 144); x.lineTo(w - 26 - 250, 420); x.stroke();
  x.strokeStyle = '#fff'; x.lineWidth = 26; x.lineCap = 'round'; x.lineJoin = 'round';
  x.beginPath(); x.moveTo(w - 238, 285); x.lineTo(w - 185, 338); x.lineTo(w - 84, 222); x.stroke();
  // rule
  x.fillStyle = ink; x.fillRect(26, 420, w - 52, 6);
  // barcode
  const r = rng(42); let bx = 60;
  while (bx < w - 60) { const bw = 3 + Math.floor(r() * 4) * 3; if (r() > .35) x.fillRect(bx, 460, bw, 130); bx += bw + 3 + Math.floor(r() * 3) * 2; }
  x.font = '500 22px "IBM Plex Mono"'; x.fillStyle = ink; x.textBaseline = 'alphabetic';
  x.fillText('EXACT  ·  DELIVERED  ·  FAST', 60, 628);
  return canvasTex(c);
}

function makeBlobTex() {
  const c = mkCanvas(256, 256); const x = c.getContext('2d');
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(20,22,26,.55)'); g.addColorStop(.45, 'rgba(20,22,26,.22)'); g.addColorStop(1, 'rgba(20,22,26,0)');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  return canvasTex(c);
}

function makePaperListTex() {
  const w = 512, h = 680; const c = mkCanvas(w, h); const x = c.getContext('2d');
  x.fillStyle = '#fdfdfb'; x.fillRect(0, 0, w, h);
  x.strokeStyle = 'rgba(40,110,200,.18)'; x.lineWidth = 2;
  for (let y = 120; y < h - 20; y += 56) { x.beginPath(); x.moveTo(24, y); x.lineTo(w - 24, y); x.stroke(); }
  x.strokeStyle = 'rgba(242,85,29,.45)'; x.beginPath(); x.moveTo(70, 0); x.lineTo(70, h); x.stroke();
  x.fillStyle = '#15171b'; x.font = '800 40px Archivo'; x.fillText('List', 90, 84);
  const items = ['Hex bolts', '30 A fuse', 'Paper towels', 'Shop light 4 ft', 'Padlock', 'Work gloves', 'HVAC filter', 'Toner'];
  x.font = '500 28px "IBM Plex Mono"'; x.fillStyle = '#2a2e35';
  items.forEach((s, i) => { x.fillText(s, 90, 158 + i * 56); });
  x.strokeStyle = '#f2551d'; x.lineWidth = 5; x.lineCap = 'round';
  for (let i = 0; i < 5; i++) { const y = 150 + i * 56; x.beginPath(); x.moveTo(28, y - 6); x.lineTo(40, y + 6); x.lineTo(60, y - 16); x.stroke(); }
  return canvasTex(c);
}

/* ---------- main ---------- */
await fontsReady();

renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap;
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;

const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);

// Lights: soft studio key, cool fill, warm rim
const hemi = new THREE.HemisphereLight(0xffffff, 0xcfc8bd, 0.9);
scene.add(hemi);
const key = new THREE.DirectionalLight(0xfffaf2, 2.4);
key.position.set(3.5, 8, 5.5);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.camera.left = -3.2; key.shadow.camera.right = 3.2;
key.shadow.camera.top = 3.2; key.shadow.camera.bottom = -3.2;
key.shadow.camera.near = 2; key.shadow.camera.far = 20;
key.shadow.bias = -0.0006; key.shadow.normalBias = 0.02;
key.shadow.radius = 10; key.shadow.blurSamples = 16;
scene.add(key);
const rim = new THREE.DirectionalLight(0xffe2c8, 1.2);
rim.position.set(-6, 3.5, -4);
scene.add(rim);
const fill = new THREE.DirectionalLight(0xdfe8ff, 0.5);
fill.position.set(-4, 1.5, 6);
scene.add(fill);

// Ground: shadow catcher + soft blob
const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.13 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
scene.add(ground);
const blobMat = new THREE.MeshBasicMaterial({ map: makeBlobTex(), transparent: true, depthWrite: false, toneMapped: false });
const blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), blobMat);
blob.rotation.x = -Math.PI / 2; blob.position.y = 0.002; blob.renderOrder = -1;
scene.add(blob);

// Landing ripple for "Delivered."
const ringMat = new THREE.MeshBasicMaterial({ color: 0xf2551d, transparent: true, opacity: 0, toneMapped: false, depthWrite: false });
const ring = new THREE.Mesh(new THREE.RingGeometry(.985, 1, 128), ringMat);
ring.rotation.x = -Math.PI / 2; ring.position.y = .004; ring.renderOrder = -1;
scene.add(ring);
const ring2 = new THREE.Mesh(new THREE.RingGeometry(.99, 1, 128), ringMat.clone());
ring2.rotation.x = -Math.PI / 2; ring2.position.y = .004; ring2.renderOrder = -1;
scene.add(ring2);
function setRing(p) {
  ring.visible = ring2.visible = p > 0 && p < 1;
  const e = easeOut3(p);
  ring.scale.setScalar(1.4 + e * 1.5); ring.scale.z = 1;
  ringMat.opacity = (1 - p) * (1 - p) * .9;
  const p2 = clamp((p - .15) / .85), e2 = easeOut3(p2);
  ring2.scale.setScalar(1.3 + e2 * 2.2);
  ring2.material.opacity = (1 - p2) * .45 * (p2 > 0 ? 1 : 0);
}

/* ---------- the box ---------- */
const W = 2.0, D = 1.5, H = 1.35, TH = 0.04;
const PX_PER_UNIT_TEX = 2; // kraft canvas spans 2 world units

const kraftBase = makeKraftTex(7);
const innerBase = makeInnerTex();
const fluteBase = makeFluteTex();

function repTex(base, u, v) { const t = base.clone(); t.repeat.set(u, v); t.needsUpdate = true; return t; }
const matCache = new Map();
function kraftMat(u, v, which = 'outer') {
  const k = `${which}-${u.toFixed(2)}-${v.toFixed(2)}`;
  if (matCache.has(k)) return matCache.get(k);
  let m;
  if (which === 'outer') m = new THREE.MeshStandardMaterial({ map: repTex(kraftBase, u / PX_PER_UNIT_TEX, v / PX_PER_UNIT_TEX), roughness: .86, metalness: 0 });
  else if (which === 'inner') m = new THREE.MeshStandardMaterial({ map: repTex(innerBase, u / 1.2, v / 1.2), roughness: .92, metalness: 0 });
  else m = new THREE.MeshStandardMaterial({ map: repTex(fluteBase, Math.max(1, u / .1), 1), roughness: .95, metalness: 0 });
  matCache.set(k, m); return m;
}
const frontMat = new THREE.MeshStandardMaterial({ map: makeFrontTex(W, H + TH), roughness: .86 });
const sideMat = new THREE.MeshStandardMaterial({ map: makeSideTex(D, H), roughness: .86 });

function panel(w, h, d, mats) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
  m.castShadow = true; m.receiveShadow = true; return m;
}

const boxRoot = new THREE.Group();   // float + position
const boxTilt = new THREE.Group();   // cursor tilt
const boxSpin = new THREE.Group();   // story rotation, pivot at box centre
const boxBody = new THREE.Group();   // geometry, bottom at y=0
boxBody.position.y = -H / 2;
boxRoot.add(boxTilt); boxTilt.add(boxSpin); boxSpin.add(boxBody);
boxTilt.position.y = H / 2;
scene.add(boxRoot);

const HF = H + TH; // front/back walls are one board taller (long flaps sit on the short ones)
{
  const out = kraftMat(W, HF), inn = kraftMat(W, HF, 'inner');
  const edgeTop = kraftMat(W, 1, 'flute'), edgeSide = kraftMat(HF, 1, 'outer');
  // +x, -x, +y, -y, +z, -z
  const front = panel(W, HF, TH, [edgeSide, edgeSide, edgeTop, edgeTop, frontMat, inn]);
  front.position.set(0, HF / 2, D / 2 - TH / 2);
  const back = panel(W, HF, TH, [edgeSide, edgeSide, edgeTop, edgeTop, inn, out]);
  back.position.set(0, HF / 2, -D / 2 + TH / 2);
  const sd = D - 2 * TH;
  const sInn = kraftMat(sd, H, 'inner'), sEdge = kraftMat(sd, 1, 'flute');
  const right = panel(TH, H, sd, [sideMat, sInn, sEdge, sEdge, sEdge, sEdge]);
  right.position.set(W / 2 - TH / 2, H / 2, 0);
  const left = panel(TH, H, sd, [sInn, sideMat, sEdge, sEdge, sEdge, sEdge]);
  left.position.set(-W / 2 + TH / 2, H / 2, 0);
  const bInn = kraftMat(W, D, 'inner');
  const bottom = panel(W - 2 * TH, TH, sd, [bInn, bInn, bInn, kraftMat(W, D), bInn, bInn]);
  bottom.position.set(0, TH / 2, 0);
  boxBody.add(front, back, right, left, bottom);
}

// Flaps: pivot groups on the top edges
const flaps = [];
function makeFlap({ w, d, pivot, axis, dir, open, inward }) {
  const g = new THREE.Group(); g.position.copy(pivot);
  const outer = kraftMat(axis === 'x' ? w : d, axis === 'x' ? d : w);
  const inner = kraftMat(w, d, 'inner');
  const edge = kraftMat(Math.max(w, d), 1, 'flute');
  const geo = axis === 'x' ? new THREE.BoxGeometry(w, TH, d) : new THREE.BoxGeometry(d, TH, w);
  const m = new THREE.Mesh(geo, [edge, edge, outer, inner, edge, edge]);
  m.castShadow = true; m.receiveShadow = true;
  if (axis === 'x') m.position.set(0, 0, inward * d / 2); else m.position.set(inward * d / 2, 0, 0);
  g.add(m); boxBody.add(g);
  const f = { g, axis, dir, open }; flaps.push(f); return f;
}
const LD = D / 2 - TH / 2 - 0.004; // long flap depth (meet in the middle)
const SD = D / 2 - 0.02;           // short flap depth
const flapFront = makeFlap({ w: W - 0.004, d: LD, pivot: new THREE.Vector3(0, H + TH + TH / 2, D / 2 - TH / 2), axis: 'x', dir: 1, open: 2.78, inward: -1 });
const flapBack = makeFlap({ w: W - 0.004, d: LD, pivot: new THREE.Vector3(0, H + TH + TH / 2, -D / 2 + TH / 2), axis: 'x', dir: -1, open: 2.15, inward: 1 });
const flapRight = makeFlap({ w: D - 2 * TH - 0.006, d: SD, pivot: new THREE.Vector3(W / 2 - TH / 2, H + TH / 2, 0), axis: 'z', dir: -1, open: 2.05, inward: -1 });
const flapLeft = makeFlap({ w: D - 2 * TH - 0.006, d: SD, pivot: new THREE.Vector3(-W / 2 + TH / 2, H + TH / 2, 0), axis: 'z', dir: 1, open: 2.2, inward: 1 });
function setFlap(f, amt) { const a = f.dir * f.open * amt; if (f.axis === 'x') f.g.rotation.x = a; else f.g.rotation.z = a; }

// Tape (three strips, grown along their length)
const TW = 0.3, TAPE_PERIOD = 0.62, TOPY = H + 2 * TH + 0.003, SIDE_L = 0.42;
const tapeBase = makeTapeTex();
function tapeMat() {
  const t = tapeBase.clone(); t.needsUpdate = true;
  return new THREE.MeshStandardMaterial({ map: t, roughness: .34, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
}
const tapeTop = (() => {
  const g = new THREE.PlaneGeometry(1, TW); g.rotateX(-Math.PI / 2); g.translate(.5, 0, 0);
  const m = new THREE.Mesh(g, tapeMat()); m.position.set(-W / 2 - 0.003, TOPY, 0); m.receiveShadow = true; boxBody.add(m); return m;
})();
const tapeLeft = (() => {
  const g = new THREE.PlaneGeometry(1, TW); g.rotateZ(Math.PI / 2); g.rotateY(-Math.PI / 2); g.translate(0, .5, 0);
  const m = new THREE.Mesh(g, tapeMat()); m.position.set(-W / 2 - 0.003, TOPY - SIDE_L, 0); m.receiveShadow = true; boxBody.add(m); return m;
})();
const tapeRight = (() => {
  const g = new THREE.PlaneGeometry(1, TW); g.rotateZ(Math.PI / 2); g.rotateY(Math.PI / 2); g.translate(0, -.5, 0);
  const m = new THREE.Mesh(g, tapeMat()); m.position.set(W / 2 + 0.003, TOPY, 0); m.receiveShadow = true; boxBody.add(m); return m;
})();
function setStrip(m, len, pinEnd) {
  const L = Math.max(0.0001, len); m.visible = len > 0.002;
  if (m === tapeTop) m.scale.x = L; else m.scale.y = L;
  const t = m.material.map; t.repeat.x = L / TAPE_PERIOD; t.offset.x = pinEnd ? -t.repeat.x : 0;
}
function setTape(p) {
  const a = seg(p, 0, .2), b = seg(p, .15, .82), c = seg(p, .8, 1);
  setStrip(tapeLeft, SIDE_L * easeOut3(a), false);
  setStrip(tapeTop, (W + 0.006) * easeInOut(b), false);
  setStrip(tapeRight, SIDE_L * easeOut3(c), true);
}

// Shipping label on the front face
const LABEL_W = 0.98, LABEL_H = LABEL_W * 680 / 1024;
const labelMat = new THREE.MeshStandardMaterial({ map: makeLabelTex(), roughness: .55, transparent: true, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
const label = new THREE.Mesh(new THREE.PlaneGeometry(LABEL_W, LABEL_H), labelMat);
label.receiveShadow = true;
const LABEL_POS = new THREE.Vector3(0.36, 0.62, D / 2 + 0.004);
boxBody.add(label);
function setLabel(p) {
  label.visible = p > 0.001;
  const e = backOut(clamp(p), 1.4);
  label.position.set(LABEL_POS.x + (1 - e) * 0.25, LABEL_POS.y + (1 - e) * 0.35, LABEL_POS.z + (1 - clamp(p * 1.3)) * 0.9);
  label.rotation.set(0, 0, (1 - e) * 0.35 - 0.025);
  const s = 1 + (1 - clamp(p * 1.2)) * 0.2; label.scale.set(s, s, 1);
  labelMat.opacity = clamp(p * 3);
}

// "Exact." registration marks that snap to the box's front corners
const markMat = new THREE.MeshBasicMaterial({ color: 0xf2551d, transparent: true, opacity: 0, toneMapped: false, depthWrite: false });
const marks = new THREE.Group(); boxBody.add(marks);
const markCorners = [];
{
  const ARM = .3, T = .028, top = H + 2 * TH;
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    const g = new THREE.Group();
    const hz = new THREE.Mesh(new THREE.BoxGeometry(ARM, T, T), markMat); hz.position.set(-sx * ARM / 2, 0, 0);
    const vt = new THREE.Mesh(new THREE.BoxGeometry(T, ARM, T), markMat); vt.position.set(0, -sy * ARM / 2, 0);
    g.add(hz, vt); marks.add(g);
    markCorners.push({ g, sx, sy, cx: sx * W / 2, cy: sy > 0 ? top : 0 });
  }
}
function setMarks(p) {
  marks.visible = p > .002;
  const e = easeOut3(clamp(p));
  const off = lerp(.5, .12, e);
  markMat.opacity = clamp(p * 1.4);
  for (const c of markCorners) c.g.position.set(c.cx + c.sx * off, c.cy + c.sy * off, D / 2 + .02);
}

/* ---------- supply items (one material family) ---------- */
const M = {
  steel: new THREE.MeshStandardMaterial({ color: 0xc7ccd3, metalness: 1, roughness: .26 }),
  steelDark: new THREE.MeshStandardMaterial({ color: 0x8a9099, metalness: 1, roughness: .35 }),
  white: new THREE.MeshStandardMaterial({ color: 0xf3f3f0, roughness: .5 }),
  paper: new THREE.MeshStandardMaterial({ color: 0xfafaf7, roughness: .96 }),
  core: new THREE.MeshStandardMaterial({ color: 0xb98e5c, roughness: .9, side: THREE.DoubleSide }),
  orange: new THREE.MeshPhysicalMaterial({ color: 0xf2551d, roughness: .38, clearcoat: .7, clearcoatRoughness: .25 }),
  graphite: new THREE.MeshStandardMaterial({ color: 0x24272d, roughness: .45, metalness: .2 }),
  glass: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4e4, emissiveIntensity: .45, roughness: .35 }),
};
function mesh(geo, mat) { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; return m; }

function makeBolt() {
  const g = new THREE.Group();
  const head = mesh(new THREE.CylinderGeometry(.19, .19, .14, 6), M.steel); head.position.y = .07; g.add(head);
  const washer = mesh(new THREE.CylinderGeometry(.2, .2, .025, 32), M.steelDark); washer.position.y = -.012; g.add(washer);
  const pts = []; const len = .7, pitch = .038;
  pts.push(new THREE.Vector2(0, -0.025));
  pts.push(new THREE.Vector2(.085, -0.025));
  for (let y = -0.05; y > -len; y -= pitch) { pts.push(new THREE.Vector2(.096, y)); pts.push(new THREE.Vector2(.078, y - pitch / 2)); }
  pts.push(new THREE.Vector2(.07, -len - .02)); pts.push(new THREE.Vector2(0, -len - .03));
  const shaft = mesh(new THREE.LatheGeometry(pts.reverse(), 28), M.steel); g.add(shaft);
  return g;
}
function makeFuse() {
  const g = new THREE.Group();
  const body = mesh(new THREE.CylinderGeometry(.12, .12, .5, 32), M.white); g.add(body);
  const band = mesh(new THREE.CylinderGeometry(.123, .123, .16, 32), M.orange); g.add(band);
  for (const s of [-1, 1]) {
    const cap = mesh(new THREE.CylinderGeometry(.13, .13, .12, 32), M.steel); cap.position.y = s * .3; g.add(cap);
    const ring = mesh(new THREE.TorusGeometry(.13, .012, 8, 32), M.steelDark); ring.rotation.x = Math.PI / 2; ring.position.y = s * .245; g.add(ring);
  }
  return g;
}
function makeTowels() {
  const g = new THREE.Group();
  const ro = .33, ri = .1, h = .9;
  const prof = [new THREE.Vector2(ri, -h / 2), new THREE.Vector2(ro - .02, -h / 2), new THREE.Vector2(ro, -h / 2 + .02), new THREE.Vector2(ro, h / 2 - .02), new THREE.Vector2(ro - .02, h / 2), new THREE.Vector2(ri, h / 2)];
  const roll = mesh(new THREE.LatheGeometry(prof, 48), M.paper); g.add(roll);
  for (let i = -3; i <= 3; i++) { const r = mesh(new THREE.TorusGeometry(ro, .004, 4, 48), M.white); r.rotation.x = Math.PI / 2; r.position.y = i * .12; g.add(r); }
  const core = mesh(new THREE.CylinderGeometry(ri, ri, h + .006, 32, 1, true), M.core); g.add(core);
  return g;
}
function makeTube() {
  const g = new THREE.Group();
  const L = 1.5;
  const tube = mesh(new THREE.CylinderGeometry(.065, .065, L, 28), M.glass); g.add(tube);
  for (const s of [-1, 1]) {
    const cap = mesh(new THREE.CylinderGeometry(.072, .072, .09, 28), M.graphite); cap.position.y = s * (L / 2 + .03); g.add(cap);
    for (const px of [-.025, .025]) { const pin = mesh(new THREE.CylinderGeometry(.009, .009, .06, 8), M.steel); pin.position.set(px, s * (L / 2 + .1), 0); g.add(pin); }
  }
  return g;
}
function makePadlock() {
  const g = new THREE.Group();
  const body = mesh(new RoundedBoxGeometry(.42, .36, .17, 4, .05), M.orange); g.add(body);
  const shackle = mesh(new THREE.TorusGeometry(.125, .032, 14, 36, Math.PI), M.steel); shackle.position.y = .3; g.add(shackle);
  for (const s of [-1, 1]) { const leg = mesh(new THREE.CylinderGeometry(.032, .032, .14, 16), M.steel); leg.position.set(s * .125, .23, 0); g.add(leg); }
  const hole = mesh(new THREE.CylinderGeometry(.035, .035, .02, 20), M.graphite); hole.rotation.x = Math.PI / 2; hole.position.set(0, -.03, .086); g.add(hole);
  const slot = mesh(new THREE.BoxGeometry(.022, .06, .02), M.graphite); slot.position.set(0, -.08, .086); g.add(slot);
  return g;
}
function makeListPaper() {
  const w = .62, h = .82; const geo = new THREE.PlaneGeometry(w, h, 10, 12);
  const pos = geo.attributes.position; // gentle curl
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i); pos.setZ(i, Math.pow(x / w, 2) * .18 + Math.sin(y * 3) * .015); }
  geo.computeVertexNormals();
  const m = mesh(geo, new THREE.MeshStandardMaterial({ map: makePaperListTex(), roughness: .9, side: THREE.DoubleSide }));
  const g = new THREE.Group(); g.add(m); return g;
}

const itemsRoot = new THREE.Group(); boxBody.add(itemsRoot);
const E = (x, y, z) => new THREE.Euler(x, y, z);
  const items = [
  { obj: makeBolt(), rest: new THREE.Vector3(-.62, .23, -.05), rot: E(Math.PI / 2 - .1, .5, 0), spin: E(2.2, 1.3, .8) },
  { obj: makeFuse(), rest: new THREE.Vector3(-.12, .16, -.28), rot: E(0, .2, Math.PI / 2), spin: E(1.4, 2.2, .6) },
  { obj: makeTowels(), rest: new THREE.Vector3(.5, .49, -.14), rot: E(0, .3, 0), spin: E(.9, 1.2, -.7) },
  { obj: makeTube(), rest: new THREE.Vector3(-.06, .36, -.46), rot: E(.1, -.05, Math.PI / 2 - .12), spin: E(.3, .9, .5) },
  { obj: makePadlock(), rest: new THREE.Vector3(-.28, .4, .02), rot: E(-Math.PI / 2 + .55, .1, .45), spin: E(-2.4, 1.8, 1.2) },
];
items.forEach((it) => it.obj.scale.setScalar(1.12));
const paper = { obj: makeListPaper(), rest: new THREE.Vector3(.12, .92, .02), rot: E(-Math.PI / 2 + .12, 0, .35), spin: E(.6, 2.6, .4) };
[...items, paper].forEach((it) => { it.obj.visible = false; it.hop = 0; itemsRoot.add(it.obj); });

const DROP_H = 3.6;
function placeItem(it, q, now) {
  if (q <= 0) { it.obj.visible = false; return; }
  it.obj.visible = true;
  let y;
  const f = .68;
  if (q < f) { const k = q / f; y = DROP_H * (1 - k * k); }
  else { const b = (q - f) / (1 - f); y = Math.abs(Math.sin(b * Math.PI * 1.6)) * .16 * (1 - b) * (1 - b); }
  const e = easeOut3(clamp(q / .82));
  // hover hop
  let hop = 0;
  if (it.hop) { const k = (now - it.hop) / 520; if (k >= 1) it.hop = 0; else hop = Math.sin(k * Math.PI) * .3; }
  it.obj.position.set(it.rest.x + (1 - e) * .15, it.rest.y + y + hop, it.rest.z);
  it.obj.rotation.set(it.rot.x + (1 - e) * it.spin.x + hop * .8, it.rot.y + (1 - e) * it.spin.y, it.rot.z + (1 - e) * it.spin.z);
}

/* ---------- story state ---------- */
const CFG = story.cfg;
function stateAt(t) {
  const s = {};
  const L0 = clamp(t), L1 = clamp(t - 1), L2 = clamp(t - 2), L3 = clamp(t - 3);
  // flaps: open in supplies, close in step 2
  const openL = sstep(.03, .16, L1), openS = sstep(.08, .22, L1);
  const closeS = backOut(seg(L2, .36, .47), 1.2), closeL = backOut(seg(L2, .44, .57), 1.3);
  s.flapL = openL * (1 - closeL);
  s.flapS = openS * (1 - closeS);
  s.items = items.map((_, i) => seg(L1, CFG.dropStart + i * CFG.dropGap, CFG.dropStart + i * CFG.dropGap + CFG.dropDur));
  s.paper = seg(L2, .04, .26);
  s.tape = seg(L2, .57, .68);
  s.label = seg(L2, .72, .84);
  s.marks = seg(L3, .04, .22) * (1 - sstep(.3, .4, L3));
  s.ring = seg(L3, .455, .64);
  // rotation
  let yaw = -.62, pitch = .1;
  yaw = lerp(yaw, -.42, easeInOut(L0));
  pitch = lerp(pitch, .5, sstep(.0, .25, L1));
  yaw = lerp(yaw, -.2, easeInOut(seg(L2, 0, .33)));
  pitch = lerp(pitch, .12, sstep(.3, .5, L2));
  yaw = lerp(yaw, -.46, easeInOut(seg(L2, .5, .7)));
  yaw = lerp(yaw, -.22, easeInOut(seg(L2, .7, .92)));
  // exact: square up to the camera
  yaw = lerp(yaw, -.08, easeInOut(seg(L3, 0, .26)));
  pitch = lerp(pitch, .05, easeInOut(seg(L3, 0, .26)));
  s.yaw = yaw; s.pitch = pitch; s.roll = 0;
  // position/float
  s.y = .42; s.float = 1; s.x = 0; s.sx = 1; s.sy = 1; s.sz = 1;
  // arrives: a little hop + settle
  const arr = seg(L2, .86, 1);
  if (arr > 0 && arr < 1) { s.y += Math.sin(arr * Math.PI) * .32 * (1 - arr * .3); s.roll = Math.sin(arr * Math.PI * 2) * .04; }
  s.float = lerp(1, .25, sstep(0, .25, L3));
  // delivered: drop to the floor with a squash
  const land = seg(L3, .34, .6);
  if (land > 0) {
    const fall = clamp(land / .45);
    s.y = lerp(s.y, 0, fall * fall);
    s.float *= 1 - fall;
    if (land > .45) { const b = (land - .45) / .55; const sq = Math.sin(b * Math.PI) * (1 - b) * .09; s.sy = 1 - sq; s.sx = s.sz = 1 + sq * .6; }
  }
  // fast: whoosh off to the right
  const go = seg(L3, .66, .93);
  if (go > 0) {
    const e = easeIn3(go);
    s.x = e * 14;
    s.y += Math.sin(clamp(go * 3) * Math.PI) * .12 * (1 - go);
    s.roll = -.12 * sstep(0, .2, go);
    s.sx *= 1 + e * .25; s.sy *= 1 - e * .06;
    s.yaw = lerp(s.yaw, -.02, go);
  }
  s.gone = L3 > .95;
  // framing on screen
  const mobile = innerWidth <= 860;
  if (mobile) {
    s.fx = .5;
    s.fy = lerp(.74, .315, easeInOut(L0));
  } else {
    s.fx = lerp(.745, .7, easeInOut(L0));
    s.fx = lerp(s.fx, .72, easeInOut(seg(L3, 0, .3)));
    s.fy = lerp(.53, .5, easeInOut(L0));
  }
  s.zoom = lerp(1, .92, easeInOut(seg(L3, 0, .3)));
  if (STATIC()) { s.fx = mobile ? .5 : .745; s.fy = mobile ? .76 : .53; s.float = 0; }
  return s;
}

/* ---------- interaction ---------- */
const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
const fine = window.matchMedia('(pointer: fine)').matches;
window.addEventListener('pointermove', (e) => {
  pointer.tx = (e.clientX / innerWidth) * 2 - 1;
  pointer.ty = (e.clientY / innerHeight) * 2 - 1;
  if (fine) hoverCheck(e);
}, { passive: true });

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let hovering = false;
function hitBox(e) {
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  return raycaster.intersectObject(boxRoot, true).length > 0;
}
let hoverRaf = 0;
function hoverCheck(e) {
  if (hoverRaf || REDUCED || !story.stageOn) return;
  hoverRaf = requestAnimationFrame(() => {
    hoverRaf = 0;
    const tgt = e.target;
    const overUI = tgt && tgt.closest && tgt.closest('a, button, input, .chip, .panel, .nav');
    const h = !overUI && hitBox(e);
    if (h !== hovering) { hovering = h; document.body.style.cursor = h ? 'pointer' : ''; }
  });
}
const fx = { hop: 0, hopSpin: 0, bump: 0 };
function hop(spin = true) { const now = performance.now(); if (now - fx.hop > 700) { fx.hop = now; fx.hopSpin = spin ? 1 : 0; } wake(); }
window.addEventListener('pointerdown', (e) => {
  if (REDUCED || !story.stageOn) return;
  const tgt = e.target;
  if (tgt && tgt.closest && tgt.closest('a, button, input, .panel, .nav, .chip')) return;
  if (hitBox(e)) hop(true);
});
story.on && story.on((name, data) => {
  if (REDUCED) return;
  if (name === 'item') {
    const it = items[data]; const L1 = clamp(tS - 1);
    const landed = L1 >= CFG.dropStart + data * CFG.dropGap + CFG.dropDur;
    if (it && landed && sState && sState.flapL > .5) { if (!it.hop) it.hop = performance.now(); }
    else hop(false);
    wake();
  } else if (name === 'send') hop(true);
  else if (name === 'type') { fx.bump = performance.now(); wake(); }
});

/* ---------- sizing ---------- */
let vw = 0, vh = 0;
function resize(force) {
  const w = innerWidth, h = STATIC() ? Math.max(canvas.clientHeight, 1) : innerHeight;
  // ignore small height-only changes (mobile URL bar) to avoid thrash
  if (!force && w === vw && Math.abs(h - vh) < 140) return;
  vw = w; vh = h;
  renderer.setPixelRatio(dprFor(quality));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  const mobile = w <= 860;
  // shadows: lighter on phones
  const ms = mobile || quality >= 1 ? 512 : 1024;
  if (key.shadow.mapSize.x !== ms) { key.shadow.mapSize.set(ms, ms); if (key.shadow.map) { key.shadow.map.dispose(); key.shadow.map = null; } }
  wake(true);
}
window.addEventListener('resize', () => resize(false));

function frame(s) {
  const mobile = vw <= 860;
  // how big the box should read on screen
  const fovV = THREE.MathUtils.degToRad(camera.fov);
  const wantH = mobile ? 3.1 / 0.33 : 2.9 / 0.58;     // world height visible
  const distH = wantH / (2 * Math.tan(fovV / 2));
  const visW = mobile ? 3.3 / 0.84 : 0;                // on narrow screens keep width in check
  const distW = visW ? (visW / camera.aspect) / (2 * Math.tan(fovV / 2)) : 0;
  const dist = Math.max(distH, distW) * s.zoom;
  const elev = THREE.MathUtils.degToRad(20);
  const target = new THREE.Vector3(0, .42 + H / 2, 0);
  camera.position.set(0, target.y + Math.sin(elev) * dist, Math.cos(elev) * dist);
  camera.lookAt(target);
  camera.setViewOffset(vw, vh, (.5 - s.fx) * vw, (.5 - s.fy) * vh, vw, vh);
  camera.updateProjectionMatrix();
}

/* ---------- loop ---------- */
let tS = REDUCED ? 3.0 : story.t;
let sState = null;
let running = false, last = performance.now();
let lastRenderedGone = false;
let introStart = (!REDUCED && story.t < .3) ? performance.now() + 150 : 0;

/* ---------- quality governor ----------
   A slow GPU (or Chrome's SwiftShader fallback) can take hundreds of ms per frame. A render
   loop that busy starves the main thread: the compositor keeps scrolling while every
   scroll-driven thing in JS falls seconds behind. So: start low on software GL, watch the
   real frame interval, and step quality down (pixel ratio, then shadows + render-on-demand). */
function softwareGL() {
  try {
    const gl = renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(String(name));
  } catch (e) { return false; }
}
let quality = 0;          // 0 full, 1 lighter, 2 low: no shadow maps, no idle bob, render only on change
const perf = { ema: 16, n: 0 };
function dprFor(q) { const d = window.devicePixelRatio || 1; return q === 0 ? Math.min(d, 2) : q === 1 ? Math.min(d, 1.25) : Math.min(d, 1); }
function setQuality(q) {
  quality = q; perf.n = 0; perf.ema = 16;
  renderer.setPixelRatio(dprFor(q));
  renderer.setSize(vw, vh, false);
  if (q >= 1 && key.shadow.mapSize.x > 512) { key.shadow.mapSize.set(512, 512); if (key.shadow.map) { key.shadow.map.dispose(); key.shadow.map = null; } }
  if (q >= 2 && renderer.shadowMap.enabled) {
    renderer.shadowMap.enabled = false; key.castShadow = false;
    scene.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => { m.needsUpdate = true; }); });
  }
  root.dataset.gl = 'q' + q;
}
let lastPose = '';

function apply(s, now, dt) {
  setFlap(flapFront, s.flapL); setFlap(flapBack, s.flapL);
  setFlap(flapRight, s.flapS); setFlap(flapLeft, s.flapS);
  items.forEach((it, i) => placeItem(it, s.items[i], now));
  // hide contents once sealed (saves draw calls, avoids poke-through)
  const sealed = s.flapL < .02 && s.flapS < .02;
  itemsRoot.visible = !sealed;
  placeItem(paper, s.paper, now);
  setTape(s.tape);
  setLabel(s.label);
  setMarks(REDUCED ? 0 : s.marks);
  setRing(REDUCED ? 0 : s.ring);
  ring.position.x = ring2.position.x = 0;

  // pointer tilt (eased)
  const k = 1 - Math.exp(-dt * 4);
  pointer.x += (pointer.tx - pointer.x) * k; pointer.y += (pointer.ty - pointer.y) * k;
  const tiltAmt = REDUCED ? 0 : (1 - clamp((tS - 3.62) * 4));
  boxTilt.rotation.set(pointer.y * .16 * tiltAmt, pointer.x * .32 * tiltAmt, 0);

  // hop / bump
  let hy = 0, hs = 0, sq = 0;
  if (fx.hop) {
    const q = (now - fx.hop) / 900;
    if (q >= 1) fx.hop = 0; else { hy = Math.sin(q * Math.PI) * .55; hs = fx.hopSpin ? easeInOut(q) * Math.PI * 2 : Math.sin(q * Math.PI * 2) * .15; }
  }
  if (fx.bump) {
    const q = (now - fx.bump) / 320;
    if (q >= 1) fx.bump = 0; else sq = Math.sin(q * Math.PI) * .045;
  }
  // entrance: the box drops into the studio and settles
  let iy = 0, iyaw = 0;
  if (!REDUCED && introStart) {
    const q = (now - introStart) / 1300;
    if (q < 1) {
      const f = .55;
      if (q < f) { const k = q / f; iy = 3.2 * (1 - k * k); }
      else { const b2 = (q - f) / (1 - f); iy = Math.abs(Math.sin(b2 * Math.PI * 1.5)) * .22 * (1 - b2) * (1 - b2); }
      iyaw = (1 - easeOut3(clamp(q / .8))) * -1.1;
    } else introStart = 0;
  }
  hy += iy; hs += iyaw;
  const idle = REDUCED || quality >= 2 ? 0 : 1;
  const bob = Math.sin(now / 1000 * 1.3) * .07 * s.float * idle;
  boxRoot.position.set(s.x, s.y + bob + hy, 0);
  boxSpin.rotation.set(s.pitch + Math.sin(now / 1000 * .9) * .02 * s.float * idle, s.yaw + hs, s.roll + Math.sin(now / 1000 * 1.1) * .012 * s.float * idle);
  boxSpin.scale.set(s.sx * (1 + sq), s.sy * (1 - sq), s.sz * (1 + sq));

  // soft contact shadow follows the box, softer/wider when it floats higher
  const height = Math.max(0, s.y + bob + hy);
  const spread = 3.1 + height * 1.6;
  blob.position.x = s.x;
  blob.scale.set(spread * (1 + (s.sx - 1) * .5), spread * .82, 1);
  blobMat.opacity = clamp(.95 - height * .75, .25, 1) * (1 - clamp((s.x - 2) / 3));
  ground.material.opacity = .13 * (1 - story_dark());
  rim.intensity = 1.2 + story_dark() * 1.6;
  hemi.intensity = .9 - story_dark() * .25;
}
function story_dark() { return sstep(2.9, 3.02, tS); }

function renderOnce(now, dt) {
  sState = stateAt(tS);
  frame(sState);
  apply(sState, now, dt);
  renderer.render(scene, camera);
}

function active() {
  if (document.hidden) return false;
  if (STATIC()) return false;
  return story.stageOn;
}
function tick(now) {
  if (!active()) { running = false; return; }
  const interval = now - last; last = now;
  const dt = Math.min(.25, interval / 1000);   // real time, so catch-up never depends on frame rate
  const target = story.t;
  tS = NOSMOOTH ? target : tS + (target - tS) * (1 - Math.exp(-dt * 7));
  if (Math.abs(target - tS) < 1e-4) tS = target;
  const gone = tS > 3.955 && target > 3.955;
  // at low quality, only draw when something actually changed
  let need = !(gone && lastRenderedGone);
  if (need && quality >= 2) {
    const busy = fx.hop || fx.bump || introStart || items.some((it) => it.hop) ||
      Math.abs(pointer.tx - pointer.x) > .002 || Math.abs(pointer.ty - pointer.y) > .002;
    const pose = tS.toFixed(4) + '|' + vw + 'x' + vh;
    need = busy || pose !== lastPose;
    lastPose = pose;
  }
  if (need) {
    renderOnce(now, dt);
    lastRenderedGone = gone;
    // frame monitor (skip the first frames after a pause)
    if (interval < 1000) {
      perf.ema = perf.ema * .85 + interval * .15;
      if (++perf.n > 24 && perf.ema > 48 && quality < 2) setQuality(quality + 1);
    }
  }
  requestAnimationFrame(tick);
}
function wake(forceRender) {
  if (STATIC()) { tS = 3.0; renderOnce(performance.now(), .016); return; }
  if (forceRender && !running) renderOnce(performance.now(), .016);
  if (!running && active()) { running = true; last = performance.now(); requestAnimationFrame(tick); }
}
window.addEventListener('scroll', () => wake(false), { passive: true });
document.addEventListener('visibilitychange', () => wake(false));

resize(true);
if (softwareGL()) setQuality(2);
root.classList.add('webgl');
if (STATIC()) {
  tS = 3.0;
  // Finished state: closed, taped and labelled, no scrubbing.
  renderOnce(performance.now(), .016);
  window.addEventListener('resize', () => { resize(true); renderOnce(performance.now(), .016); });
} else {
  tS = story.t;
  wake(true);
}
// test hook for screenshots
window.__box = { renderer, scene, camera, get t() { return tS; }, get quality() { return quality; } };
