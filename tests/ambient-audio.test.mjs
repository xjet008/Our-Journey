import test from 'node:test';
import assert from 'node:assert/strict';
import {JourneyAudio} from '../site/ambient-audio.js';

test('ambience stays continuous, discovery taps are bounded, and hidden pages mute',async()=>{
 let contextCount=0,oscillators=0;
 const parameter=()=>({value:0,events:[],setTargetAtTime(value,time,smoothing){this.events.push({value,time,smoothing});},setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
 const node=()=>({gain:parameter(),frequency:parameter(),connect(){},disconnect(){},start(){this.started=true;},stop(){this.stopped=true;}});
 class AudioContext {
  constructor(){contextCount++;this.sampleRate=100;this.currentTime=0;this.destination={};}
  createGain(){return node();}createBiquadFilter(){return node();}createBufferSource(){return node();}
  createBuffer(_,length){const data=new Float32Array(length);return {getChannelData:()=>data};}
  createOscillator(){oscillators++;return node();}async resume(){}async close(){this.closed=true;}
 }
 globalThis.window={AudioContext};globalThis.document={hidden:false};let audio;
 try{
  audio=new JourneyAudio();await audio.toggle();assert.equal(oscillators,3);
  for(let i=0;i<50;i++){audio.chord();audio.chime();}assert.equal(oscillators,4,'Rapid taps stack sound');
  audio.place('stars');audio.place('grove');assert.equal(contextCount,1);assert.equal(audio.wind.started,true);assert.ok(audio.filter.frequency.events.every(e=>e.smoothing>1));
  document.hidden=true;audio.visibility();assert.equal(audio.output.gain.events.at(-1).value,0);assert.equal(audio.on,true);audio.chord();audio.chime();assert.equal(oscillators,4);
  document.hidden=false;audio.context.currentTime=7;audio.visibility();audio.chord();assert.equal(oscillators,7);
  await audio.toggle();assert.equal(audio.on,false);assert.equal(audio.output.gain.events.at(-1).value,0);
  audio.dispose();assert.equal(audio.wind.stopped,true);assert.equal(audio.context.closed,true);
 }finally{audio?.dispose();delete globalThis.window;delete globalThis.document;}
});
