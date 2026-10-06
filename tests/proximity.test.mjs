import test from 'node:test';
import assert from 'node:assert/strict';
import {PartnerSpacing,distanceToGap} from '../site/proximity.js';

for(const selected of [0,55,100]){
  test(`temporary contact returns to chosen distance ${selected}`,()=>{
    for(const kind of ['hug','kiss','hand']){
      const spacing=new PartnerSpacing(selected);
      spacing.contact(kind,10);
      assert.equal(spacing.sample(10.5).gap,distanceToGap(selected));
      for(let now=10;now<18;now+=.025){
        const {gap}=spacing.sample(now);
        assert.equal(spacing.selected,selected);
        assert.ok(gap>=1.28&&gap<=2.44);
      }
      assert.equal(spacing.sample(18).gap,distanceToGap(selected));
    }
  });
}
test('changing preference during a hug changes the return distance',()=>{
  const spacing=new PartnerSpacing(55);
  spacing.contact('hug',0);
  spacing.choose(0);
  assert.equal(spacing.sample(3).gap,1.36);
  assert.equal(spacing.sample(8).gap,distanceToGap(0));
});
test('a held selfie pose preserves preference until released',()=>{
  const spacing=new PartnerSpacing(0);
  spacing.contact('kiss',0,{persistent:true});
  assert.equal(spacing.sample(100).gap,1.28);
  assert.equal(spacing.selected,0);
  spacing.release();
  assert.equal(spacing.sample(101).gap,distanceToGap(0));
});
