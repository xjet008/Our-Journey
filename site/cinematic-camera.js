import * as THREE from './assets/three.module.min.js';
import {smooth,clamp} from './proximity.js';

export class GuidedCamera {
  constructor(camera){this.camera=camera;this.drag=0;this.look=0;this.gatewayStart=null;this.position=new THREE.Vector3();this.target=new THREE.Vector3();}
  gateway(now){this.gatewayStart=now;}
  update({anchor,scene,elapsed,dt,reduced,wide,aspect}){
    const portrait=aspect<.8;
    const inside=!['welcome','customize'].includes(scene);
    let distance=portrait?11.6:scene==='selfie'?9.0:wide&&inside?10.0:9.1;
    const yaw=(portrait?.06:.22)+this.drag*.16;
    this.target.copy(anchor).add(new THREE.Vector3(wide?-1.25:0,(portrait?.80:1.02)+this.look*1.9,0));
    this.position.set(this.target.x+Math.sin(yaw)*distance,3.35+this.look*.8,this.target.z+Math.cos(yaw)*distance);
    if(scene==='portal'&&this.gatewayStart!=null&&!reduced){
      const p=clamp((elapsed-this.gatewayStart)/5.4,0,1),turn=smooth((p-.08)/.45);
      const angle=.22+turn*Math.PI;
      const follow=7.4-smooth((p-.65)/.35)*1.3;
      this.target.copy(anchor).add(new THREE.Vector3(0,1.1,-.6));
      this.position.set(anchor.x+Math.sin(angle)*follow,2.7,anchor.z+Math.cos(angle)*follow);
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
