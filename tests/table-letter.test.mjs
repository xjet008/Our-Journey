import test from 'node:test';
import assert from 'node:assert/strict';
import {TableLetter} from '../site/table-letter.js';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};

test('The world waits for reading and advances only after the letter returns',async()=>{
  const lift=deferred(),fold=deferred(),restore=deferred(),events=[];
  const letter=new TableLetter({lift:()=>{events.push('lift');return lift.promise;},read:()=>events.push('read'),fold:()=>{events.push('fold');return fold.promise;},restore:()=>{events.push('table');return restore.promise;},continueJourney:()=>events.push('continue'),clear:()=>events.push('clear')});
  const opening=letter.open();assert.equal(letter.open(),opening);lift.resolve();await opening;
  assert.deepEqual(events,['lift','read']);assert.equal(letter.current.phase,'reading');
  const closing=letter.close();assert.equal(letter.close(),closing);await Promise.resolve();
  assert.deepEqual(events,['lift','read','fold']);fold.resolve();await Promise.resolve();await Promise.resolve();
  assert.deepEqual(events,['lift','read','fold','table']);restore.resolve();assert.equal(await closing,true);
  assert.deepEqual(events,['lift','read','fold','table','clear','continue']);assert.equal(letter.current,null);
});

test('Escape during opening waits for the lift and returns once',async()=>{
  const lift=deferred(),events=[];
  const letter=new TableLetter({lift:()=>lift.promise,read:()=>events.push('read'),fold:()=>events.push('fold'),restore:()=>events.push('table'),continueJourney:()=>events.push('continue'),clear:()=>{}});
  letter.open();const close=letter.close();assert.equal(letter.close(),close);assert.deepEqual(events,[]);lift.resolve();
  assert.equal(await close,true);assert.deepEqual(events,['read','fold','table','continue']);
});

test('Reset during lift, folding or table return cannot advance the journey',async()=>{
  for(const phase of ['lift','fold','restore']){
    const block=deferred();let advances=0,clears=0;
    const letter=new TableLetter({lift:()=>phase==='lift'?block.promise:undefined,read:()=>{},fold:()=>phase==='fold'?block.promise:undefined,restore:()=>phase==='restore'?block.promise:undefined,continueJourney:()=>advances++,clear:()=>clears++});
    const opening=letter.open();if(phase!=='lift')await opening;
    const closing=letter.close();for(let i=0;i<5;i++)await Promise.resolve();
    letter.cancel();block.resolve();assert.equal(await closing,false);assert.equal(advances,0);assert.equal(clears,1);
  }
});
