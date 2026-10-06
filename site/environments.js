import * as THREE from './assets/three.module.min.js';

export const places={
  entrance:{anchor:[0,0,-6],next:'roses',name:'The forest entrance'},
  roses:{anchor:[0,0,-13],next:'grove',name:'The flower garden'},
  grove:{anchor:[8,0,-13],next:'stars',name:'The wooden bridge'},
  stars:{anchor:[8,0,-21],next:'viewpoint',name:'The moonlit lake'},
  viewpoint:{anchor:[8,0,-27],next:'stars',name:'Our little viewpoint'}
};

/** Small, connected places. Build the current and nearby place, retain at most three. */
export class RomanticWorld {
  constructor(scene){
    this.scene=scene;this.cache=new Map();this.materials=new Map();this.active='entrance';this.effects={};this.visible=false;
    this.unitBox=new THREE.BoxGeometry(1,1,1);this.unitSphere=new THREE.SphereGeometry(1,16,12);
    this.unitCone=new THREE.ConeGeometry(1,1,14);this.unitCylinder=new THREE.CylinderGeometry(1,1,1,14);
    this.shared=new Set([this.unitBox,this.unitSphere,this.unitCone,this.unitCylinder]);
    this.landmarks=new THREE.Group();this.landmarks.visible=false;scene.add(this.landmarks);
    const moon=this.ball(this.landmarks,'#f4e1bb',[8,6,-33],[1.0,1.0,.28],{emissive:'#c4b792',emissiveIntensity:.42});
    moon.userData.moon=true;
    for(let i=0;i<7;i++)this.add(this.unitCone,this.mat(i%2?'#2c484b':'#355655'),this.landmarks,[-15+i*6,-2,-38-i%3*4],[5,5+i%3,3]);
  }
  mat(color,extra={}){const key=color+JSON.stringify(extra);if(!this.materials.has(key))this.materials.set(key,new THREE.MeshStandardMaterial({color,roughness:.9,...extra}));return this.materials.get(key);}
  add(geo,mat,parent,pos,scale){const m=new THREE.Mesh(geo,mat);m.position.set(...pos);m.scale.set(...scale);m.castShadow=false;m.receiveShadow=true;parent.add(m);return m;}
  box(g,c,p,s){return this.add(this.unitBox,this.mat(c),g,p,s);}
  ball(g,c,p,s,extra){return this.add(this.unitSphere,this.mat(c,extra),g,p,s);}
  tree(g,x,z,h=2){
    this.add(this.unitCylinder,this.mat('#665044'),g,[x,h*.35,z],[.07,h*.7,.07]);
    for(let i=0;i<3;i++)this.add(this.unitCone,this.mat(i%2?'#557b66':'#3d6259'),g,[x,h*.35+i*h*.22,z],[h*.26-i*.08,h*.55,h*.26-i*.08]);
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
    this.box(g,color,[0,-.17,0],[w,.30,d]);
    for(let i=0;i<10;i++)this.ball(g,'#6c7d56',[-w*.47+i*w*.104,-.02,-d*.47],[.45,.11,.35]);
  }
  planks(g,w,d){for(let i=0;i<Math.round(d/.24);i++)this.box(g,i%3?'#9b7753':'#a9825e',[0,-.07,-d/2+i*.24],[w,.13,.21]);}
  rail(g,x,z,length,alongX=false){
    for(let i=0;i<5;i++)this.box(g,'#87684d',[x+(alongX?i*length/4:0),.34,z+(alongX?0:i*length/4)],[.07,.75,.07]);
    this.box(g,'#b59874',[x+(alongX?length/2:0),.64,z+(alongX?0:length/2)],[alongX?length+.1:.08,.08,alongX?.08:length+.1]);
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
      spot('letter','Open the little letter','✉',[-1.95,1.05,1.5]);
      spot('note','A note among the leaves','✧',[2.4,.60,1.6]);
    }else if(name==='roses'){
      this.ground(g,7.4,6.8,'#776245');this.box(g,'#ab906a',[0,-.005,0],[3.2,.03,6.7]);
      for(let side of [-1,1])for(let i=0;i<8;i++){const x=side*(2.1+(i%3)*.23),z=-2.2+i*.6;record.flowers.push(this.flower(g,x,z,i%2?'#dba7a1':'#efe2ca'));}
      this.tree(g,-3,-2.4,2.1);this.tree(g,3,-2.3,2.8);
      // The bridge is already visible from the garden.
      for(let i=0;i<22;i++)this.box(g,'#9c7956',[3+i*.24,-.055,0],[.21,.12,3.1]);
      this.rail(g,3,-1.6,5.1,true);this.rail(g,3,1.6,5.1,true);
      spot('flower','Touch a flower','✿',[-2.1,.65,1.25]);spot('next','Walk to the bridge','→',[2.6,.5,.7]);
    }else if(name==='grove'){
      this.box(g,'#344d50',[0,-.52,0],[10,.06,9]);this.planks(g,4.8,6.4);
      this.rail(g,-2.2,-3,6);this.rail(g,2.2,-3,6);
      for(let i=0;i<6;i++)record.lanterns.push(this.lantern(g,i%2?2.15:-2.15,-2.4+i*.85));
      this.tree(g,3.4,-3,2.6);this.tree(g,-3.5,-3.1,2.2);
      for(let i=0;i<15;i++)this.box(g,'#9c7956',[0,-.055,-3.4-i*.25],[3.8,.12,.22]);
      spot('lantern','Light the lantern path','✧',[2.1,.6,.9]);spot('next','Follow the lights to the lake','→',[1.9,.5,-2.0]);
    }else if(name==='stars'){
      const water=this.box(g,'#426568',[0,-.48,0],[15,.04,12]);water.userData.dynamic=true;water.material=this.mat('#426568',{roughness:.3,metalness:.18});record.water=water;
      this.planks(g,5.2,4.8);this.rail(g,-2.4,-2.2,4.4);this.rail(g,2.4,-2.2,4.4);
      this.box(g,'#937353',[0,.45,-.85],[3.9,.12,.58]);this.box(g,'#a18663',[0,.95,-1.13],[3.9,.12,.08]);
      for(const x of [-1.6,1.6])this.box(g,'#735a46',[x,.22,-.9],[.1,.50,.44]);
      for(let i=0;i<3;i++){const ring=new THREE.Mesh(new THREE.RingGeometry(.9,1,40),new THREE.MeshBasicMaterial({color:'#c7ded0',transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.set(-2.2,-.44,1.2);g.add(ring);record.rings.push(ring);}
      for(let i=0;i<14;i++)this.box(g,'#9c7956',[0,-.055,-2.5-i*.25],[4.8,.12,.22]);
      spot('water','Make a ripple','≈',[-2.5,-.35,1.3]);spot('bench','Sit beside the lake','⌑',[0,.9,-.9]);spot('moon','Look at the moon','☾',[0,3.4,-4]);spot('note','Find the hidden note','✧',[2,.6,-.9]);
      const constellation=new THREE.Group();constellation.userData.dynamic=true;g.add(constellation);record.constellation=constellation;
      const points=[[-2.3,3.2,-4],[-1.8,3.7,-4],[-1.1,3.4,-4],[-.5,4,-4],[.2,3.8,-4]];
      for(const p of points)this.ball(constellation,'#f3dfb6',p,[.04,.04,.04],{emissive:'#e4c486',emissiveIntensity:1.0});
      constellation.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p))),new THREE.LineBasicMaterial({color:'#d9c9a3',transparent:true,opacity:.4})));
      spot('star','Connect the little stars','✦',[-1.1,3.4,-4]);
    }else{
      this.planks(g,6.2,4.4);this.rail(g,-2.9,-2,5.8,true);
      this.rail(g,-2.9,-2,3.7);this.rail(g,2.9,-2,3.7);
      for(let i=0;i<5;i++)this.ball(g,'#b3c1b7',[-4+i*2,-1.1,-4-i%2],[2,.3,.8],{transparent:true,opacity:.15});
      record.lanterns.push(this.lantern(g,-2.5,1.3),this.lantern(g,2.5,1.3));
      spot('moon','One last look at the moon','☾',[0,3.4,-4]);spot('note','A tiny promise','✧',[-2,.7,1]);
    }
    this.batchStatic(g);return record;
  }
  batchStatic(root){
    root.updateMatrixWorld(true);const groups=new Map(),inverse=root.matrixWorld.clone().invert();
    root.traverse(o=>{if(!o.isMesh||!this.shared.has(o.geometry))return;for(let p=o;p&&p!==root;p=p.parent)if(p.userData.dynamic)return;const key=o.geometry.uuid+o.material.uuid;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(o);});
    for(const meshes of groups.values()){if(meshes.length<2)continue;const batch=new THREE.InstancedMesh(meshes[0].geometry,meshes[0].material,meshes.length);batch.receiveShadow=true;meshes.forEach((m,i)=>{batch.setMatrixAt(i,new THREE.Matrix4().multiplyMatrices(inverse,m.matrixWorld));m.parent.remove(m);});batch.computeBoundingSphere();root.add(batch);}
  }
  setVisible(value){this.visible=value;this.landmarks.visible=value;for(const r of this.cache.values())r.group.visible=value;}
  enter(name){
    if(!places[name])name='entrance';this.active=name;
    this.build(name);this.build(places[name].next);
    while(this.cache.size>3){const key=[...this.cache.keys()].find(k=>k!==name&&k!==places[name].next);this.remove(key);}
    return new THREE.Vector3(...places[name].anchor);
  }
  interact(id,t){this.effects[id]=t;return id;}
  update(t,reduced){
    for(const [name,r] of this.cache){
      r.flowers.forEach((flower,i)=>{flower.rotation.z=reduced?0:Math.sin(t*.7+i)*.035;const bloom=this.effects.flower==null?0:Math.max(0,1-(t-this.effects.flower)/5);flower.scale.setScalar(1+bloom*.15);});
      r.lanterns.forEach((lamp,i)=>{const on=this.effects.lantern!=null&&t-this.effects.lantern>i*.28;lamp.material=this.mat('#ddbc7e',{emissive:'#e9b66f',emissiveIntensity:on?1.2:.22});});
      r.rings.forEach((ring,i)=>{const age=t-(this.effects.water??-100)-i*.45;ring.visible=age>=0&&age<3;ring.scale.setScalar(.2+Math.max(0,age)*.65);ring.material.opacity=ring.visible?(1-age/3)*.45:0;});
      if(r.water&&!reduced)r.water.position.y=-.48+Math.sin(t*.8)*.01;
      if(r.constellation)r.constellation.visible=this.effects.star!=null;
    }
  }
  hotspots(){return this.cache.get(this.active)?.hotspots||[];}
  remove(name){const r=this.cache.get(name);if(!r)return;this.scene.remove(r.group);r.group.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.geometry&&!this.shared.has(o.geometry))o.geometry.dispose();if(o.material?.isMeshBasicMaterial||o.material?.isLineBasicMaterial)o.material.dispose();});this.cache.delete(name);}
  dispose(){for(const key of [...this.cache.keys()])this.remove(key);this.scene.remove(this.landmarks);this.shared.forEach(g=>g.dispose());this.materials.forEach(m=>m.dispose());}
}
