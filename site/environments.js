import * as THREE from './assets/three.module.min.js';
import {decks,connectors,bench} from './world-layout.js';
import {tileUV,tileRectangle} from './tiled-floor.js';

export const places={
  entrance:{anchor:[0,0,-6],next:'roses',name:'The forest entrance'},
  roses:{anchor:[0,0,-13],next:'grove',name:'The flower garden'},
  grove:{anchor:[8,0,-13],next:'stars',name:'The wooden bridge'},
  stars:{anchor:[8,0,-21],next:'viewpoint',name:'The moonlit lake'},
  viewpoint:{anchor:[8,0,-27],next:'stars',name:'Our little viewpoint'}
};

/** Small, connected places. Build the current and nearby place, retain at most three. */
export class RomanticWorld {
  constructor(scene,tileFinish){
    this.tileFinish=tileFinish;
    this.scene=scene;this.cache=new Map();this.materials=new Map();this.active='entrance';this.effects={};this.visible=false;
    this.unitBox=new THREE.BoxGeometry(1,1,1);this.unitSphere=new THREE.SphereGeometry(1,16,12);
    this.unitCone=new THREE.ConeGeometry(1,1,14);this.unitCylinder=new THREE.CylinderGeometry(1,1,1,14);
    this.shared=new Set([this.unitBox,this.unitSphere,this.unitCone,this.unitCylinder]);
    this.landmarks=new THREE.Group();this.landmarks.visible=false;scene.add(this.landmarks);
    const moon=this.ball(this.landmarks,'#f4e1bb',[8,6,-33],[1.0,1.0,.28],{emissive:'#c4b792',emissiveIntensity:.42});
    moon.userData.moon=true;
    for(let i=0;i<7;i++)this.ball(this.landmarks,i%2?'#263f43':'#304c4b',[-15+i*6,-3,-38-i%3*4],[6,5+i%3,3]);
  }
  mat(color,extra={}){const key=color+JSON.stringify(extra);if(!this.materials.has(key))this.materials.set(key,new THREE.MeshStandardMaterial({color,roughness:.9,...extra}));return this.materials.get(key);}
  add(geo,mat,parent,pos,scale){const m=new THREE.Mesh(geo,mat);m.position.set(...pos);m.scale.set(...scale);m.castShadow=false;m.receiveShadow=true;parent.add(m);return m;}
  box(g,c,p,s){return this.add(this.unitBox,this.mat(c),g,p,s);}
  ball(g,c,p,s,extra){return this.add(this.unitSphere,this.mat(c,extra),g,p,s);}
  tree(g,x,z,h=2){
    this.add(this.unitCylinder,this.mat('#665044'),g,[x,h*.34,z],[.08,h*.68,.08]);
    for(let i=0;i<4;i++)this.ball(g,i%2?'#4d6d5c':'#36584f',[x+Math.sin(i*2.1)*h*.15,h*(.56+i*.095),z+Math.cos(i*2.1)*h*.11],[h*(.30-i*.025),h*.30,h*.28]);
  }
  flower(g,x,z,color='#dba7a1'){
    this.add(this.unitCylinder,this.mat('#68856a'),g,[x,.20,z],[.014,.4,.014]);
    const bloom=new THREE.Group();bloom.userData.dynamic=true;bloom.position.set(x,.46,z);g.add(bloom);
    for(let i=0;i<5;i++)this.ball(bloom,color,[Math.cos(i*1.256)*.07,Math.sin(i*1.256)*.07,0],[.075,.075,.025]);
    this.ball(bloom,'#eac3a5',[0,0,.02],[.035,.035,.025]);return bloom;
  }
  lantern(g,x,z){
    this.box(g,'#745747',[x,.20,z],[.18,.4,.18]);
    const glow=this.box(g,'#f0d5a3',[x,.29,z+.095],[.11,.20,.014]);
    glow.userData.dynamic=true;
    glow.material=this.mat('#ddbc7e',{emissive:'#e9b66f',emissiveIntensity:.22});
    this.add(this.unitCone,this.mat('#665449'),g,[x,.46,z],[.16,.12,.16]);return glow;
  }
  ground(g,w,d,color='#73503b'){
    const r=Math.min(.95,w/4,d/4),x=w/2,z=d/2,s=new THREE.Shape();
    s.moveTo(-x+r,-z);s.lineTo(x-r,-z);s.quadraticCurveTo(x,-z,x,-z+r);s.lineTo(x,z-r);s.quadraticCurveTo(x,z,x-r,z);s.lineTo(-x+r,z);s.quadraticCurveTo(-x,z,-x,z-r);s.lineTo(-x,-z+r);s.quadraticCurveTo(-x,-z,-x+r,-z);
    const geo=new THREE.ExtrudeGeometry(s,{depth:.18,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.055,bevelThickness:.07,curveSegments:5});geo.rotateX(-Math.PI/2);
    // Leave the beveled foundation below the tile face, avoiding coplanar flicker.
    this.add(geo,this.mat('#85735d'),g,[0,-.262,0],[1,1,1]);
    const surface=new THREE.ShapeGeometry(s,16);surface.rotateX(-Math.PI/2);tileUV(surface);
    this.add(surface,this.tileFinish,g,[0,0,0],[1,1,1]);
  }
  planks(g,w,d,cx=0,cz=0,alongX=false){
    const width=alongX?d:w,depth=alongX?w:d;
    this.box(g,'#7e705b',[cx,-.065,cz],[width,.13,depth]);
    tileRectangle(g,this.tileFinish,width,depth,cx,cz,.002);
  }
  rail(g,x,z,length,alongX=false){
    const panels=Math.max(2,Math.ceil(length/1.15)),step=length/panels;
    for(let i=0;i<=panels;i++){
      const px=x+(alongX?i*step:0),pz=z+(alongX?0:i*step);
      this.add(this.unitCylinder,this.mat('#35504d'),g,[px,.34,pz],[.027,.72,.027]);
      this.ball(g,'#bea783',[px,.72,pz],[.044,.036,.044],{metalness:.35});
      this.box(g,'#958166',[px,.025,pz],[.12,.05,.12]);
    }
    this.box(g,'#bca581',[x+(alongX?length/2:0),.69,z+(alongX?0:length/2)],[alongX?length+.09:.055,.045,alongX?.055:length+.09]);
    this.box(g,'#35504d',[x+(alongX?length/2:0),.14,z+(alongX?0:length/2)],[alongX?length:.025,.025,alongX?.025:length]);
    for(let i=0;i<panels;i++)for(const sign of [-1,1]){
      const rod=this.box(g,'#48635c',[x+(alongX?(i+.5)*step:0),.405,z+(alongX?0:(i+.5)*step)],[.022,Math.hypot(step*.82,.43),.022]);
      if(alongX)rod.rotation.z=sign*Math.atan2(step*.82,.43);else rod.rotation.x=sign*Math.atan2(step*.82,.43);
    }
  }
  build(name){
    if(this.cache.has(name))return this.cache.get(name);
    const g=new THREE.Group();g.visible=this.visible;g.position.set(...places[name].anchor);this.scene.add(g);
    const record={group:g,hotspots:[],flowers:[],lanterns:[],rings:[]};this.cache.set(name,record);
    const spot=(id,label,icon,position)=>record.hotspots.push({id,label,icon,position:new THREE.Vector3(...position).add(g.position)});
    if(name==='entrance'){
      this.ground(g,7.2,6.8);
      for(const [x,z,h] of [[-3,-1.8,2.8],[3,-2,3.1],[-2.8,2.1,1.4],[2.9,1.9,1.8]])this.tree(g,x,z,h);
      for(let i=0;i<8;i++)this.ball(g,'#b7a185',[(i%2?.37:-.37),.015,1.7-i*.55],[.23,.03,.16]);
      this.box(g,'#9c8160',[-2.15,.65,-1],[1.0,.38,.06]);
      spot('letter','Open the letter','✉',[-1.985,.785,1.52]);
      spot('note','A note among the leaves','✧',[2.4,.60,1.6]);
    }else if(name==='roses'){
      this.ground(g,7.4,6.8,'#776245');
      for(let side of [-1,1])for(let i=0;i<8;i++){const x=side*(2.1+(i%3)*.23),z=-2.2+i*.6;record.flowers.push(this.flower(g,x,z,i%2?'#dba7a1':'#efe2ca'));}
      this.tree(g,-3,-2.4,2.1);this.tree(g,3,-2.3,2.8);
      this.rail(g,3.78,-2.18,1.54,true);this.rail(g,3.78,2.18,1.54,true);
      spot('flower','Touch a flower','✿',[-2.1,.65,1.25]);spot('next','Walk to the bridge','→',[2.6,.5,.7]);
    }else if(name==='grove'){
      this.ball(g,'#344d50',[0,-.52,0],[5,.03,4.5]);this.planks(g,5.2,6.4);
      // An open western landing lets the garden path enter between the rails.
      this.rail(g,2.5,-3,6);
      for(let i=0;i<6;i++)record.lanterns.push(this.lantern(g,2.45,-2.4+i*.85));
      for(const [x,z,h] of [[3.5,-3,2.6],[-3.6,-3.1,2.2]]){this.ball(g,'#65735a',[x,-.31,z],[1.25,.35,1.15]);this.tree(g,x,z,h);}
      spot('lantern','Light the lantern path','✧',[2.1,.6,.9]);spot('next','Follow the lights to the lake','→',[1.9,.5,-2.0]);
    }else if(name==='stars'){
      const water=this.ball(g,'#426568',[0,-.48,0],[7.5,.022,6]);water.userData.dynamic=true;water.material=this.mat('#426568',{roughness:.65,metalness:.05});record.water=water;
      // Keep the lake deck open on the bench side so the pair can walk onto the bank.
      this.planks(g,5.2,4.8);this.rail(g,2.4,-2.2,4.4);
      const bank=new THREE.Group();bank.position.set(-4,-.025,0);g.add(bank);this.ground(bank,5.8,5.1,'#76654b');
      this.tree(g,-6.1,-2.2,2.3);
      this.box(g,'#937353',[bench.x,.45,bench.z],[3.9,.12,.80]);
      for(const y of [.77,.95])this.box(g,'#a18663',[bench.x,y,bench.z-.45],[3.9,.12,.12]);
      for(const x of [-1.72,1.72])this.box(g,'#735a46',[bench.x+x,.70,bench.z-.39],[.08,.78,.08]);
      for(const x of [-1.6,1.6])this.box(g,'#735a46',[bench.x+x,.22,bench.z-.05],[.1,.50,.44]);
      for(let i=0;i<3;i++){const ring=new THREE.Mesh(new THREE.RingGeometry(.9,1,40),new THREE.MeshBasicMaterial({color:'#c7ded0',transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.set(3.1,-.44,1.2);g.add(ring);record.rings.push(ring);}
      spot('water','Make a ripple','≈',[2,.15,.9]);spot('bench','Sit beside the lake','⌑',[bench.x+1.55,.75,bench.z+.45]);spot('moon','Look at the moon','☾',[0,3.4,-4]);spot('note','Find the hidden note','✧',[2,.6,-.9]);
      const constellation=new THREE.Group();constellation.userData.dynamic=true;g.add(constellation);record.constellation=constellation;
      const points=[[-2.3,3.2,-4],[-1.8,3.7,-4],[-1.1,3.4,-4],[-.5,4,-4],[.2,3.8,-4]];
      for(const p of points)this.ball(constellation,'#f3dfb6',p,[.04,.04,.04],{emissive:'#e4c486',emissiveIntensity:1.0});
      constellation.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p))),new THREE.LineBasicMaterial({color:'#d9c9a3',transparent:true,opacity:.4})));
      spot('star','Connect the little stars','✦',[-1.1,3.4,-4]);
    }else{
      this.ground(g,6.2,4.4,'#82715b');this.rail(g,-2.9,-2,5.8,true);
      this.rail(g,-2.9,-2,3.7);this.rail(g,2.9,-2,3.7);
      const flowers=new THREE.Group();flowers.userData.dynamic=true;g.add(flowers);record.keptFlowers=flowers;
      for(const x of [-2.3,2.3])this.flower(flowers,x,-1.2,'#dba7a1');
      const stars=new THREE.Group();stars.userData.dynamic=true;g.add(stars);record.constellation=stars;
      for(let i=0;i<5;i++)this.ball(stars,'#e4c486',[-2+i*.65,3.0+Math.sin(i*1.7)*.25,-3.5],[.035,.035,.035],{emissive:'#e4c486',emissiveIntensity:.65});
      record.lanterns.push(this.lantern(g,-2.5,1.3),this.lantern(g,2.5,1.3));
      spot('moon','One last look at the moon','☾',[0,3.4,-4]);spot('note','A tiny promise','✧',[-2,.7,1]);
    }
    for(const c of connectors.filter(c=>c.owner===name)){const length=Math.abs(c.end-c.start),mid=(c.end+c.start)/2;this.planks(g,c.width,length,c.axis==='x'?mid:0,c.axis==='z'?mid:0,c.axis==='x');}
    this.batchStatic(g);return record;
  }
  batchStatic(root){
    root.updateMatrixWorld(true);const groups=new Map(),inverse=root.matrixWorld.clone().invert();
    root.traverse(o=>{if(!o.isMesh||!this.shared.has(o.geometry))return;for(let p=o;p&&p!==root;p=p.parent)if(p.userData.dynamic)return;const key=o.geometry.uuid+o.material.uuid;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(o);});
    for(const meshes of groups.values()){if(meshes.length<2)continue;const batch=new THREE.InstancedMesh(meshes[0].geometry,meshes[0].material,meshes.length);batch.receiveShadow=true;meshes.forEach((m,i)=>{batch.setMatrixAt(i,new THREE.Matrix4().multiplyMatrices(inverse,m.matrixWorld));m.parent.remove(m);});batch.computeBoundingSphere();root.add(batch);}
  }
  setVisible(value){this.visible=value;this.landmarks.visible=value;for(const r of this.cache.values())r.group.visible=value;}
  enter(name,{from,next}={}){
    if(!places[name])name='entrance';this.active=name;
    const neighbor=next||places[name].next;
    const keep=new Set([name,from,neighbor].filter(n=>places[n]));
    for(const key of keep)this.build(key);
    // Retain the departure landing throughout forward and backward travel.
    // Disposing it early makes the floor vanish under the walking penguins.
    while(this.cache.size>3){const key=[...this.cache.keys()].find(k=>!keep.has(k));this.remove(key);}
    return new THREE.Vector3(...places[name].anchor);
  }
  interact(id,t){if(this.effects[id]!=null&&t-this.effects[id]<1)return id;this.effects[id]=t;return id;}
  reset(){this.effects={};this.discoveries=[];}
  update(t,reduced,quality='high'){
    for(const [name,r] of this.cache){
      r.flowers.forEach((flower,i)=>{flower.rotation.z=reduced||quality==='low'?0:Math.sin(t*.7+i)*.035;const bloom=this.effects.flower==null?0:Math.max(0,1-(t-this.effects.flower)/5);flower.scale.setScalar(1+bloom*.15);});
      r.lanterns.forEach((lamp,i)=>{const on=this.effects.lantern!=null?t-this.effects.lantern>i*.28:this.discoveries?.includes('lantern');lamp.material=this.mat('#ddbc7e',{emissive:'#e9b66f',emissiveIntensity:on?1.2:.22});});
      r.rings.forEach((ring,i)=>{const age=t-(this.effects.water??-100)-i*.45;ring.visible=age>=0&&age<3;ring.scale.setScalar(.2+Math.max(0,age)*.65);ring.material.opacity=ring.visible?(1-age/3)*.45:0;});
      if(r.water&&!reduced&&quality!=='low')r.water.position.y=-.48+Math.sin(t*.8)*.01;
      if(r.constellation)r.constellation.visible=this.effects.star!=null||this.discoveries?.includes('star');
      if(r.keptFlowers)r.keptFlowers.visible=this.discoveries?.includes('flower');
    }
  }
  hotspots(){return this.cache.get(this.active)?.hotspots||[];}
  remove(name){const r=this.cache.get(name);if(!r)return;this.scene.remove(r.group);r.group.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.geometry&&!this.shared.has(o.geometry))o.geometry.dispose();if(o.material?.isMeshBasicMaterial||o.material?.isLineBasicMaterial)o.material.dispose();});this.cache.delete(name);}
  dispose(){for(const key of [...this.cache.keys()])this.remove(key);this.scene.remove(this.landmarks);this.shared.forEach(g=>g.dispose());this.materials.forEach(m=>m.dispose());}
}
