import * as THREE from './assets/three.module.min.js';

const TAU = Math.PI * 2;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const lerp = THREE.MathUtils.lerp;
const poseName = name => {
  const value = String(name || 'idle').toLowerCase().trim();
  return ({ 'standing together': 'idle', 'standing': 'idle', 'side hug': 'hug', 'funny pose': 'funny', 'heart pose': 'heart', 'penguin kiss': 'kiss', 'looking at the stars': 'lookstars', 'sitting together': 'sitting', 'relaxed': 'sitting' })[value] || value;
};

function material(color, roughness = .68, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: .03, ...extra });
}

function mesh(geometry, mat, parent, position = [0, 0, 0], scale = [1, 1, 1]) {
  const m = new THREE.Mesh(geometry, mat);
  m.position.set(...position);
  m.scale.set(...scale);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function sphere(parent, mat, position, scale, segments = 32) {
  return mesh(new THREE.SphereGeometry(1, segments, 24), mat, parent, position, scale);
}

function tube(parent, points, radius, mat, segments = 32) {
  return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), segments, radius, 8, false), mat, parent);
}

function glowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,246,218,1)');
  gradient.addColorStop(.14, 'rgba(255,233,176,.92)');
  gradient.addColorStop(.36, 'rgba(255,203,133,.2)');
  gradient.addColorStop(1, 'rgba(255,203,133,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function heartGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, -.38);
  shape.bezierCurveTo(-.12, -.21, -.52, .04, -.5, .28);
  shape.bezierCurveTo(-.48, .66, -.13, .68, 0, .4);
  shape.bezierCurveTo(.13, .68, .48, .66, .5, .28);
  shape.bezierCurveTo(.52, .04, .12, -.21, 0, -.38);
  return new THREE.ExtrudeGeometry(shape, { depth: .09, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: .035, bevelThickness: .025, curveSegments: 14 });
}

function scarf(parent, color) {
  const g = new THREE.Group();
  const mat = material(color, .94);
  const wrap = mesh(new THREE.TorusGeometry(.365, .091, 12, 52), mat, g, [0, 1.415, .005], [1.04, 1, .94]);
  wrap.rotation.x = Math.PI / 2;
  tube(g, [[.18, 1.43, .34], [.21, 1.29, .425], [.19, 1.07, .465], [.28, .97, .44]], .078, mat);
  tube(g, [[.01, 1.42, .36], [-.02, 1.32, .445], [.025, 1.18, .474]], .062, mat);
  const fringeMat = material(color, 1);
  for (let i = 0; i < 4; i++) {
    tube(g, [[.215 + i * .037, .984, .44], [.211 + i * .037, .924, .438]], .011, fringeMat, 5);
  }
  parent.add(g);
  return g;
}

function flower(parent, color, position = [0, 0, 0], scale = .14) {
  const group = new THREE.Group();
  const petals = material(color, .83);
  for (let i = 0; i < 6; i++) {
    const angle = i * TAU / 6;
    const p = sphere(group, petals, [Math.cos(angle) * .67, Math.sin(angle) * .67, 0], [.52, .33, .18], 20);
    p.rotation.z = angle;
  }
  sphere(group, material('#ffd891'), [0, 0, .13], [.31, .31, .15], 20);
  group.position.set(...position);
  group.scale.setScalar(scale);
  parent.add(group);
  return group;
}

class Penguin {
  constructor(female = false) {
    this.female = female;
    this.group = new THREE.Group();
    this.body = new THREE.Group();
    this.group.add(this.body);
    this.dark = material(female ? '#354052' : '#293748', .53);
    this.cream = material('#fff6df', .83);
    const orange = material('#edaa64', .67);
    const black = material('#101c2b', .25);
    this.torso = sphere(this.body, this.dark, [0, .925, 0], [.575, .81, .445]);
    this.belly = sphere(this.body, this.cream, [0, .94, .347], [.437, .599, .164]);
    this.head = new THREE.Group();
    this.head.position.set(0, 1.64, .015);
    this.body.add(this.head);
    sphere(this.head, this.dark, [0, .092, 0], [.474, .49, .425]);
    sphere(this.head, this.cream, [-.174, .077, .352], [.203, .274, .065]);
    sphere(this.head, this.cream, [.174, .077, .352], [.203, .274, .065]);
    sphere(this.head, this.cream, [0, -.111, .329], [.262, .196, .075]);
    this.eyes = [];
    for (const side of [-1, 1]) {
      const eye = new THREE.Group();
      eye.position.set(side * .18, .145, .415);
      sphere(eye, black, [0, 0, 0], [.062, .079, .042], 24);
      sphere(eye, material('#ffffff', .2), [-.013, .023, .034], [.014, .019, .009], 12);
      sphere(eye, material('#8ca5b7', .2), [.016, -.017, .035], [.007, .008, .005], 10);
      this.head.add(eye);
      this.eyes.push(eye);
      const cheekMat = material(female ? '#f1a5aa' : '#e8b99d', 1, { transparent: true, opacity: .56 });
      sphere(this.head, cheekMat, [side * .3, -.012, .394], [.06, .029, .009], 18);
    }
    sphere(this.head, orange, [0, -.084, .475], [.123, .065, .155], 24);
    sphere(this.head, material('#d68a48'), [0, -.119, .462], [.098, .025, .117], 24);
    sphere(this.head, black, [-.032, -.06, .592], [.007, .005, .007], 10);
    sphere(this.head, black, [.032, -.06, .592], [.007, .005, .007], 10);
    this.feet = [];
    this.wings = [];
    for (const side of [-1, 1]) {
      const foot = sphere(this.body, orange, [side * .205, .065, .123], [.21, .072, .25], 24);
      foot.rotation.y = -side * .11;
      this.feet.push(foot);
      const pivot = new THREE.Group();
      pivot.position.set(side * .46, 1.25, .005);
      const wing = sphere(pivot, this.dark, [side * .035, -.205, .026], [.14, .38, .11]);
      wing.rotation.z = -side * .14;
      pivot.rotation.z = side * .23;
      this.wings.push(pivot);
      this.body.add(pivot);
    }
    if (!female) this.scarf = scarf(this.body, '#dda06b');
    this.accessory = new THREE.Group();
    this.body.add(this.accessory);
    this.gift = new THREE.Group();
    this.gift.position.set(.64, 1.13, .26);
    this.gift.visible = false;
    const green = material('#7b977a');
    tube(this.gift, [[0, -.16, 0], [-.025, .07, 0], [0, .23, .035]], .012, green, 12);
    sphere(this.gift, green, [.054, .04, .008], [.09, .034, .018], 16).rotation.z = .65;
    flower(this.gift, '#d99fb6', [0, .24, .035], .115);
    this.body.add(this.gift);
    this.target = new THREE.Vector3(female ? .69 : -.65, 0, 0);
    this.group.position.copy(this.target);
    this.baseRotation = female ? -.2 : .18;
    this.group.rotation.y = this.baseRotation;
    this.phase = female ? 1.7 : 0;
    this.blinkAt = 2 + Math.random() * 3;
    this.blinkStart = -10;
    this.accessoryName = 'bow';
    this.accent = '#d597ae';
    if (female) this.setAccessory('bow', this.accent);
  }

  setAccessory(name = 'bow', color = '#d597ae') {
    this.accessoryName = name;
    this.accent = color;
    while (this.accessory.children.length) {
      const obj = this.accessory.children[0];
      obj.traverse(n => { if (n.geometry) n.geometry.dispose(); if (n.material) n.material.dispose(); });
      this.accessory.remove(obj);
    }
    const accent = material(color, .8);
    const type = String(name).toLowerCase();
    if (type.includes('scarf')) {
      scarf(this.accessory, color);
    } else if (type.includes('flower')) {
      const bloom = flower(this.accessory, color, [-.31, 2.053, .232], .17);
      bloom.rotation.z = -.18;
      bloom.rotation.y = -.3;
    } else if (type.includes('hat') || type.includes('beanie')) {
      const cap = mesh(new THREE.SphereGeometry(.455, 32, 20, 0, TAU, 0, Math.PI / 2), accent, this.accessory, [0, 1.99, 0], [1, .58, 1]);
      cap.rotation.z = -.07;
      const cuff = mesh(new THREE.TorusGeometry(.431, .065, 10, 44), accent, this.accessory, [0, 1.998, .005]);
      cuff.rotation.x = Math.PI / 2;
      sphere(this.accessory, this.cream, [-.031, 2.302, -.01], [.105, .105, .105], 20);
    } else if (type !== 'none' && type !== 'nothing') {
      const bow = new THREE.Group();
      bow.position.set(-.317, 2.066, .186);
      bow.rotation.z = -.28;
      bow.rotation.y = -.25;
      sphere(bow, accent, [-.09, .004, 0], [.121, .083, .054], 24).rotation.z = -.32;
      sphere(bow, accent, [.09, .004, 0], [.121, .083, .054], 24).rotation.z = .32;
      sphere(bow, accent, [0, .004, .025], [.044, .048, .046], 20);
      this.accessory.add(bow);
    }
  }

  animate(t, dt, reduced, state) {
    const delta = this.group.position.distanceTo(this.target);
    this.group.position.lerp(this.target, 1 - Math.exp(-dt * 5.5));
    const walking = !reduced && delta > .015;
    const tempo = t * 8 + this.phase;
    const bob = reduced ? 0 : Math.sin(t * 1.9 + this.phase) * .013;
    const sitting = state.scene === 'final' || state.reaction === 'sitting';
    this.body.position.y = bob + (sitting ? -.10 : 0) + (walking ? Math.abs(Math.sin(tempo)) * .046 : 0);
    this.torso.position.y = lerp(this.torso.position.y, sitting ? .85 : .925, 1 - Math.exp(-dt * 6));
    this.torso.scale.y = lerp(this.torso.scale.y, sitting ? .72 : .81, 1 - Math.exp(-dt * 6));
    this.belly.position.y = lerp(this.belly.position.y, sitting ? .82 : .94, 1 - Math.exp(-dt * 6));
    this.belly.scale.y = lerp(this.belly.scale.y, sitting ? .51 : .599, 1 - Math.exp(-dt * 6));
    this.body.rotation.z = walking ? Math.sin(tempo) * .045 : 0;
    this.head.rotation.set(0, 0, 0);
    const leftRest = sitting ? -.6 : -.23;
    const rightRest = sitting ? .6 : .23;
    let left = leftRest, right = rightRest;
    let face = this.baseRotation;
    this.gift.visible = state.reaction === 'flower' && !this.female;
    const active = state.reaction;
    if (walking) { left -= Math.sin(tempo) * .15; right -= Math.sin(tempo) * .15; }
    if (active === 'wave' && !this.female) {
      right = 2.3 + (reduced ? 0 : Math.sin(t * 7) * .27);
      this.head.rotation.z = -.075;
    } else if (active === 'happy' || active === 'stars') {
      left = -.58; right = .58;
      if (!reduced && !sitting) this.body.position.y += Math.max(0, Math.sin(t * 5.5 + this.phase)) * .095;
      this.head.rotation.z = Math.sin(t * 1.6 + this.phase) * .055;
    } else if (active === 'heart') {
      left = 1.12; right = -1.12;
      this.head.rotation.z = this.female ? .075 : -.075;
    } else if (active === 'lookstars') {
      this.head.rotation.x = -.32;
      this.head.rotation.y = this.female ? -.12 : .12;
      left = -.34; right = .34;
    } else if (active === 'sitting') {
      left = -.69; right = .69;
      this.head.rotation.z = this.female ? .055 : -.055;
    } else if (active === 'wait' || active === 'waiting' || active === 'shy' || active === 'thinking') {
      right = .48; left = -.39;
      face += reduced ? -.15 : Math.sin(t * .7) * .23;
      this.head.rotation.z = this.female ? .06 : -.065;
      this.head.rotation.x = .06;
    } else if (active === 'hug' || active === 'kiss') {
      left = -1.24; right = 1.24;
      face = (this.female ? -1 : 1) * (active === 'kiss' ? .7 : .36);
      this.head.rotation.y = active === 'kiss' ? (this.female ? -.12 : .12) : 0;
      this.head.rotation.z = this.female ? .12 : -.12;
      this.body.rotation.z = this.female ? .055 : -.055;
    } else if (active === 'funny' || active === 'dance') {
      left = -.91; right = .91;
      if (!reduced) {
        this.body.rotation.z = Math.sin(t * 6 + this.phase) * .17;
        this.body.position.y += Math.abs(Math.sin(t * 5 + this.phase)) * .12;
      }
    } else if (active === 'flower') {
      right = 1.08;
      this.head.rotation.z = -.075;
    } else if (active === 'sleep' || active === 'sleeping') {
      this.head.rotation.x = .14;
      this.head.rotation.z = -.09;
    }
    if (this.female && state.scene === 'welcome') face = -.3;
    this.group.rotation.y = lerp(this.group.rotation.y, face, 1 - Math.exp(-dt * 5));
    this.wings[0].rotation.z = lerp(this.wings[0].rotation.z, left, 1 - Math.exp(-dt * 9));
    this.wings[1].rotation.z = lerp(this.wings[1].rotation.z, right, 1 - Math.exp(-dt * 9));
    this.wings.forEach(wing => { wing.position.z = lerp(wing.position.z, active === 'heart' ? .39 : .005, 1 - Math.exp(-dt * 9)); });
    this.feet.forEach((foot, i) => {
      foot.position.y = .065 + (sitting ? .10 : 0) + (walking ? Math.max(0, Math.sin(tempo + i * Math.PI)) * .055 : 0);
      foot.position.z = lerp(foot.position.z, sitting ? .38 : .123, 1 - Math.exp(-dt * 6));
      foot.rotation.x = walking ? Math.sin(tempo + i * Math.PI) * .12 : 0;
    });
    if (!reduced && t > this.blinkAt) {
      this.blinkStart = t;
      this.blinkAt = t + 3.4 + Math.random() * 4;
    }
    const age = t - this.blinkStart;
    const blink = age >= 0 && age < .2 ? 1 - Math.sin(age / .2 * Math.PI) * .95 : 1;
    this.eyes.forEach(eye => { eye.scale.y = active === 'sleep' || active === 'sleeping' ? .07 : active === 'kiss' ? .24 : blink; });
  }
}

/** A small cinematic world, composited directly over the page's video. */
export class JourneyWorld {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.options = options;
    this.reducedMotion = !!options.reducedMotion;
    this.failed = false;
    this.disposed = false;
    this.sceneName = 'welcome';
    this.reaction = 'wave';
    this.reactionUntil = 3;
    this.pose = 'idle';
    this.distance = 100;
    this.companionVisible = false;
    this.elapsed = 0;
    this.lastTime = 0;
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'low-power' });
    } catch (error) {
      this.failed = true;
      const callback = options.onError || options.onUnavailable || options.onWebGLFail;
      if (callback) callback(error);
      canvas.dispatchEvent(new CustomEvent('world-unavailable', { detail: error }));
      return;
    }
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(36, 1, .1, 60);
    this.cameraTarget = new THREE.Vector3(0, .94, 0);
    this.desiredCameraTarget = this.cameraTarget.clone();
    this.camera.position.set(3.3, 2.65, 7.8);
    this.keyLight = new THREE.DirectionalLight('#ffdebc', 3.15);
    this.keyLight.position.set(-3.5, 6, 5);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.keyLight.shadow.camera.left = -4.5;
    this.keyLight.shadow.camera.right = 4.5;
    this.keyLight.shadow.camera.top = 4.5;
    this.keyLight.shadow.camera.bottom = -4.5;
    this.keyLight.shadow.camera.near = 1;
    this.keyLight.shadow.camera.far = 18;
    this.keyLight.shadow.bias = -.0005;
    this.keyLight.shadow.normalBias = .018;
    this.keyLight.shadow.radius = 4;
    this.scene.add(this.keyLight);
    this.scene.add(new THREE.HemisphereLight('#dce7f2', '#778391', 2.1));
    const rim = new THREE.DirectionalLight('#aecfe6', 2.0);
    rim.position.set(2, 3, -5);
    this.scene.add(rim);
    this.world = new THREE.Group();
    this.scene.add(this.world);
    this.buildIsland();
    this.male = new Penguin(false);
    this.female = new Penguin(true);
    this.world.add(this.male.group, this.female.group);
    this.female.group.visible = false;
    this.buildDoor();
    this.buildTable();
    this.buildParticles();
    this.resize = this.resize.bind(this);
    this.frame = this.frame.bind(this);
    this.observer = new ResizeObserver(this.resize);
    this.observer.observe(canvas.parentElement || canvas);
    window.addEventListener('resize', this.resize, { passive: true });
    this.resize();
    this.setScene('welcome');
    this.frameId = requestAnimationFrame(this.frame);
  }

  buildIsland() {
    this.island = new THREE.Group();
    this.world.add(this.island);
    const ice = material('#b7cad4', .88);
    const snow = material('#f5f1e8', .98);
    mesh(new THREE.CylinderGeometry(2.9, 2.53, .28, 64), ice, this.island, [0, -.18, 0], [1, 1, .72]);
    const top = sphere(this.island, snow, [0, -.055, 0], [2.96, .11, 2.12], 64);
    top.receiveShadow = true;
    top.castShadow = false;
    const rim = mesh(new THREE.TorusGeometry(2.81, .085, 12, 96), snow, this.island, [0, -.062, 0], [1, .735, .7]);
    rim.rotation.x = Math.PI / 2;
    for (let i = 0; i < 12; i++) {
      const angle = i * TAU / 12;
      sphere(this.island, snow, [Math.cos(angle) * 2.73, -.064, Math.sin(angle) * 1.93], [.18 + (i % 3) * .04, .075, .17], 18);
    }
    this.lanterns = [];
    this.glowMap = glowTexture();
    this.addLantern(-2.04, .93, 1);
    this.addLantern(2.12, -.62, .82);
    const pebbleMat = material('#d8c7c7', .9);
    for (let i = 0; i < 6; i++) {
      const x = -.74 + i * .25;
      const stone = sphere(this.island, pebbleMat, [x, .057, 1.11 + Math.sin(i) * .07], [.086, .024, .065], 16);
      stone.rotation.y = i * .7;
    }
    const gold = material('#d9bfa0', .75);
    const littleHeart = mesh(heartGeometry(), gold, this.island, [1.48, .08, .98], [.125, .125, .125]);
    littleHeart.rotation.x = -Math.PI / 2;
    littleHeart.rotation.z = -.3;
  }

  addLantern(x, z, scale) {
    const g = new THREE.Group();
    g.position.set(x, .035, z);
    g.scale.setScalar(scale);
    const bronze = material('#7a6359', .46, { metalness: .54 });
    mesh(new THREE.CylinderGeometry(.135, .165, .075, 24), bronze, g, [0, .04, 0]);
    mesh(new THREE.CylinderGeometry(.135, .145, .05, 24), bronze, g, [0, .4, 0]);
    mesh(new THREE.ConeGeometry(.2, .11, 4), bronze, g, [0, .478, 0]).rotation.y = Math.PI / 4;
    const glass = material('#ffd19a', .22, { transparent: true, opacity: .24, emissive: '#eac286', emissiveIntensity: .35, side: THREE.DoubleSide });
    mesh(new THREE.CylinderGeometry(.125, .125, .3, 20, 1, true), glass, g, [0, .228, 0]);
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + Math.PI / 4;
      mesh(new THREE.CylinderGeometry(.011, .011, .31, 8), bronze, g, [Math.cos(a) * .126, .235, Math.sin(a) * .126]);
    }
    const handle = mesh(new THREE.TorusGeometry(.064, .009, 6, 20, Math.PI), bronze, g, [0, .552, 0]);
    handle.rotation.z = 0;
    const flame = sphere(g, material('#ffe4ac', .3, { emissive: '#ffbb60', emissiveIntensity: 2.3 }), [0, .212, 0], [.033, .073, .033], 16);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowMap, transparent: true, opacity: .47, depthWrite: false, blending: THREE.AdditiveBlending }));
    sprite.position.y = .24;
    sprite.scale.set(.79, .79, 1);
    g.add(sprite);
    const light = new THREE.PointLight('#ffc47f', 1.7, 3.5, 2);
    light.position.y = .3;
    g.add(light);
    this.island.add(g);
    this.lanterns.push({ group: g, flame, light });
  }

  buildDoor() {
    this.door = new THREE.Group();
    this.door.position.set(1.67, -.005, -.88);
    this.door.rotation.y = -.23;
    const frameMat = material('#ead2bf', .84, { emissive: '#a9806a', emissiveIntensity: .12 });
    const archPoints = [[-.62, 0, 0], [-.62, .65, 0], [-.62, 1.45, 0], [-.55, 1.85, 0], [-.3, 2.12, 0], [0, 2.21, 0], [.3, 2.12, 0], [.55, 1.85, 0], [.62, 1.45, 0], [.62, .65, 0], [.62, 0, 0]];
    tube(this.door, archPoints, .061, frameMat, 64);
    tube(this.door, archPoints.map(p => [p[0] * .96, p[1] * .99, .044]), .012, material('#ffe3b9', .6, { emissive: '#ffe3b9', emissiveIntensity: 1.3 }), 64);
    mesh(new THREE.BoxGeometry(1.44, .058, .51), frameMat, this.door, [0, .025, 0]);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowMap, transparent: true, opacity: .16, depthWrite: false, blending: THREE.AdditiveBlending, color: '#efc4c2' }));
    sprite.position.set(0, 1.2, -.035);
    sprite.scale.set(2.2, 3.0, 1);
    this.door.add(sprite);
    const leafMat = material('#7c9a85', .91);
    for (let i = 0; i < 9; i++) {
      const side = i % 2 ? 1 : -1;
      const y = .25 + i * .2;
      const x = side * (.66 - Math.max(0, y - 1.5) * .4);
      const leaf = sphere(this.door, leafMat, [x, y, .02], [.088, .037, .028], 14);
      leaf.rotation.z = side * .7;
      if (i % 3 === 0) flower(this.door, '#e5b5bc', [x + side * .015, y + .09, .048], .065);
    }
    this.door.visible = false;
    this.world.add(this.door);
  }

  buildTable() {
    this.table = new THREE.Group();
    this.table.position.set(-1.65, .005, .27);
    const wood = material('#a28877', .81);
    mesh(new THREE.CylinderGeometry(.45, .45, .065, 40), wood, this.table, [0, .73, 0]);
    for (let i = 0; i < 3; i++) {
      const angle = i * TAU / 3;
      const leg = mesh(new THREE.CylinderGeometry(.027, .037, .72, 10), wood, this.table, [Math.cos(angle) * .22, .355, Math.sin(angle) * .22]);
      leg.rotation.z = -Math.cos(angle) * .09;
      leg.rotation.x = Math.sin(angle) * .09;
    }
    const letter = mesh(new THREE.BoxGeometry(.44, .008, .31), material('#fff2d5', .98), this.table, [-.035, .769, .02]);
    letter.rotation.y = -.22;
    const seal = mesh(heartGeometry(), material('#bb7587', .8), this.table, [.06, .788, .015], [.043, .043, .03]);
    seal.rotation.x = -Math.PI / 2;
    this.table.visible = false;
    this.world.add(this.table);
  }

  buildParticles() {
    const count = 110;
    this.snowPositions = new Float32Array(count * 3);
    this.snowSeeds = [];
    for (let i = 0; i < count; i++) {
      const seed = { x: (Math.random() - .5) * 9, y: Math.random() * 6, z: (Math.random() - .5) * 5, speed: .06 + Math.random() * .11, phase: Math.random() * TAU };
      this.snowSeeds.push(seed);
      this.snowPositions.set([seed.x, seed.y, seed.z], i * 3);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.snowPositions, 3));
    this.snow = new THREE.Points(geometry, new THREE.PointsMaterial({ color: '#fff6e7', map: this.glowMap, transparent: true, opacity: .53, size: .063, depthWrite: false, sizeAttenuation: true }));
    this.scene.add(this.snow);
    this.hearts = [];
    const heartGeo = heartGeometry();
    const heartMat = material('#e9a3b3', .42, { emissive: '#c47a91', emissiveIntensity: .17 });
    for (let i = 0; i < 14; i++) {
      const heart = mesh(heartGeo, heartMat, this.world, [0, 0, 0], [.095, .095, .095]);
      heart.visible = false;
      this.hearts.push({ mesh: heart, seed: i / 14, phase: i * 2.4 });
    }
    this.stars = [];
    for (let i = 0; i < 22; i++) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowMap, transparent: true, opacity: .62, depthWrite: false, blending: THREE.AdditiveBlending }));
      sprite.position.set(Math.sin(i * 2.4) * (2 + (i % 3) * .38), .5 + (i % 7) * .43, -1.5 + Math.cos(i) * .8);
      sprite.scale.setScalar(.10 + (i % 3) * .045);
      this.world.add(sprite);
      this.stars.push(sprite);
    }
  }

  resize() {
    if (this.failed || this.disposed) return;
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.wide = width / height > 1.55;
    this.mobile = width < 620;
    this.updateCamera();
  }

  updateCamera() {
    const aspect = this.camera.aspect;
    this.cameraDistance = aspect < .72 ? 10.35 : aspect < 1.05 ? 9.0 : 8.15;
    if (this.sceneName === 'selfie' || this.sceneName === 'final') this.cameraDistance *= .89;
    if (this.sceneName === 'letter') this.cameraDistance *= 1.03;
    this.desiredCameraTarget.set(this.wide ? -1.16 : 0, this.sceneName === 'selfie' ? 1.13 : .99, 0);
  }

  setScene(name = 'welcome') {
    if (this.failed || this.disposed) return;
    this.sceneName = name;
    this.door.visible = name === 'customize' || name === 'journey';
    this.table.visible = name === 'letter';
    this.door.scale.setScalar(name === 'journey' ? .82 : 1);
    this.keyLight.color.set(name === 'memory' || name === 'final' ? '#ffd7ad' : name === 'distance' ? '#e1e6f6' : '#ffdfc1');
    this.keyLight.intensity = name === 'distance' ? 2.8 : 3.15;
    if (name === 'welcome') {
      this.setCompanion(false);
      this.male.target.set(-.04, 0, .23);
      this.react('wave');
    } else {
      this.setCompanion(true);
      this.male.target.set(-.61, 0, .13);
      this.female.target.set(.69, 0, .04);
      if (name === 'distance') this.setDistance(this.distance);
      if (name === 'final' || name === 'selfie' || name === 'memory') this.react(name === 'final' ? 'heart' : 'happy');
      else { this.reaction = 'idle'; this.pose = 'idle'; }
    }
    this.updateCamera();
  }

  setCompanion(visible = true) {
    if (this.failed || this.disposed) return;
    this.companionVisible = !!visible;
    this.female.group.visible = !!visible;
    this.male.target.x = visible ? -.61 : -.04;
    if (visible) this.female.target.set(.69, 0, .04);
  }

  setAccessory(name, color = '#d597ae') {
    if (this.failed || this.disposed) return;
    this.female.setAccessory(name, color);
    this.react('happy');
  }

  setDistance(value) {
    if (this.failed || this.disposed) return;
    this.distance = clamp(Number(value) || 0, 0, 100);
    this.setCompanion(true);
    const apart = 1 - this.distance / 100;
    this.male.target.set(-.61 - apart * .39, 0, .13);
    this.female.target.set(.69 + apart * 1.57, 0, -.03 - apart * .79);
    if (this.distance > 94) { this.reaction = 'happy'; this.reactionUntil = this.elapsed + 1.8; }
    else if (this.distance < 25) { this.reaction = 'wait'; this.reactionUntil = this.elapsed + 3600; }
    else { this.reaction = 'idle'; }
  }

  react(name = 'happy') {
    if (this.failed || this.disposed) return;
    this.reaction = poseName(name);
    this.reactionStart = this.elapsed;
    this.reactionUntil = this.elapsed + (this.reaction === 'wait' || this.reaction === 'waiting' ? 12 : 4.5);
    if (this.reaction === 'hug' || this.reaction === 'kiss') {
      this.setCompanion(true);
      const x = this.reaction === 'kiss' ? .39 : .44;
      this.male.target.set(-x, 0, .17);
      this.female.target.set(x, 0, .15);
    }
  }

  walkTo(x = 0) {
    if (this.failed || this.disposed) return;
    const target = clamp(Number(x) || 0, -1, 1) * 1.23;
    this.male.target.x = target - (this.companionVisible ? .5 : 0);
    this.male.target.z = .14;
    if (this.companionVisible) {
      this.female.target.x = target + .67;
      this.female.target.z = .06;
    }
    this.reaction = 'idle';
  }

  setPose(name = 'idle') {
    if (this.failed || this.disposed) return;
    this.pose = poseName(name);
    this.reaction = this.pose;
    this.reactionStart = this.elapsed;
    this.reactionUntil = Infinity;
    if (this.companionVisible) {
      const affectionate = this.pose === 'hug' || this.pose === 'kiss';
      const near = this.pose === 'kiss' ? .39 : .44;
      this.male.target.set(affectionate ? -near : -.61, 0, .13);
      this.female.target.set(affectionate ? near : .69, 0, .04);
    }
  }

  setReducedMotion(value) { this.reducedMotion = !!value; }

  frame(now) {
    if (this.disposed || this.failed) return;
    const dt = this.lastTime ? Math.min((now - this.lastTime) / 1000, .05) : .016;
    this.lastTime = now;
    this.elapsed += dt;
    const t = this.elapsed;
    if (this.reactionUntil < t) this.reaction = this.pose === 'idle' ? 'idle' : this.pose;
    const state = { reaction: this.reaction, scene: this.sceneName };
    this.male.animate(t, dt, this.reducedMotion, state);
    if (this.female.group.visible) this.female.animate(t, dt, this.reducedMotion, state);
    this.cameraTarget.lerp(this.desiredCameraTarget, 1 - Math.exp(-dt * 3));
    const sway = this.reducedMotion ? 0 : Math.sin(t * .12) * .055;
    const desiredPosition = new THREE.Vector3(this.cameraTarget.x + this.cameraDistance * .31 + sway, 2.8, this.cameraDistance * .92);
    this.camera.position.lerp(desiredPosition, 1 - Math.exp(-dt * 3));
    this.camera.lookAt(this.cameraTarget);
    const festive = ['heart', 'kiss', 'hug', 'happy', 'stars', 'lookstars'].includes(this.reaction);
    this.hearts.forEach(({ mesh: heart, seed, phase }) => {
      heart.visible = festive && (this.reaction !== 'happy' || seed < .36);
      if (!heart.visible) return;
      const rise = this.reducedMotion ? seed : (t * .19 + seed) % 1;
      heart.position.set(Math.sin(phase) * (1.35 + seed * .6), 1.28 + rise * 2, Math.cos(phase) * .75 -.1);
      heart.rotation.set(.08, this.reducedMotion ? phase : t * .4 + phase, Math.sin(phase + t) * .16);
      const size = (.06 + seed * .038) * (this.reducedMotion ? 1 : Math.sin(rise * Math.PI));
      heart.scale.setScalar(size);
    });
    if (!this.reducedMotion) {
      this.snowSeeds.forEach((seed, i) => {
        const speed = this.reaction === 'snow' ? seed.speed * 2.5 : seed.speed;
        this.snowPositions[i * 3] = seed.x + Math.sin(t * .3 + seed.phase) * .23;
        this.snowPositions[i * 3 + 1] = (seed.y - t * speed % 6 + 6) % 6;
      });
      this.snow.geometry.attributes.position.needsUpdate = true;
    }
    this.snow.material.opacity = this.reaction === 'snow' ? .9 : .39;
    this.lanterns.forEach((lantern, i) => {
      const flicker = this.reducedMotion ? 1 : 1 + Math.sin(t * 6.3 + i) * .04 + Math.sin(t * 9.7) * .03;
      lantern.flame.scale.y = .073 * flicker;
      lantern.light.intensity = 1.7 * flicker;
    });
    this.stars.forEach((star, i) => {
      star.material.opacity = (this.reaction === 'stars' || this.reaction === 'lookstars' ? .95 : .45) * (this.reducedMotion ? .7 : .65 + Math.sin(t * .8 + i * 2.1) * .35);
    });
    this.renderer.render(this.scene, this.camera);
    this.frameId = requestAnimationFrame(this.frame);
  }

  capture() {
    if (this.failed || this.disposed) return null;
    this.renderer.render(this.scene, this.camera);
    return this.canvas.toDataURL('image/png');
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    this.observer?.disconnect();
    window.removeEventListener('resize', this.resize);
    if (!this.renderer) return;
    const geometries = new Set(), materials = new Set(), textures = new Set();
    this.scene.traverse(obj => {
      if (obj.geometry) geometries.add(obj.geometry);
      if (obj.material) (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach(mat => {
        materials.add(mat);
        for (const value of Object.values(mat)) if (value?.isTexture) textures.add(value);
      });
    });
    geometries.forEach(g => g.dispose());
    materials.forEach(m => m.dispose());
    textures.forEach(t => t.dispose());
    this.renderer.dispose();
  }
}

export default JourneyWorld;
