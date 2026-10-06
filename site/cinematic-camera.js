import * as THREE from './assets/three.module.min.js';
import {smooth,clamp} from './proximity.js';

export class GuidedCamera {
  constructor(camera){this.camera=camera;this.drag=0;this.look=0;this.gatewayStart=null;this.position=new THREE.Vector3();this.target=new THREE.Vector3();}
  gateway(now){this.gatewayStart=now;}
  update({anchor,scene,place,elapsed,dt,reduced,wide,aspect}){
    const portrait=aspect<.8;
    const inside=!['welcome','customize'].includes(scene);
    let distance=portrait?11.6:scene==='selfie'?9.0:wide&&inside?10.0:9.1;
    const preset={entrance:[.13,3.5,.95],roses:[-.08,3.45,1.00],grove:[.16,3.9,1.12],stars:[.08,3.25,1.0],viewpoint:[-.10,3.1,1.10]}[place]||[.22,3.35,1.02];
    const yaw=(portrait?.03:preset[0])+this.drag*.12;
    const look=this.look*(portrait?.32:1);
    if(inside&&wide)distance+=.5;
    this.target.copy(anchor).add(new THREE.Vector3(wide?-1.25:0,(portrait?.9:preset[2])+look*1.1,0));
    this.position.set(this.target.x+Math.sin(yaw)*distance,preset[1]+look*.6,this.target.z+Math.cos(yaw)*distance);
    if(scene==='portal'&&this.gatewayStart!=null&&!reduced){
      const p=clamp((elapsed-this.gatewayStart)/5.4,0,1),turn=smooth(p);
      // A shallow arc stays on the clear entrance side of the trees and door.
      const angle=.12+Math.sin(turn*Math.PI)*.18;
      const follow=portrait?11.6:9.3-smooth(p)*.5;
      this.target.copy(anchor).add(new THREE.Vector3(0,1.1,-.6));
      this.position.set(anchor.x+Math.sin(angle)*follow,3.6,anchor.z+Math.cos(angle)*follow);
    }
    if(reduced&&scene==='portal')this.position.set(anchor.x+1.7,3.0,anchor.z+9);
    const blend=1-Math.exp(-dt*(scene==='portal'?2.8:3.0));
    this.camera.position.lerp(this.position,blend);
    this.currentTarget??=this.target.clone();this.currentTarget.lerp(this.target,blend);this.camera.lookAt(this.currentTarget);
    this.camera.fov=portrait?45:36;this.camera.updateProjectionMatrix();
  }
}

export class AdaptiveQuality {
  constructor(renderer,keyLight){this.renderer=renderer;this.light=keyLight;this.mode='auto';this.level=(navigator.deviceMemory||8)<=4||(navigator.hardwareConcurrency||8)<=4?'low':matchMedia('(pointer:coarse)').matches?'medium':'high';this.frames=0;this.total=0;this.apply();}
  apply(){const q={low:{dpr:1,shadow:false},medium:{dpr:1.25,shadow:true},high:{dpr:1.6,shadow:true}}[this.level];this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,q.dpr));this.renderer.shadowMap.enabled=q.shadow;const size=this.level==='high'?1024:512;if(this.light.shadow.mapSize.x!==size||!q.shadow){this.light.shadow.map?.dispose();this.light.shadow.map=null;}this.light.shadow.mapSize.set(size,size);this.light.shadow.needsUpdate=true;}
  choose(value){this.mode=value;if(value!=='auto')this.level=value;this.apply();}
  sample(dt){if(this.mode!=='auto'||document.hidden)return;if(++this.frames<180){this.total+=Math.min(dt,.15);return;}const average=this.total/this.frames;this.frames=0;this.total=0;if(average>.034&&this.level!=='low'){this.level=this.level==='high'?'medium':'low';this.apply();}}
}
