import test from 'node:test';
import assert from 'node:assert/strict';
import {flowerGiftPose,FLOWER_GIFT_DURATION} from '../site/flower-gift.js';
import {PartnerSpacing,distanceToGap} from '../site/proximity.js';

test('The flower passes only after both flippers are ready and then becomes her accessory',()=>{
  assert.ok(flowerGiftPose(.9).pick>.9);
  assert.equal(flowerGiftPose(3.15).transfer,0);
  assert.equal(flowerGiftPose(3.15).receive,1);
  assert.equal(flowerGiftPose(3.65).transfer,1);
  assert.equal(flowerGiftPose(5.7).tuck>.99,true);
  assert.equal(flowerGiftPose(5.7).wear,true);
  assert.equal(flowerGiftPose(6.15).worn,1);
  assert.equal(flowerGiftPose(6.15).visible,false);
  assert.equal(flowerGiftPose(FLOWER_GIFT_DURATION).done,true);
});

test('Picking waits for acceptance and every animation channel remains continuous',()=>{
  const waiting=flowerGiftPose(100,{preview:true});
  assert.equal(waiting.visible,true);assert.equal(waiting.transfer,0);assert.equal(waiting.wear,false);
  assert.deepEqual(waiting,flowerGiftPose(2.55,{preview:true}));
  for(const options of [{},{preview:true},{reduced:true}]){
    let previous=flowerGiftPose(0,options);
    for(let age=.001;age<8;age+=.001){
      const pose=flowerGiftPose(age,options);
      for(const key of ['pick','offer','receive','transfer','tuck','worn','opacity']){
        assert.ok(pose[key]>=0&&pose[key]<=1);
        assert.ok(Math.abs(pose[key]-previous[key])<.005,`${key} snaps`);
      }
      previous=pose;
    }
  }
  assert.equal(flowerGiftPose(.9,{reduced:true}).pick,0);
});

test('Giving a flower preserves and restores the latest chosen distance',()=>{
  for(const value of [0,55,100]){
    const spacing=new PartnerSpacing(value);spacing.contact('flower',10);
    assert.equal(spacing.sample(13).gap,1.52);assert.equal(spacing.selected,value);
    spacing.choose(100-value);
    assert.equal(spacing.sample(18).gap,distanceToGap(100-value));assert.equal(spacing.override,null);
  }
});
