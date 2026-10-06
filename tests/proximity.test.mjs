import test from 'node:test';
import assert from 'node:assert/strict';
import {PartnerSpacing,distanceToGap} from '../site/proximity.js';
import {connectors,decks,bench} from '../site/world-layout.js';

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

test('interrupting contact separates smoothly and preserves the latest choice',()=>{
 const s=new PartnerSpacing(0);s.contact('hug',0);const before=s.sample(3).gap;s.release(3);
 assert.equal(s.sample(3).gap,before);s.choose(55);
 const samples=Array.from({length:51},(_,i)=>s.sample(3+i/40).gap);
 assert.ok(samples.every((v,i)=>!i||v>=samples[i-1]));assert.equal(s.sample(5).gap,distanceToGap(55));assert.equal(s.selected,55);
});
test('connected walking surfaces meet at their edges without overlapping',()=>{
 const anchors={entrance:[0,-6],roses:[0,-13],grove:[8,-13],stars:[8,-21],viewpoint:[8,-27]},order=Object.keys(anchors);
 connectors.forEach((c,i)=>{const a=anchors[c.owner],next=order[i+1],b=anchors[next],axis=c.axis==='x'?0:1,dimension=c.axis==='x'?'width':'depth',sign=Math.sign(b[axis]-a[axis]);assert.equal(c.start,sign*decks[c.owner][dimension]/2);assert.ok(Math.abs(a[axis]+c.end-(b[axis]-sign*decks[next][dimension]/2))<1e-9);assert.ok(c.width/2>2.44/2+.575+.15);});
 assert.ok(Math.abs(bench.x)-bench.width/2>1.22+.575,'Bench blocks the central walk');
});
