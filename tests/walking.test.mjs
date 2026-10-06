import test from 'node:test';
import assert from 'node:assert/strict';
import {WalkingLeg,PenguinStride,routeProgress} from '../site/walking.js';

test('Walking reaches the exact landing at varied frame rates with bounded speed',()=>{
  for(const dt of [1/120,1/60,1/30,.1]){
    const leg=new WalkingLeg({x:0,z:-13},{x:8,z:-13});let previous={x:0,z:-13},frames=0,result;
    do{result=leg.advance(dt);assert.equal(result.z,-13);assert.ok(result.x>=previous.x);assert.ok((result.x-previous.x)/dt<=1.851);previous=result;assert.ok(++frames<1500);}while(!result.done);
    assert.equal(result.x,8);assert.equal(result.z,-13);
    assert.deepEqual(leg.advance(dt),result);
  }
  assert.equal(routeProgress(0),0);assert.equal(routeProgress(1),1);
  assert.ok(routeProgress(.001)<.000001,'Start must accelerate softly');
  assert.ok(1-routeProgress(.999)<.000001,'End must brake softly');
});

test('A support foot remains planted while the other swings and turns remain finite',()=>{
  const stride=new PenguinStride();let last=[null,null],plants=0,lifts=[0,0];
  for(let i=0;i<400;i++){
    const root={x:0,z:i/60*1.4,yaw:0},sample=stride.advance(root,1/60);
    sample.feet.forEach((foot,k)=>{
      assert.ok(Number.isFinite(foot.x)&&Number.isFinite(foot.z));
      assert.ok(foot.lift>=0&&foot.lift<=.106);
      if(foot.lift>.02)lifts[k]++;
      if(foot.support&&last[k]?.support&&sample.blend>.9999){assert.deepEqual(foot.world,last[k].world);plants++;}
      last[k]=foot;
    });
    assert.ok(sample.feet.filter(f=>f.lift>.001).length<=1,'Only one foot swings at a time');
  }
  assert.ok(plants>200);assert.ok(lifts.every(n=>n>50),'Both feet must take turns');
  for(let i=0;i<90;i++)stride.advance({x:0,z:399/60*1.4,yaw:i/90*Math.PI/2},1/60,false);
  const end=stride.advance({x:0,z:399/60*1.4,yaw:Math.PI/2},1/60,false);
  assert.equal(end.blend,0);assert.equal(end.bob,0);
  end.feet.forEach((f,i)=>{assert.ok(Math.abs(f.x-(i?1:-1)*.205)<.001);assert.equal(f.z,.123);assert.equal(f.lift,0);});
});

test('A reset and gentler motion suppress stepping after a direct world change',()=>{
  const stride=new PenguinStride(.08);
  stride.advance({x:0,z:0,yaw:0},1/60);stride.advance({x:0,z:.025,yaw:0},1/60);
  stride.reset({x:8,z:-21,yaw:0});
  const sample=stride.advance({x:8,z:-21,yaw:0},1/60,false);
  assert.equal(sample.blend,0);assert.equal(sample.lean,0);assert.ok(sample.feet.every(f=>f.lift===0));
});
