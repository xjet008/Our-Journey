import test from 'node:test';
import assert from 'node:assert/strict';
import {SceneHandoff} from '../site/scene-handoff.js';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};

test('Repeated Continue/arrival events cover once, swap once, then reveal',async()=>{
  const cover=deferred(),events=[];
  const handoff=new SceneHandoff({cover:()=>{events.push('cover');return cover.promise;},swap:()=>events.push('swap'),reveal:()=>events.push('reveal'),clear:()=>events.push('clear')});
  const first=handoff.run();assert.equal(handoff.run(),first);assert.deepEqual(events,['cover']);
  cover.resolve();assert.equal(await first,true);assert.deepEqual(events,['cover','swap','reveal','clear']);assert.equal(handoff.current,null);
});

test('Reset during the outgoing fade cannot reopen the letter',async()=>{
  const cover=deferred();let swaps=0;
  const handoff=new SceneHandoff({cover:()=>cover.promise,swap:()=>swaps++,reveal:()=>{},clear:()=>{}});
  const old=handoff.run();handoff.cancel();cover.resolve();assert.equal(await old,false);assert.equal(swaps,0);assert.equal(handoff.current,null);
});

test('A cancelled old reveal does not own or clear a newer handoff',async()=>{
  const reveal=deferred();let calls=0;
  const handoff=new SceneHandoff({cover:()=>{},swap:()=>{},reveal:()=>++calls===1?reveal.promise:Promise.resolve(),clear:()=>{}});
  const old=handoff.run();await Promise.resolve();await Promise.resolve();handoff.cancel();
  const next=handoff.run();reveal.resolve();assert.equal(await old,false);assert.equal(await next,true);assert.equal(calls,2);
});
