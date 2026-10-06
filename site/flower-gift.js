import {smooth} from './proximity.js';

export const FLOWER_GIFT_DURATION=7.6;
const rise=(age,start,end)=>smooth((age-start)/(end-start));

// One continuous sequence: pick, offer, pass, tuck, and relax.
export function flowerGiftPose(age,{preview=false,reduced=false}={}){
  age=Math.max(0,preview?Math.min(age,2.55):age);
  const pick=rise(age,.12,.9)*(1-rise(age,1.05,2.15));
  const offer=rise(age,1.05,2.55)*(1-rise(age,3.6,4.6));
  const receive=preview?0:rise(age,2.55,3.15)*(1-rise(age,5.95,6.75));
  const transfer=preview?0:rise(age,3.15,3.65);
  const tuck=preview?0:rise(age,4.15,5.75);
  const worn=preview?0:rise(age,5.7,6.15);
  const opacity=rise(age,reduced?.1:.45,reduced?.5:.8)*(1-worn);
  return {pick:reduced?0:pick,offer,receive,transfer,tuck,worn,opacity,
    wear:!preview&&age>=5.7,visible:preview||age<6.15,done:!preview&&age>=FLOWER_GIFT_DURATION};
}
