import * as THREE from './assets/three.module.min.js';
import {smooth} from './proximity.js';

// A tapered flipper, rooted at its shoulder. Deform the mesh rather than
// translating the shoulder to put a disconnected oval in front of a body.
export function createFlipper(mat,side){
  const segments=14,rings=8,positions=new Float32Array((segments+1)*rings*3),indices=[];
  for(let i=0;i<segments;i++)for(let j=0;j<rings;j++){
    const a=i*rings+j,b=i*rings+(j+1)%rings,c=(i+1)*rings+j,d=(i+1)*rings+(j+1)%rings;
    indices.push(a,c,b,b,c,d);
  }
  for(let j=1;j<rings-1;j++){indices.push(0,j+1,j);const end=segments*rings;indices.push(end,end+j,end+j+1);}
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setIndex(indices);
  const mesh=new THREE.Mesh(geometry,mat);mesh.castShadow=true;mesh.receiveShadow=true;
  mesh.userData.side=side;mesh.userData.segments=segments;mesh.userData.rings=rings;
  bendFlipper(mesh,0,'idle',1.4);
  return mesh;
}

export function bendFlipper(mesh,weight,kind,gap){
  const side=mesh.userData.side;
  const rest=[[0,0,0],[side*.055,-.14,.025],[side*.07,-.34,.025],[side*.03,-.48,.04]];
  let target=rest;
  if(kind==='hug')target=[[0,0,0],[.25,.14,-.30],[gap-.5-.28,.10,-.72],[gap-.5+.02,-.03,-.68]];
  if(kind==='heart')target=[[0,0,0],[side*.11,-.13,.28],[-side*.18,-.14,.56],[-side*.39,.05,.60]];
  if(kind==='hand')target=[[0,0,0],[side*.08,-.15,.12],[side*.16,-.3,.26],[side*(gap/2-.5),-.32,.35]];
  const points=rest.map((p,i)=>new THREE.Vector3(...p).lerp(new THREE.Vector3(...target[i]),smooth(weight)));
  deformFlipper(mesh,points);
}

export function bendFlowerFlipper(mesh,pose,gap,female){
  const side=mesh.userData.side;
  const rest=[[0,0,0],[side*.055,-.14,.025],[side*.07,-.34,.025],[side*.03,-.48,.04]];
  const pick=[[0,0,0],[side*.08,-.25,.13],[side*.12,-.55,.25],[side*.08,-.75,.30]];
  const offer=[[0,0,0],[side*.10,-.12,.23],[side*.18,-.25,.53],[side*(gap/2-.5),-.28,.66]];
  const tuck=[[0,0,0],[-.05,.05,.38],[.13,.36,.49],[.19,.48,.162]];
  const points=rest.map((p,i)=>{
    const v=new THREE.Vector3(...p);
    if(female)v.lerp(new THREE.Vector3(...offer[i]).lerp(new THREE.Vector3(...tuck[i]),pose.tuck),pose.receive);
    else v.lerp(new THREE.Vector3(...pick[i]),pose.pick).lerp(new THREE.Vector3(...offer[i]),pose.offer);
    return v;
  });
  deformFlipper(mesh,points);
}

function deformFlipper(mesh,points){
  const curve=new THREE.CatmullRomCurve3(points),frames=curve.computeFrenetFrames(mesh.userData.segments,false);
  const attr=mesh.geometry.attributes.position;
  for(let i=0;i<=mesh.userData.segments;i++){
    const t=i/mesh.userData.segments,center=curve.getPoint(t);
    const radius=t===1?.008:.065+.085*Math.sin(Math.PI*t);
    for(let j=0;j<mesh.userData.rings;j++){
      const angle=j/mesh.userData.rings*Math.PI*2;
      const point=center.clone().addScaledVector(frames.normals[i],Math.cos(angle)*radius).addScaledVector(frames.binormals[i],Math.sin(angle)*radius*.55);
      attr.setXYZ(i*mesh.userData.rings+j,point.x,point.y,point.z);
    }
  }
  attr.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere();
}

export const moodAliases={curious:'curious',nervous:'shy',hopeful:'hopeful',excited:'happy',surprised:'surprised',disappointed:'patient',waiting:'patient',playful:'funny',affectionate:'hug',comforting:'comfort',celebrating:'happy'};
export function moodPose(kind,t,variation=0,female=false){
  const quiet=female?.45:1;
  switch(kind){
    case 'curious':return {headX:.09,headY:Math.sin(t*.8)*.15*quiet,headZ:-.07*quiet};
    case 'shy':return {headX:.12,headY:-.2*quiet,headZ:-.09*quiet,right:.4};
    case 'hopeful':return {headX:-.07,headY:.12*quiet,headZ:.04*quiet};
    case 'surprised':return {headX:-.12,headZ:.06,bounce:Math.max(0,Math.sin(t*4))*.045};
    case 'patient':return variation%3===1?{headX:.03,headY:Math.sin(t*.25)*.16,headZ:.04}:variation%3===2?{headX:.12,headY:-.08,headZ:-.08}:{headX:.08,headY:Math.sin(t*.35)*.10,headZ:-.03};
    case 'comfort':return {headX:.07,headY:female?-.16:.16,headZ:female?.065:-.065};
    case 'happy':return variation%3===1?{headZ:Math.sin(t*2)*.05,left:-.6,right:.75}:variation%3===2?{headY:Math.sin(t)*.14,headZ:-.07}:{};
    default:return {};
  }
}
