/** One continuous sound bed; place changes retune it without restarting playback. */
export class JourneyAudio {
  constructor(){
    this.context=new(window.AudioContext||window.webkitAudioContext)();const c=this.context;
    this.output=c.createGain();this.output.gain.value=0;this.output.connect(c.destination);this.on=false;this.lastChord=-10;this.lastChime=-10;
    const buffer=c.createBuffer(1,c.sampleRate*4,c.sampleRate),data=buffer.getChannelData(0);let last=0;
    for(let i=0;i<data.length;i++){last=(last+(Math.random()*2-1)*.018)/1.018;data[i]=last*.3;}
    const seam=Math.round(c.sampleRate*.12);for(let i=0;i<seam;i++){const blend=i/(seam-1);data[data.length-seam+i]=data[data.length-seam+i]*(1-blend)+data[0]*blend;}
    this.wind=c.createBufferSource();this.wind.buffer=buffer;this.wind.loop=true;this.filter=c.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=380;
    this.wind.connect(this.filter);this.filter.connect(this.output);this.wind.start();this.place('entrance');
  }
  place(name){this.filter.frequency.setTargetAtTime({entrance:380,roses:580,grove:260,stars:700,viewpoint:340}[name]||380,this.context.currentTime,1.8);}
  async toggle(){await this.context.resume();this.on=!this.on;this.visibility();clearInterval(this.timer);if(this.on){this.chord();this.timer=setInterval(()=>this.chord(),6500);}return this.on;}
  visibility(){this.output.gain.setTargetAtTime(this.on&&!document.hidden?1:0,this.context.currentTime,.25);}
  note(frequency,at,length,volume){const c=this.context,o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=frequency;g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(volume,at+Math.min(.5,length*.3));g.gain.exponentialRampToValueAtTime(.0001,at+length);o.connect(g);g.connect(this.output);o.onended=()=>{o.disconnect();g.disconnect();};o.start(at);o.stop(at+length+.05);}
  chord(){const t=this.context.currentTime;if(!this.on||document.hidden||t-this.lastChord<6.3)return;this.lastChord=t;const notes=[[196,246.94,293.66],[174.61,220,261.63],[164.81,196,246.94]][Math.floor(t/6.5)%3];notes.forEach((f,i)=>this.note(f,t+i*.3,5.3,.018));}
  chime(){const t=this.context.currentTime;if(!this.on||document.hidden||t-this.lastChime<1.2)return;this.lastChime=t;this.note(523.25,t,.8,.016);}
  dispose(){if(this.disposed)return;this.disposed=true;clearInterval(this.timer);this.wind.stop();this.wind.disconnect();this.filter.disconnect();this.output.disconnect();this.context.close();}
}
