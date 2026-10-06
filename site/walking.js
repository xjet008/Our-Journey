const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const ease=t=>t*t*t*(10+t*(-15+6*t));
const damp=(a,b,dt,rate)=>a+(b-a)*(1-Math.exp(-dt*rate));

// Integrate a smooth speed ramp, a steady middle, and a smooth brake.
// Unlike exponential chasing, a leg reaches its exact endpoint in finite time.
export function routeProgress(t,ramp=.2){
  t=clamp(t);
  if(t<ramp){const u=t/ramp;return ramp*(u*u*u-.5*u*u*u*u)/(1-ramp);}
  if(t>1-ramp)return 1-routeProgress(1-t,ramp);
  return (t-ramp/2)/(1-ramp);
}

export class WalkingLeg {
  constructor(from,to,speed=1.85){
    this.from={x:from.x,z:from.z};this.to={x:to.x,z:to.z};
    this.length=Math.hypot(to.x-from.x,to.z-from.z);
    this.duration=Math.max(.65,this.length/(speed*.8));
    this.elapsed=0;this.turnTime=.28;
    this.yaw=Math.atan2(to.x-from.x,to.z-from.z);
  }
  advance(dt){
    this.elapsed=Math.min(this.duration+this.turnTime,this.elapsed+Math.max(0,dt));
    const t=clamp((this.elapsed-this.turnTime)/this.duration),p=routeProgress(t);
    return {x:this.from.x+(this.to.x-this.from.x)*p,z:this.from.z+(this.to.z-this.from.z)*p,progress:p,done:t===1};
  }
}

// Feet are independent of the torso's waddle. A support foot stays at its
// planted world position while the other swings to the next small footprint.
export class PenguinStride {
  constructor(offset=0){this.offset=offset;this.reset();}
  reset(root){this.phase=.25+this.offset;this.blend=0;this.previous=root?{...root}:null;this.feet=[{},{}];this.direction={x:0,z:1};}
  advance(root,dt,enabled=true){
    const dx=this.previous?root.x-this.previous.x:0,dz=this.previous?root.z-this.previous.z:0;
    const distance=Math.hypot(dx,dz),speed=dt>0?distance/dt:0;
    this.previous={...root};
    const moving=enabled&&distance>.00002&&distance<.45;
    const wasMoving=this.blend>.03;
    this.blend=damp(this.blend,moving?clamp(speed/.4):0,dt,moving?12:10);
    // Short steps keep a penguin's ankles under its round body.
    const stride=.52;
    if(moving){this.direction={x:dx/distance,z:dz/distance};this.phase+=distance/stride;}
    const sin=Math.sin(root.yaw),cos=Math.cos(root.yaw);
    const world=(x,z)=>({x:root.x+x*cos+z*sin,z:root.z-x*sin+z*cos});
    const feet=this.feet.map((foot,i)=>{
      const side=i?1:-1,rest=world(side*.205,.123),fraction=((this.phase+i*.5)%1+1)%1;
      const swing=fraction>=.5,u=(fraction-.5)*2;
      if(!foot.plant||!wasMoving){foot.plant=rest;foot.swing=null;}
      if(moving&&swing&&!foot.swing){
        foot.swing={start:foot.plant,startU:Math.max(0,u),target:{x:rest.x+this.direction.x*stride*(1-fraction+.25),z:rest.z+this.direction.z*stride*(1-fraction+.25)}};
      }
      let point=foot.plant,lift=0,pitch=0;
      if(swing&&foot.swing){
        const p=clamp((u-foot.swing.startU)/(1-foot.swing.startU||1)),e=ease(p);
        point={x:foot.swing.start.x+(foot.swing.target.x-foot.swing.start.x)*e,z:foot.swing.start.z+(foot.swing.target.z-foot.swing.start.z)*e};
        lift=Math.sin(p*Math.PI)**2*.105;pitch=-Math.sin(p*Math.PI)*.16;
      }else if(foot.swing){foot.plant=foot.swing.target;foot.swing=null;point=foot.plant;}
      // A turn or a distance adjustment can move the torso away from a
      // planted footprint. Release that footprint before the leg stretches.
      const reach=Math.hypot(point.x-rest.x,point.z-rest.z);
      if(reach>.20){
        point={x:rest.x+(point.x-rest.x)*.20/reach,z:rest.z+(point.z-rest.z)*.20/reach};
        if(!swing)foot.plant=point;
      }
      const x=point.x-root.x,z=point.z-root.z;
      return {x:side*.205+(x*cos-z*sin-side*.205)*this.blend,z:.123+(x*sin+z*cos-.123)*this.blend,lift:lift*this.blend,pitch:pitch*this.blend,support:!swing,world:point};
    });
    if(this.blend<.001){this.blend=0;this.feet=[{},{}];}
    const cycle=this.phase*Math.PI*2;
    return {feet,blend:this.blend,lean:Math.sin(cycle)*.055*this.blend,bob:(1-Math.cos(cycle*2))*.012*this.blend,swing:Math.sin(cycle)*this.blend};
  }
}
