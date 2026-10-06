export const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
export const smooth = v => {v=clamp(v,0,1);return v*v*(3-2*v);};
export const distanceToGap = value => 1.50+(1-clamp(Number(value)||0,0,100)/100)*.94;

/** The chosen distance is a preference; contact gestures never write to it. */
export class PartnerSpacing {
  constructor(value=55){this.selected=clamp(value,0,100);this.override=null;}
  choose(value){this.selected=clamp(Number(value)||0,0,100);}
  contact(kind,now,{persistent=false}={}){
    const gap=kind==='kiss'?1.28:kind==='hug'?1.36:kind==='hand'?1.52:null;
    this.override=gap==null?null:{kind,gap,start:now,end:persistent?Infinity:now+7.6,persistent};
  }
  release(now){
    if(now!=null&&this.override){const phase=this.sample(now).phase;if(this.override){this.override={...this.override,returnStart:now,returnPhase:phase,end:now+1.25,persistent:false};}return;}
    this.override=null;
  }
  sample(now){
    const normal=distanceToGap(this.selected),o=this.override;
    if(!o)return {gap:normal,kind:'idle',phase:0};
    const age=now-o.start;
    if(now>=o.end){this.release();return {gap:normal,kind:'idle',phase:0};}
    if(o.returnStart!=null){const weight=o.returnPhase*(1-smooth((now-o.returnStart)/1.25));return {gap:normal+(o.gap-normal)*weight,kind:o.kind,phase:weight,age};}
    const approach=smooth((age-.65)/1.35);
    const leaving=o.persistent?1:1-smooth((age-5.9)/1.7);
    const weight=approach*leaving;
    return {gap:normal+(o.gap-normal)*weight,kind:o.kind,phase:weight,age};
  }
}
