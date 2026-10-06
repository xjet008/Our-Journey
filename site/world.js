import * as THREE from './assets/three.module.min.js';
import {PartnerSpacing,smooth} from './proximity.js';
import {createFlipper, bendFlipper, moodPose, moodAliases} from './character-motion.js';
import {RomanticWorld, places} from './environments.js';
import {GuidedCamera, AdaptiveQuality} from './cinematic-camera.js';
import {bench} from './world-layout.js';
import {WalkingLeg, PenguinStride} from './walking.js';

const TAU = Math.PI * 2;
const FLOOR_LIMIT = 1.24;
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

function sphere(parent, mat, position, scale, segments = 24) {
  return mesh(new THREE.SphereGeometry(1, segments, Math.min(segments,16)), mat, parent, position, scale);
}

function tube(parent, points, radius, mat, segments = 24) {
  return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), segments, radius, 8, false), mat, parent);
}

function glowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,242,245,1)');
  gradient.addColorStop(.14, 'rgba(248,218,229,.92)');
  gradient.addColorStop(.36, 'rgba(238,158,181,.2)');
  gradient.addColorStop(1, 'rgba(238,158,181,0)');
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

function rose(parent, color, position, scale = .15) {
  const group = new THREE.Group();
  const petalMat = material(color, .55);
  const innerMat = material(new THREE.Color(color).lerp(new THREE.Color('#f8dae5'), .3), .5);
  for (let ring = 0; ring < 3; ring++) {
    const count = ring === 2 ? 3 : 5;
    const radius = .53 - ring * .17;
    for (let i = 0; i < count; i++) {
      const angle = i * TAU / count + ring * .7;
      const petal = sphere(group, ring ? innerMat : petalMat,
        [Math.cos(angle) * radius, Math.sin(angle) * radius, ring * .13],
        [.39 - ring * .05, .27 - ring * .035, .15], 20);
      petal.rotation.set(.1 * Math.sin(angle), -.16 * Math.cos(angle), angle + .25);
    }
  }
  sphere(group, innerMat, [0, 0, .36], [.17, .17, .12], 20);
  const leafMat = material('#a4b19c', .8);
  const leaf = sphere(group, leafMat, [.5, -.48, -.03], [.43, .17, .06], 20);
  leaf.rotation.z = -.65;
  group.position.set(...position);
  group.scale.setScalar(scale);
  parent.add(group);
  return group;
}

function hairBow(parent, accent, pearl, position = [-.317, 2.066, .186]) {
  const bow = new THREE.Group();
  bow.position.set(...position);
  bow.rotation.set(0, -.25, -.28);
  sphere(bow, accent, [-.09, .004, 0], [.121, .083, .054], 24).rotation.z = -.32;
  sphere(bow, accent, [.09, .004, 0], [.121, .083, .054], 24).rotation.z = .32;
  sphere(bow, pearl, [0, .004, .044], [.036, .038, .027], 20);
  parent.add(bow);
  return bow;
}

function silkTail(parent, mat, points, width = .047) {
  const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
  const vertices = [], indices = [];
  const segments = 24;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const center = curve.getPoint(t);
    const tangent = curve.getTangent(t);
    const edge = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize();
    const halfWidth = width * (1 - t * .22);
    vertices.push(center.x - edge.x * halfWidth, center.y - edge.y * halfWidth, center.z - edge.z * halfWidth);
    vertices.push(center.x + edge.x * halfWidth, center.y + edge.y * halfWidth, center.z + edge.z * halfWidth);
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return mesh(geometry, mat, parent);
}

class Penguin {
  constructor(female = false) {
    this.female = female;
    this.group = new THREE.Group();
    this.body = new THREE.Group();
    this.group.add(this.body);
    this.dark = material(female ? '#cf7da3' : '#293748', .53);
    this.cream = material('#fff5e9', .83);
    const orange = material(female ? '#e9ac99' : '#e5ac8d', .67);
    const black = material('#101c2b', .25);
    this.torso = sphere(this.body, this.dark, [0, .925, 0], [female ? .555 : .575, female ? .79 : .81, .445]);
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
      sphere(eye, black, [0, 0, 0], [female ? .073 : .062, female ? .09 : .079, .042], 24);
      sphere(eye, material('#ffffff', .2), [-.013, .023, .034], [female ? .017 : .014, female ? .022 : .019, .009], 12);
      sphere(eye, material('#cfacd9', .2), [.016, -.017, .035], [.007, .008, .005], 10);
      if (female) {
        for (let lash = 0; lash < 3; lash++) {
          const x = side * (.034 + lash * .015);
          const y = .078 - lash * .006;
          tube(eye, [[x, y, .017], [x + side * .011, y + .017, .021], [x + side * .019, y + .027 - lash * .003, .025]], .006, black, 8);
        }
      }
      this.head.add(eye);
      this.eyes.push(eye);
      const cheekMat = material(female ? '#ee9eb5' : '#f1c6ad', 1, { transparent: true, opacity: female ? .68 : .38 });
      sphere(this.head, cheekMat, [side * .3, -.012, .394], [female ? .085 : .06, female ? .04 : .029, .009], 18);
    }
    sphere(this.head, orange, [0, -.084, .475], [female ? .112 : .123, female ? .059 : .065, female ? .143 : .155], 24);
    sphere(this.head, material(female ? '#cb877f' : '#c58b69'), [0, -.119, .462], [.098, .025, .117], 24);
    sphere(this.head, black, [-.032, -.06, .592], [.007, .005, .007], 10);
    sphere(this.head, black, [.032, -.06, .592], [.007, .005, .007], 10);
    this.feet = [];
    this.legs = [];
    this.wings = [];
    for (const side of [-1, 1]) {
      const foot = sphere(this.body, orange, [side * .205, .065, .123], [.21, .072, .25], 24);
      foot.rotation.y = -side * .11;
      this.group.add(foot); // The planted feet do not inherit torso bob or roll.
      this.feet.push(foot);
      const leg=mesh(new THREE.CylinderGeometry(.048,.06,1,10),orange,this.group);
      leg.visible=false;
      this.legs.push(leg);
      const pivot = new THREE.Group();
      pivot.position.set(side * .50, 1.25, .035);
      const wing = createFlipper(this.dark,side);
      pivot.add(wing);
      pivot.rotation.z = side * .23;
      this.wings.push(pivot);
      this.body.add(pivot);
    }
    if (!female) {
      const brooch = mesh(heartGeometry(), material('#ee9eb5', .35, { metalness: .16 }), this.body, [-.285, 1.235, .439], [.085, .085, .085]);
      brooch.rotation.z = -.2;
    }
    this.accessory = new THREE.Group();
    this.body.add(this.accessory);
    this.gift = new THREE.Group();
    this.gift.position.set(.64, 1.13, .26);
    this.gift.visible = false;
    const green = material('#7b977a');
    tube(this.gift, [[0, -.16, 0], [-.025, .07, 0], [0, .23, .035]], .012, green, 12);
    sphere(this.gift, green, [.054, .04, .008], [.09, .034, .018], 16).rotation.z = .65;
    rose(this.gift, '#ee9eb5', [0, .24, .035], .115);
    this.body.add(this.gift);
    this.target = new THREE.Vector3(female ? .69 : -.65, 0, 0);
    this.group.position.copy(this.target);
    this.baseRotation = female ? -.2 : .18;
    this.group.rotation.y = this.baseRotation;
    this.phase = female ? 1.7 : 0;
    this.stride=new PenguinStride(female?.08:0);
    this.blinkAt = 2 + Math.random() * 3;
    this.blinkStart = -10;
    this.accessoryName = 'bow';
    this.accent = '#ee9eb5';
    if (female) this.setAccessory('bow', this.accent);
  }

  setAccessory(name = 'bow', color = '#ee9eb5') {
    if(this.accessoryName===name && this.accent===color && this.accessory.children.length) return;
    this.accessoryName = name;
    this.accent = color;
    const geometries = new Set(), materials = new Set();
    this.accessory.traverse(obj => {
      if (obj.geometry) geometries.add(obj.geometry);
      if (obj.material) (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach(mat => materials.add(mat));
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(mat => { if (mat !== this.dark && mat !== this.cream) mat.dispose(); });
    this.accessory.clear();
    const accent = material(color, .48);
    const pearl = material('#f8dae5', .24, { metalness: .12 });
    const type = String(name).toLowerCase();
    if (type.includes('flower')) {
      const bloom = rose(this.accessory, color, [-.31, 2.053, .232], .17);
      bloom.rotation.z = -.18;
      bloom.rotation.y = -.3;
    } else if (type === 'tiara') {
      const gold = material('#efccb6', .3, { metalness: .65 });
      tube(this.accessory, [[-.32, 2.025, .235], [-.17, 2.065, .326], [0, 2.079, .351], [.17, 2.065, .326], [.32, 2.025, .235]], .012, gold, 32);
      for (let i = -1; i <= 1; i++) {
        const x = i * .15;
        const top = i === 0 ? 2.266 : 2.195;
        tube(this.accessory, [[x - .072, 2.066, .313], [x - .045, top - .03, .307], [x, top, .307], [x + .045, top - .03, .307], [x + .072, 2.066, .313]], .008, gold, 20);
        const jewel = mesh(new THREE.OctahedronGeometry(i === 0 ? .037 : .025), accent, this.accessory, [x, top - .024, .323]);
        jewel.scale.set(.83, 1.2, .5);
      }
      for (let i = 0; i < 9; i++) sphere(this.accessory, pearl, [-.28 + i * .07, 2.07 - Math.abs(i - 4) * .005, .326 - Math.abs(i - 4) * .014], [.016, .016, .016], 14);
    } else if (type === 'pearls') {
      // Follow the outside of the chest instead of embedding beads in it.
      const chain = material('#c5a46b', .38, {metalness:.5});
      const points = [];
      for (let i = 0; i < 15; i++) {
        const u = -1 + i / 7;
        const x = u * .36;
        const y = 1.40 - (1-u*u) * .16;
        const z = .30 + Math.sqrt(1-u*u) * .25;
        points.push([x,y,z]);
        sphere(this.accessory, pearl, [x,y,z], [.043,.043,.043], 20);
      }
      tube(this.accessory, points, .009, chain, 32);
      const pendant = mesh(heartGeometry(), accent, this.accessory, [0, 1.15, .576], [.092,.092,.045]);
      sphere(this.accessory, pearl, [-.026,1.183,.598], [.012,.012,.007], 12);
      pendant.rotation.z = -.06;
    } else if (type === 'ribbon') {
      hairBow(this.accessory, accent, pearl, [-.35, 2.04, .194]);
      const silk = material(color, .38, { side: THREE.DoubleSide });
      silkTail(this.accessory, silk, [[-.37, 2.02, .20], [-.50, 1.86, .23], [-.52, 1.68, .21], [-.62, 1.51, .25]], .043);
      silkTail(this.accessory, silk, [[-.31, 2.02, .19], [-.41, 1.83, .27], [-.44, 1.65, .30], [-.39, 1.53, .35]], .034);
    } else if (type === 'heart') {
      const clip = new THREE.Group();
      clip.position.set(-.347, 2.04, .229);
      clip.rotation.set(-.06, -.24, -.28);
      mesh(heartGeometry(), accent, clip, [0, 0, 0], [.19, .19, .14]);
      sphere(clip, pearl, [.032, .066, .028], [.018, .018, .012], 14);
      this.accessory.add(clip);
    } else if (type !== 'none' && type !== 'nothing') {
      hairBow(this.accessory, accent, pearl);
    }
    const activeMaterials = new Set();
    this.accessory.traverse(obj => { if (obj.material) activeMaterials.add(obj.material); });
    if (!activeMaterials.has(accent)) accent.dispose();
    if (!activeMaterials.has(pearl)) pearl.dispose();
  }

  animate(t, dt, reduced, state) {
    const oldHead=this.head.rotation.clone(),oldLean=this.body.rotation.z,oldLift=this.body.position.y;
    const previous=this.group.position.clone();
    if(state.directTravel){
      this.group.position.x+=state.anchorDelta.x;this.group.position.z+=state.anchorDelta.z;
      this.group.position.lerp(this.target,1-Math.exp(-dt*7));
    }
    else this.group.position.lerp(this.target, 1 - Math.exp(-dt * 7));
    const moved=Math.hypot(this.group.position.x-previous.x,this.group.position.z-previous.z);
    const walking = !reduced && state.walkAllowed!==false && moved/Math.max(dt,.001)>.03;
    const tempo=this.stride.phase*TAU;
    const bob = reduced ? 0 : Math.sin(t * 1.9 + this.phase) * .013;
    const sitting = state.reaction === 'sitting';
    this.body.position.y = (sitting ? -.14 : bob);
    this.torso.position.y = lerp(this.torso.position.y, sitting ? .85 : .925, 1 - Math.exp(-dt * 6));
    this.torso.scale.y = lerp(this.torso.scale.y, sitting ? (this.female ? .7 : .72) : (this.female ? .79 : .81), 1 - Math.exp(-dt * 6));
    this.belly.position.y = lerp(this.belly.position.y, sitting ? .82 : .94, 1 - Math.exp(-dt * 6));
    this.belly.scale.y = lerp(this.belly.scale.y, sitting ? .51 : .599, 1 - Math.exp(-dt * 6));
    this.body.rotation.z = 0;
    this.head.rotation.set(0, 0, this.female ? .025 : 0);
    const leftRest = sitting ? -.6 : -.23;
    const rightRest = sitting ? .6 : .23;
    let left = leftRest, right = rightRest;
    let face = this.baseRotation;
    this.gift.visible = state.reaction === 'flower' && !this.female;
    const active = moodAliases[state.reaction] || state.reaction;
    const contact=state.contact || {phase:0,kind:'idle'};
    if (walking) { left -= Math.sin(tempo) * .15; right -= Math.sin(tempo) * .15; }
    if (active === 'wave' && !this.female) {
      left = -2.3 + (reduced ? 0 : Math.sin(t * 7) * .27);
      this.head.rotation.z = -.075;
    } else if (active === 'happy' || active === 'stars') {
      left = -.58; right = .58;
      if (!reduced && !sitting) this.body.position.y += Math.max(0, Math.sin(t * 5.5 + this.phase)) * ((state.variation||0)%3===0?.065:.016);
      this.head.rotation.z = Math.sin(t * 1.6 + this.phase) * .055;
    } else if (active === 'heart') {
      left = 1.08; right = -1.08;
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
      const warmth=contact.phase;
      left = leftRest; right = rightRest;
      face = active==='kiss'?(this.female?-1:1)*1.15*warmth:this.baseRotation*(1-warmth);
      this.head.rotation.y = active==='kiss'?(this.female?-.20:.20)*warmth:(this.female?-.10:.12)*warmth;
      this.head.rotation.z = (this.female?.04:-.04)*warmth;
      this.head.rotation.x = this.female?.025*warmth:0;
      if(active==='hug')this.body.rotation.z=(this.female?.04:-.03)*warmth;
    } else if (active === 'funny' || active === 'dance') {
      left = -.91; right = .91;
      if (!reduced) {
        this.body.rotation.z = Math.sin(t * 6 + this.phase) * .10;
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
    if(state.travelYaw!=null)face=state.travelYaw;
    const emotion=moodPose(active,reduced?0:t,state.variation||0,this.female);
    if(!this.female&&emotion.left!=null)left=emotion.left;if(this.female&&emotion.right!=null)right=emotion.right;
    if(active!=='heart'&&active!=='hug'&&active!=='kiss'){
      // Keep the inner flipper relaxed; the outer one can wave or dance freely.
      if(this.female)left=Math.max(left,-.23);else right=Math.min(right,.23);
    }
    const turn=THREE.MathUtils.euclideanModulo(face-this.group.rotation.y+Math.PI,TAU)-Math.PI;
    this.group.rotation.y += turn*(1-Math.exp(-dt*5));
    this.wings[0].rotation.z = lerp(this.wings[0].rotation.z, left, 1 - Math.exp(-dt * 9));
    this.wings[1].rotation.z = lerp(this.wings[1].rotation.z, right, 1 - Math.exp(-dt * 9));
    for(const [axis,key] of [['x','headX'],['y','headY'],['z','headZ']]) if(emotion[key]!=null)this.head.rotation[axis]=emotion[key];
    if(emotion.bounce&&!reduced)this.body.position.y+=emotion.bounce*(this.female?.5:1);
    if(!walking && active==='idle'){
      const quiet=reduced?0:Math.sin(t*.29+this.phase);
      this.head.rotation.y=quiet*.07;this.head.rotation.z+=reduced?0:Math.sin(t*.19+this.phase)*.025;
    }
    this.wings.forEach((wing,i)=>{
      const wrap=active==='hug'&&!this.female&&i===1;
      const heart=active==='heart';
      const hand=active==='hand'&&(this.female?i===0:i===1);
      const weight=wrap||hand?contact.phase:heart?1:0;
      if(wrap||heart||hand){wing.rotation.z=0;bendFlipper(wing.children[0],weight,wrap?'hug':hand?'hand':'heart',state.actualGap||1.36);}
      else if(wing.children[0].userData.bent){bendFlipper(wing.children[0],0,'idle',1.4);}
      wing.children[0].userData.bent=wrap||heart||hand;
      wing.position.set((i===0?-1:1)*.50,1.25,.035);
    });
    const stride=this.stride.advance({x:this.group.position.x,z:this.group.position.z,yaw:this.group.rotation.y},dt,!reduced&&state.walkAllowed!==false&&!sitting);
    this.body.position.y+=stride.bob;this.body.rotation.z+=stride.lean*.7;
    this.wings.forEach((wing,i)=>{wing.rotation.x=lerp(wing.rotation.x,(i?1:-1)*stride.swing*.18,1-Math.exp(-dt*9));});
    this.feet.forEach((foot,i)=>{
      const step=stride.feet[i];
      foot.position.x=step.x;
      foot.position.y=.065+(sitting?-.04:0)+step.lift;
      foot.position.z=sitting?lerp(foot.position.z,.21,1-Math.exp(-dt*6)):step.z;
      foot.rotation.x=step.pitch;
    });
    if (!reduced && t > this.blinkAt) {
      this.blinkStart = t;
      this.blinkAt = t + 3.4 + Math.random() * 4;
    }
    const age = t - this.blinkStart;
    const blink = age >= 0 && age < .2 ? 1 - Math.sin(age / .2 * Math.PI) * .95 : 1;
    for(const axis of ['x','y','z'])this.head.rotation[axis]=lerp(oldHead[axis],this.head.rotation[axis],1-Math.exp(-dt*5));
    this.body.rotation.z=lerp(oldLean,this.body.rotation.z,1-Math.exp(-dt*7));
    this.body.position.y=lerp(oldLift,this.body.position.y,1-Math.exp(-dt*9));
    this.feet.forEach((foot,i)=>{
      const hip=new THREE.Vector3((i?1:-1)*.205,.23,.03).applyEuler(this.body.rotation).add(this.body.position);
      const ankle=foot.position.clone().add(new THREE.Vector3(0,.035,-.055)),limb=ankle.clone().sub(hip);
      this.legs[i].position.copy(hip).addScaledVector(limb,.5);this.legs[i].scale.y=limb.length();
      this.legs[i].quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),limb.normalize());
    });
    this.eyes.forEach(eye => { eye.scale.y = active === 'sleep' || active === 'sleeping' ? .07 : active === 'kiss' ? lerp(blink,.24,contact.phase) : blink; });
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
    this.distance = 55;
    this.spacing=new PartnerSpacing(55);
    this.anchor=new THREE.Vector3();this.destination=this.anchor.clone();this.walkCenter=0;this.variation=0;this.nextIdle=8;
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
    this.camera = new THREE.PerspectiveCamera(36, 1, .1, 100);
    this.scene.fog=new THREE.Fog('#20353b',24,65);
    this.guidedCamera=new GuidedCamera(this.camera);
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
    this.scene.add(this.keyLight,this.keyLight.target);
    this.quality=new AdaptiveQuality(this.renderer,this.keyLight);
    this.scene.add(new THREE.HemisphereLight('#dce7f2', '#778391', 2.1));
    const rim = new THREE.DirectionalLight('#aecfe6', 2.0);
    rim.position.set(2, 3, -5);
    this.scene.add(rim);this.rimLight=rim;
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
    this.environments=new RomanticWorld(this.world);
    const shadowGeometry=new THREE.CircleGeometry(1,24);
    this.contactShadows=[this.male,this.female].map(()=>{const s=new THREE.Mesh(shadowGeometry,new THREE.MeshBasicMaterial({color:'#27332d',transparent:true,opacity:.20,depthWrite:false}));s.rotation.x=-Math.PI/2;s.scale.set(.48,.32,1);this.world.add(s);return s;});
    this.particlesAnchor=new THREE.Group();this.world.add(this.particlesAnchor);
    this.particlesAnchor.add(this.snow,...this.hearts.map(h=>h.mesh),...this.stars);
    const path=mesh(new THREE.BoxGeometry(4.7,.12,2.5),material('#90745a'),this.world,[0,-.10,-2.7]);
    this.gatewayPath=path;
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
    const soil = material('#51392b', .98);
    const earth = material('#73503b', 1);
    mesh(new THREE.CylinderGeometry(2.9, 2.53, .28, 64), soil, this.island, [0, -.18, 0], [1, 1, .72]);
    const top = sphere(this.island, earth, [0, -.055, 0], [2.96, .11, 2.12], 64);
    top.receiveShadow = true;
    top.castShadow = false;
    const rim = mesh(new THREE.TorusGeometry(2.81, .085, 12, 96), earth, this.island, [0, -.062, 0], [1, .735, .7]);
    rim.rotation.x = Math.PI / 2;
    for (let i = 0; i < 12; i++) {
      const angle = i * TAU / 12;
      sphere(this.island, earth, [Math.cos(angle) * 2.73, -.064, Math.sin(angle) * 1.93], [.18 + (i % 3) * .04, .075, .17], 18);
    }
    this.lanterns = [];
    this.glowMap = glowTexture();
    this.addLantern(-2.04, .93, 1);
    this.addLantern(2.12, -.62, .82);
    const pebbleMat = material('#806850', .9);
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
    this.table.position.set(-1.85, .005, -.80);
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
    this.wide = this.immersed ? width >= 700 || width>height&&height<=550 : width / height > 1.55;
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
    if(this.failed||this.disposed)return;
    const previous=this.sceneName,changed=name!==previous;this.sceneName=name;
    this.immersed=!['welcome','customize'].includes(name);
    this.environments.setVisible(this.immersed);
    this.island.visible=!this.immersed||name==='portal'&&this.anchor.z>-3;
    this.door.visible=name==='customize'||name==='portal';
    this.door.position.set(name==='portal'?0:1.67,0,name==='portal'?-2.5:-.88);
    this.door.scale.set(name==='portal'?3.0:1,name==='portal'?1.3:1,1);
    this.table.visible=name==='letter';this.table.position.set(-1.95,.005,-4.5);
    this.gatewayPath.visible=name==='portal';
    if(name==='welcome'||name==='customize'){this.destination.set(0,0,0);this.travelQueue=[];this.requestedPlace=null;this.travelLeg=null;this.arrivalUntil=0;this.pendingPose=null;this.pendingReaction=null;this.place=null;this.setCompanion(name==='customize');}
    else{this.setCompanion(true);if(['letter','distance'].includes(name))this.travelTo('entrance',true);if(['final','selfie','memory'].includes(name))this.travelTo('viewpoint',true);}
    if(changed&&!(['selfie','memory'].includes(previous)&&['selfie','memory'].includes(name))){this.pose='idle';this.spacing.release(this.elapsed);this.reaction='idle';this.reactionUntil=Infinity;this.walkCenter=0;}
    this.keyLight.color.set(['final','memory'].includes(name)?'#ffd7ad':'#ffdfc1');
    this.resize();
    if(changed&&!this.immersed)this.settle();
  }

  travelTo(place){
    if(!places[place]||this.failed||this.requestedPlace===place)return;
    this.requestedPlace=place;this.walkCenter=0;this.arrivalNotified=false;
    this.options.onDeparture?.(place);
    this.pendingReaction=null;this.pendingPose=null;
    this.spacing.release(this.elapsed);this.pose='idle';this.reaction='idle';this.reactionUntil=Infinity;
    const route=['entrance','roses','grove','stars','viewpoint'],from=route.indexOf(this.place),to=route.indexOf(place);
    this.travelQueue=[];
    if(from>=0&&from!==to){const direction=to>from?1:-1;for(let i=from+direction;direction>0?i<=to:i>=to;i+=direction)this.travelQueue.push(route[i]);}
    else if(!this.travelLeg)this.travelQueue.push(place);
    if(this.reducedMotion){this.travelQueue=[place];this.settle();return;}
    // Finish the current leg before following a newer choice. Every corner
    // reaches its landing, with a short turn before the next straight path.
    if(!this.travelLeg&&this.travelQueue.length)this.startTravelLeg(this.travelQueue.shift());
  }

  startTravelLeg(next){
    const from=this.place;this.cameraFromPlace=from;
    this.destination.copy(this.environments.enter(next,{from,next:this.travelQueue?.[0]}));this.place=next;
    this.travelLeg=new WalkingLeg(this.anchor,this.destination,this.sceneName==='portal'?1.7:1.85);
    this.lastTravelYaw=this.travelLeg.yaw;this.arrivalUntil=Infinity;
  }

  isTravelling(){return !!this.travelLeg||!!this.travelQueue?.length||!!this.requestedPlace&&(!this.arrivalNotified||this.elapsed<(this.arrivalUntil||0));}

  hasArrived(){
    return !this.travelLeg&&!this.travelQueue?.length&&this.elapsed>=(this.arrivalUntil||0)&&this.anchor.distanceTo(this.destination)<.001&&
      this.male.group.position.distanceTo(this.male.target)<.025&&
      (!this.companionVisible||this.female.group.position.distanceTo(this.female.target)<.025)&&
      this.male.stride.blend<.02&&(!this.companionVisible||this.female.stride.blend<.02)&&
      (this.arrivalNotified||[this.male,...(this.companionVisible?[this.female]:[])].every(p=>Math.abs(THREE.MathUtils.euclideanModulo(p.baseRotation-p.group.rotation.y+Math.PI,TAU)-Math.PI)<.055));
  }

  beginGateway(){
    if(this.failed)return;
    this.setScene('portal');this.guidedCamera.gateway(this.elapsed);this.travelTo('entrance');
    this.reaction='hopeful';this.reactionUntil=this.elapsed+5.4;
  }

  settle({forward=false,snapCamera=false}={}){
    if(this.failed)return;
    if(this.requestedPlace){this.destination.copy(this.environments.enter(this.requestedPlace));this.place=this.requestedPlace;this.travelQueue=[];}
    this.travelLeg=null;this.travelProgress=1;this.cameraFromPlace=this.place;this.arrivalUntil=this.elapsed+.4;this.anchor.copy(this.destination);this.positionPair();
    if(!this.companionVisible)this.male.target.copy(this.anchor).add(new THREE.Vector3(-.04,0,.23));
    this.male.group.position.copy(this.male.target);this.female.group.position.copy(this.female.target);
    for(const p of [this.male,this.female]){
      if(forward){p.group.rotation.y=p.baseRotation;p.body.position.y=0;p.body.rotation.z=0;p.feet.forEach((foot,i)=>{foot.position.set((i?1:-1)*.205,.065,.123);foot.rotation.x=0;});}
      p.stride.reset({x:p.group.position.x,z:p.group.position.z,yaw:p.group.rotation.y});
    }
    this.guidedCamera.update({anchor:this.anchor,place:this.place,scene:this.sceneName,elapsed:this.elapsed,dt:1,reduced:true,wide:this.wide,aspect:this.camera.aspect});
    if(snapCamera){this.camera.position.copy(this.guidedCamera.position);this.guidedCamera.currentTarget.copy(this.guidedCamera.target);this.camera.lookAt(this.guidedCamera.target);}
  }

  setCompanion(visible = true) {
    if (this.failed || this.disposed) return;
    const changed = this.companionVisible !== !!visible;
    this.companionVisible = !!visible;
    this.female.group.visible = !!visible;
    if(changed && visible) this.positionPair();
    if(!visible) this.male.target.set(-.04,0,.23);
  }

  setAccessory(name, color = '#ee9eb5') {
    if (this.failed || this.disposed) return;
    if(this.female.accessoryName===name && this.female.accent===color) return;
    this.female.setAccessory(name, color);
    this.react('happy');
  }

  positionPair(gap=this.spacing.sample(this.elapsed).gap, center=this.walkCenter){
    gap=clamp(gap,1.28,FLOOR_LIMIT*2);center=clamp(center,-FLOOR_LIMIT+gap/2,FLOOR_LIMIT-gap/2);
    const sitting=this.reaction==='sitting';
    const b=this.benchBlend||0;
    if(!sitting)this.benchBacking=false;
    if(sitting&&Math.min(this.male.group.position.y,this.female.group.position.y)>.58)this.benchBacking=true;
    const seated=this.benchBacking&&Math.abs((this.male.group.position.z+this.female.group.position.z)/2-this.anchor.z-bench.z-.25)<.03;
    const z=this.anchor.z+(sitting&&this.benchBacking?bench.z+.25:.24);
    // Walk onto the bank, hop up, then settle back onto the seat. On leaving,
    // retain support until the body has cleared the front of the bench.
    const y=sitting?(seated?.50:.62)*smooth((b-.60)/.15):b>.30?.50:.50*smooth(b/.30);
    this.pairCenterX=this.anchor.x+bench.x*(this.benchBlend||0);
    this.male.target.set(this.pairCenterX+center-gap/2,y+.02*Math.min(1,y/.5),z);
    this.female.target.set(this.pairCenterX+center+gap/2,y,z);
  }

  setDistance(value){
    if(this.failed||this.disposed)return;
    this.distance=clamp(Number(value)||0,0,100);this.spacing.choose(this.distance);
    this.positionPair();
  }

  react(name='happy',variation){
    if(this.failed||this.disposed)return;
    const kind=poseName(name);
    if(this.isTravelling()){this.pendingReaction={kind,variation};return;}
    if(this.spacing.override&&!['hug','kiss','hand'].includes(kind))return;
    this.reaction=kind;this.reactionStart=this.elapsed;this.variation=variation??Math.floor(Math.random()*3);
    this.reactionUntil=this.elapsed+(['hug','kiss','hand'].includes(kind)?7.6:kind==='sitting'?7:4.5);
    if(['hug','kiss','hand'].includes(kind)){this.setCompanion(true);this.spacing.contact(kind,this.elapsed);}
  }

  walkTo(x=0){
    if(this.failed||this.disposed)return;
    if(this.isTravelling())return;
    this.walkCenter=clamp(Number(x)||0,-1,1)*.55;
    this.pose='idle';this.reaction='idle';this.spacing.release(this.elapsed);this.positionPair();
  }

  setPose(name='idle'){
    if(this.failed||this.disposed)return;
    const kind=poseName(name);
    if(this.isTravelling()){this.pendingPose=kind;return;}
    if(kind===this.pose&&this.reaction===kind&&this.reactionUntil===Infinity)return;
    this.pose=kind;this.reaction=kind;this.reactionStart=this.elapsed;this.reactionUntil=Infinity;
    this.spacing.release();
    if(['hug','kiss'].includes(kind))this.spacing.contact(kind,this.elapsed,{persistent:true});
    this.positionPair();
  }

  interact(id){
    if(this.failed)return;
    if(this.isTravelling()||!this.hasArrived()){this.pendingInteractions??=new Set();this.pendingInteractions.add(id);if(this.pendingInteractions.size>6)this.pendingInteractions.delete(this.pendingInteractions.values().next().value);return;}
    if(id==='bench'&&this.place!=='stars')return;
    this.environments.interact(id,this.elapsed);
    if(this.spacing.override)return;
    if(id==='flower')this.react('flower');
    else if(id==='bench')this.react('sitting');
    else if(id==='moon'||id==='star'){this.guidedCamera.look=1;this.react('lookstars');clearTimeout(this.lookTimer);this.lookTimer=setTimeout(()=>{this.guidedCamera.look=0;},4500);}
    else if(id==='penguin')this.react(['shy','surprised','happy','curious'][Math.floor(Math.random()*4)]);
    else this.react(id==='water'?'curious':'hopeful');
    this.options.onInteraction?.(id);
  }

  hotspots(){
    if(!this.immersed||this.sceneName==='portal'||!this.hasArrived())return [];
    const spots=this.environments.hotspots().filter(s=>s.id!=='letter'||this.sceneName==='letter');
    spots.push({id:'penguin',label:'Say hello to him',icon:'♡',position:this.male.group.position.clone().add(new THREE.Vector3(0,2.5,0))});
    return spots.map(s=>{const p=s.position.clone().project(this.camera);return {...s,x:(p.x+1)*50,y:(1-p.y)*50,visible:p.z<1&&Math.abs(p.x)<.94&&Math.abs(p.y)<.9};});
  }

  keepBodiesApart(){
    if(!this.companionVisible)return;
    const a=this.male.group.position,b=this.female.group.position;
    const radius=p=>Math.hypot(.575*Math.cos(p.group.rotation.y),.54*Math.sin(p.group.rotation.y));
    const min=radius(this.male)+radius(this.female)+.09;
    const gap=clamp(b.x-a.x,min,FLOOR_LIMIT*2);
    const focus=this.pairCenterX??this.anchor.x;
    // Let both partners approach the bench without snapping sideways.
    const center=clamp((a.x+b.x)/2,focus-FLOOR_LIMIT+gap/2,focus+FLOOR_LIMIT-gap/2);
    a.x=center-gap/2;b.x=center+gap/2;
  }

  setLocation(name='roses'){
    this.location=name;if(this.sceneName==='journey')this.travelTo(name);
  }

  setReducedMotion(value) { this.reducedMotion = !!value;if(this.reducedMotion)this.settle(); }

  reset(){
    if(this.failed)return;clearTimeout(this.lookTimer);this.guidedCamera.look=0;this.guidedCamera.drag=0;this.guidedCamera.gatewayStart=null;
    this.environments.reset();this.pendingInteractions?.clear();this.spacing.release();this.walkCenter=0;this.travelSpeed=0;this.nextIdle=this.elapsed+12;this.lastHotspot=0;this.pose='idle';this.reaction='idle';this.requestedPlace=null;this.travelQueue=[];this.travelLeg=null;this.pendingPose=null;this.pendingReaction=null;this.arrivalNotified=true;
    this.benchBlend=0;this.anchor.set(0,0,0);this.destination.copy(this.anchor);this.sceneName='reset';this.setDistance(55);this.setScene('welcome');this.settle();
    for(const p of [this.male,this.female]){p.stride.reset({x:p.group.position.x,z:p.group.position.z,yaw:p.group.rotation.y});p.blinkStart=-10;p.blinkAt=this.elapsed+4;p.group.rotation.y=p.baseRotation;p.body.position.y=0;p.body.rotation.set(0,0,0);p.head.rotation.set(0,0,p.female?.025:0);p.torso.position.y=.925;p.torso.scale.y=p.female?.79:.81;p.belly.position.y=.94;p.belly.scale.y=.599;p.gift.visible=false;p.eyes.forEach(e=>e.scale.y=1);p.wings.forEach((wing,i)=>{wing.rotation.z=i?.23:-.23;bendFlipper(wing.children[0],0,'idle',1.4);wing.children[0].userData.bent=false;});p.feet.forEach(foot=>{foot.position.x=(p.feet.indexOf(foot)?1:-1)*.205;foot.position.y=.065;foot.position.z=.123;foot.rotation.x=0;});}
  }

  endContact(){this.spacing.release(this.elapsed);this.pose='idle';this.reaction='idle';this.reactionUntil=Infinity;}

  frame(now) {
    if (this.disposed || this.failed) return;
    const rawDt=this.lastTime?(now-this.lastTime)/1000:.016;
    const dt=Math.min(rawDt,document.hidden?1:.1);this.quality.sample(rawDt);
    this.lastTime = now;
    this.elapsed += Math.min(rawDt,1);
    const t = this.elapsed;
    if(!this.travelLeg&&this.travelQueue?.length&&t>=(this.legReadyAt||0))this.startTravelLeg(this.travelQueue.shift());
    if (this.reactionUntil < t){this.reaction=this.pose==='idle'?'idle':this.pose;this.spacing.release();this.reactionUntil=Infinity;}
    if(!this.isTravelling()&&t>this.nextIdle&&this.reaction==='idle'&&!this.quiet&&['welcome','customize','journey'].includes(this.sceneName)){this.react(['curious','shy','hopeful'][Math.floor(Math.random()*3)]);this.nextIdle=t+14+Math.random()*8;}
    const embrace=this.spacing.override!=null||['hug','kiss','hand'].includes(this.reaction);
    const departingBench=(this.benchBlend||0)>.01;
    const oldAnchor=this.anchor.clone(),hadLeg=!!this.travelLeg;
    if(this.travelLeg&&!embrace&&!departingBench){
      const leg=this.travelLeg.advance(dt);this.travelProgress=leg.progress;
      this.anchor.set(leg.x,0,leg.z);
      if(leg.done){this.anchor.copy(this.destination);this.travelLeg=null;this.legReadyAt=t+.18;this.arrivalUntil=this.travelQueue?.length?Infinity:t+.55;}
    }
    this.benchBlend=lerp(this.benchBlend||0,this.reaction==='sitting'?1:0,1-Math.exp(-dt*3));if(this.benchBlend<.001)this.benchBlend=0;
    const contact=this.spacing.sample(t);if(this.companionVisible)this.positionPair(contact.gap);else this.male.target.copy(this.anchor).add(new THREE.Vector3(-.04,0,.23));
    const movingRoute=!!this.travelLeg||!!this.travelQueue?.length;
    const state={reaction:contact.phase>0?contact.kind:this.reaction,scene:this.sceneName,contact,actualGap:this.female.group.position.x-this.male.group.position.x,variation:this.variation,
      directTravel:(movingRoute||hadLeg)&&!departingBench&&!embrace,anchorDelta:this.anchor.clone().sub(oldAnchor),walkAllowed:!embrace&&!departingBench,
      travelYaw:movingRoute&&!embrace&&!departingBench?this.lastTravelYaw:null};
    this.male.animate(t, dt, this.reducedMotion, state);
    if (this.female.group.visible) this.female.animate(t, dt, this.reducedMotion, state);
    this.keepBodiesApart();
    const focus=this.anchor.clone();focus.x=this.companionVisible?(this.male.group.position.x+this.female.group.position.x)/2:this.male.group.position.x;
    this.guidedCamera.update({anchor:focus,scene:this.sceneName,place:this.place,fromPlace:this.cameraFromPlace,travelProgress:this.travelProgress??1,travelling:movingRoute,elapsed:t,dt,reduced:this.reducedMotion,wide:this.wide,aspect:this.camera.aspect});
    if(!this.arrivalNotified&&this.requestedPlace&&this.hasArrived()){
      this.arrivalNotified=true;
      const pose=this.pendingPose,reaction=this.pendingReaction;this.pendingPose=null;this.pendingReaction=null;
      if(pose)this.setPose(pose);else if(reaction)this.react(reaction.kind,reaction.variation);
      if(this.pendingInteractions?.size){const ids=[...this.pendingInteractions];this.pendingInteractions.clear();ids.forEach(id=>this.environments.interact(id,t));this.interact(ids.at(-1));}
      this.options.onArrival?.(this.requestedPlace);
    }
    this.environments.update(t,this.reducedMotion,this.quality.level);this.particlesAnchor.position.copy(this.anchor);
    this.contactShadows.forEach((s,i)=>{const p=i?this.female:this.male;s.visible=p.group.visible;s.position.set(p.group.position.x,p.group.position.y>.02?-.01:.007,p.group.position.z);s.material.opacity=(this.quality.level==='low'?.23:.09)*Math.max(.2,1-p.group.position.y*1.6);});
    this.keyLight.position.copy(this.anchor).add(new THREE.Vector3(-3.5,6,5));this.keyLight.target.position.copy(this.anchor);this.keyLight.target.updateMatrixWorld();
    this.rimLight.position.copy(this.anchor).add(new THREE.Vector3(2,3,-5));
    if(this.sceneName==='portal')this.island.visible=this.anchor.z>-3;
    if(this.options.onHotspots&&(!this.lastHotspot||t-this.lastHotspot>.10)){this.options.onHotspots(this.hotspots());this.lastHotspot=t;}
    const festive = ['heart','kiss','hug'].includes(this.reaction);
    this.hearts.forEach(({ mesh: heart, seed, phase }) => {
      heart.visible = festive && seed < .28;
      if (!heart.visible) return;
      const rise = this.reducedMotion ? seed : (t * .19 + seed) % 1;
      heart.position.set(Math.sin(phase) * (1.35 + seed * .6), 1.28 + rise * 2, Math.cos(phase) * .75 -.1);
      heart.rotation.set(.08, this.reducedMotion ? phase : t * .4 + phase, Math.sin(phase + (this.reducedMotion?0:t)) * .16);
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
    this.snow.material.opacity = this.reaction==='snow'?.65:this.immersed?.30:.20;
    this.snow.geometry.setDrawRange(0,this.reducedMotion?12:this.quality.level==='low'?20:this.quality.level==='medium'?40:70);
    this.lanterns.forEach((lantern, i) => {
      const flicker = this.reducedMotion ? 1 : 1 + Math.sin(t * 6.3 + i) * .04 + Math.sin(t * 9.7) * .03;
      lantern.flame.scale.y = .073 * flicker;
      lantern.light.intensity = 1.7 * flicker;
    });
    this.stars.forEach((star, i) => {
      star.visible=i<(this.quality.level==='low'?7:this.quality.level==='medium'?12:22);
      star.material.opacity = (this.reaction === 'stars' || this.reaction === 'lookstars' ? .95 : .45) * (this.reducedMotion ? .7 : .65 + Math.sin(t * .8 + i * 2.1) * .35);
    });
    if(!document.hidden)this.renderer.render(this.scene,this.camera);
    this.frameId = requestAnimationFrame(this.frame);
  }

  capture() {
    if (this.failed || this.disposed) return null;
    const size=this.renderer.getSize(new THREE.Vector2()),dpr=this.renderer.getPixelRatio();
    const photoCamera=this.camera.clone();photoCamera.aspect=1.6;photoCamera.fov=36;
    photoCamera.position.copy(this.anchor).add(new THREE.Vector3(1.6,2.8,7.2));
    photoCamera.lookAt(this.anchor.clone().add(new THREE.Vector3(0,1.1,0)));photoCamera.updateProjectionMatrix();
    try{
      this.renderer.setPixelRatio(1);const width=this.quality.level==='low'?1280:1600;
      this.renderer.setSize(width,width/1.6,false);this.renderer.render(this.scene,photoCamera);
      return this.canvas.toDataURL('image/png');
    }finally{this.renderer.setPixelRatio(dpr);this.renderer.setSize(size.x,size.y,false);this.renderer.render(this.scene,this.camera);}
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    clearTimeout(this.lookTimer);
    cancelAnimationFrame(this.frameId);
    this.environments?.dispose();
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
