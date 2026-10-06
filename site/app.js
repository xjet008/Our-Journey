import { JourneyWorld } from './world.js';
import { JourneyAudio } from './ambient-audio.js';
import {rememberChapter,restoreChapter} from './navigation.js';
import {SceneHandoff} from './scene-handoff.js';
import { createMemoryCard, downloadBlob, shareMemory } from './memory.js';

const $ = s => document.querySelector(s);
const story = $('#story');
let film = $('#film');
let sectionAnimation, filmPauseTimer, lastSectionKey;
const KEY = 'our-little-journey-v1';
const draftLetter = "Hey, you.\n\nI made this little place so we could have a moment that belongs to us. No rush. No perfect things to say.\n\nI miss the easy conversations, the small laughs, and simply feeling beside you. I want to listen a little better, and make more room for what matters to you.\n\nFor now, I’m happy you’re here. Let’s take one little step at a time.";
const draftMessage = "I don’t expect everything to become perfect because of one little journey. I just wanted us to stop for a moment, talk, laugh, and maybe find our way a little closer again.";
const accessoryOptions = [{id:'bow',label:'Silk bow'},{id:'flower',label:'Rose bloom'},{id:'tiara',label:'Tiny tiara'},{id:'pearls',label:'Pearl necklace'},{id:'ribbon',label:'Ribbon'},{id:'heart',label:'Heart clip'}];
const defaults = () => ({scene:'welcome',history:[],accessory:'bow',accent:'#ee9eb5',distance:55,currentDistance:55,selectedPartnerDistance:55,finalDistance:55,discoveries:[],answers:[],moments:[],visited:[],conversations:[],location:'roses',waitCount:0,personalIndex:0,pose:'Standing together',letter:draftLetter,message:draftMessage,date:new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})});
let state=defaults();
try { const saved=JSON.parse(sessionStorage.getItem(KEY)); if(saved?.scene) state={...state,...saved,selectedPartnerDistance:saved.selectedPartnerDistance??saved.currentDistance??55}; } catch {}
state.selectedPartnerDistance=Number(state.selectedPartnerDistance??state.currentDistance??55);
state.discoveries??=[];
if(!accessoryOptions.some(option=>option.id===state.accessory)) state.accessory='bow';
state.accent=({'#dba7a1':'#ee9eb5','#c6b2d9':'#cfacd9','#92b5ac':'#f1c6ad','#eac3a5':'#f8dae5'})[state.accent]??state.accent;
let reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
try { reduced=JSON.parse(localStorage.getItem('journey-gentle-motion'))??reduced; const words=JSON.parse(localStorage.getItem('journey-words')); if(words) {state.letter=words.letter;state.message=words.message;} } catch {}
let journeyEpoch=0, journeyAudio;
let world, timer, toastTimer, currentBlob, cardURL, selfieURL, soundOn=false, returnScene='explore', busy=false, waitingReask=false;
const escape = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(label,action,kind='primary')=>`<button class="${kind}" data-action="${action}">${label}${kind==='primary'?'<span aria-hidden="true">↗</span>':''}</button>`;
const heading=(eyebrow,title,description='')=>`<p class="eyebrow">${eyebrow}</p><h2 tabindex="-1">${title}</h2>${description?`<p class="intro">${description}</p>`:''}`;
const distanceLabel = value => value<20?'Very far':value<40?'A little distant':value<65?'Somewhere in between':value<88?'Close':'Right beside you';
const locations={roses:{title:'The rose garden',description:'A quiet path, a few flowers, a little us.',video:'welcome',question:0},grove:{title:'The lantern grove',description:'Follow the warm lights. Take the long way.',video:'forest',question:1},stars:{title:'Under the stars',description:'Find a little light. Make a little wish.',video:'forest',question:2}};
const conversations=[
 {question:'What do you miss most about us?',options:['Our conversations','Our stupid jokes','Feeling close','Your attention','Something else'],replies:['Then let’s make more room for those. I’m listening.','Excellent. My terrible jokes have a purpose.','I miss that too. We can take our time.','You deserve more of it. I hear you.','Tell me in your own words.'],reactions:['wave','funny','happy','wave','wave']},
 {question:'If we could disappear somewhere tonight…',options:['Beach','Mountains','Cozy room + movies','Long night drive','Anywhere, as long as we’re together'],replies:['I’ll bring the snacks. You pick the sunset.','A very big view, and a little hand to hold.','Blanket duty? Happily accepted.','Your playlist. The scenic route.','That sounds like my favourite place.'],reactions:['happy','wave','comfort','funny','heart']},
 {question:'How annoying am I?',options:['A little','Very','Extremely','Unfortunately still cute'],replies:['I’ll call that a glowing review.','Fair. I’ll work on the “very” part.','A personal best. Time to behave.','I knew this little grin was doing something.'],reactions:['happy','wait','funny','heart']}
];
const personal=[
 {question:'What do you wish I understood better?',options:['I need you to really listen','Small things matter to me','Sometimes I need a little space']},
 {question:'What makes you feel loved?',options:['Time together, without distractions','Kind words and reassurance','The little things you do']},
 {question:'What should we never lose?',options:['Our laughter','Being honest with each other','Making time for us']}
];
function updateWalkingHint(){const walking=world?.isTravelling();document.body.dataset.walking=String(!!walking);$('#footerHint').textContent=walking?'A few little steps, together…':state.scene==='explore'?'Follow your curiosity.':'A little escape. At your pace.';}
function save(){try{sessionStorage.setItem(KEY,JSON.stringify(state));}catch{}}
function moment(text){if(!state.moments.includes(text))state.moments.push(text);save();}
function answer(question,value){const existing=state.answers.find(a=>a.question===question);if(existing)existing.answer=value;else state.answers.push({question,answer:value});save();}
function toast(text){clearTimeout(toastTimer);$('#toast').textContent=text;$('#toast').classList.add('show');toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3800);}
function bubble(text){$('#bubble').textContent=text;}
function video(name){
 if(film.dataset.clip===name){if(reduced)film.pause();else film.play().catch(()=>{});return;}
 const previous=film,incoming=film.id==='film'?$('#filmNext'):$('#film');
 clearTimeout(filmPauseTimer);
 if(incoming.dataset.clip!==name){incoming.dataset.clip=name;incoming.poster=`assets/${name}-poster.jpg`;incoming.src=`assets/${name}.mp4`;incoming.load();}
 incoming.classList.add('film-active');previous.classList.remove('film-active');film=incoming;
 if(reduced)incoming.pause();else incoming.play().catch(()=>{});
 filmPauseTimer=setTimeout(()=>{if(previous!==film)previous.pause();},800);
}
function animateSection(){
 const key=[state.scene,state.location,state.personalIndex].join(':');
 if(key===lastSectionKey)return;lastSectionKey=key;
 if(reduced)return;
 sectionAnimation?.cancel();
 const travel=state.scene==='portal';
 const frames=travel?[{opacity:0,transform:'translateY(12px) scale(.98)'},{opacity:1,transform:'translateY(0) scale(1)'}]:[{opacity:0,transform:'translateY(14px)'},{opacity:1,transform:'translateY(0)'}];
 sectionAnimation=story.animate(frames,{duration:travel?650:420,easing:'cubic-bezier(.2,.7,.2,1)'});
}

const gatewayHandoff=new SceneHandoff({
 cover:token=>{
  token.layer=document.createElement('div');token.layer.className='gateway-handoff';token.layer.setAttribute('aria-hidden','true');
  token.layer.innerHTML='<span>✧</span>';document.body.append(token.layer);
  token.wasInert=$('#main').inert;$('#main').inert=true;document.body.dataset.gatewayTransition='cover';
  token.animation=token.layer.animate([{opacity:0},{opacity:1}],{duration:reduced?0:230,easing:'ease-in',fill:'forwards'});
  return token.animation.finished;
 },
 swap:async token=>{
  if(state.scene!=='portal'){token.cancelled=true;return;}
  go('letterClosed');world?.settle({forward:true,snapCamera:true});
  document.body.dataset.gatewayTransition='reveal';
  // Render the landing, resting feet and final camera beneath the veil.
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 },
 reveal:token=>{
  token.animation=token.layer.animate([{opacity:1},{opacity:0}],{duration:reduced?100:620,easing:'cubic-bezier(.2,.7,.2,1)',fill:'forwards'});
  return token.animation.finished;
 },
 clear:token=>{
  token.animation?.cancel();token.layer?.remove();
  if(!document.querySelector('.gateway-handoff')){
   $('#main').inert=token.wasInert??false;delete document.body.dataset.gatewayTransition;
   if(state.scene==='letterClosed')story.querySelector('h2')?.focus({preventScroll:true});
  }
 }
});
async function leaveGateway(){
 if(state.scene!=='portal')return;
 const epoch=journeyEpoch;
 try{await gatewayHandoff.run();}
 catch(error){if(epoch!==journeyEpoch||state.scene!=='portal')return;go('letterClosed');world?.settle({forward:true,snapCamera:true});console.warn('The doorway used its simple transition',error);}
}

function go(scene,{back=false}={}){if(busy)return;clearTimeout(timer);if(!back&&state.scene!==scene&&state.scene!=='portal')rememberChapter(state);state.scene=scene;save();render();window.scrollTo({top:0,behavior:'instant'});story.querySelector('h1,h2')?.focus({preventScroll:true});}
function back(){if(busy)return;if(state.scene==='personal'&&state.personalIndex>0){state.personalIndex--;save();render();}else{if(!restoreChapter(state))return;save();render();}window.scrollTo({top:0,behavior:'instant'});story.querySelector('h1,h2')?.focus({preventScroll:true});}
function applyWorld(){
 if(!world)return;
 const scene=state.scene,alone=['welcome','waiting','confirm','maybe'].includes(scene);
 world.setDistance(state.selectedPartnerDistance);
 world.quiet=['letter','letterClosed','conversation','personal','moment','final','memory'].includes(scene);
 world.environments.discoveries=state.discoveries;journeyAudio?.place(['explore','conversation','moment'].includes(scene)?state.location:['final','selfie','memory'].includes(scene)?'viewpoint':'entrance');
 world.setScene(({welcome:'welcome',waiting:'welcome',confirm:'welcome',maybe:'welcome',customize:'customize',portal:'portal',letterClosed:'letter',letter:'letter',distance:'distance',explore:'journey',conversation:'journey',personal:'journey',moment:'journey',final:'final',selfie:'selfie',memory:'memory'})[scene]??'welcome');
 world.setCompanion(!alone);world.setAccessory(state.accessory,state.accent);
 if(['explore','conversation','moment'].includes(scene))world.setLocation(state.location);
 if(scene==='personal')world.setLocation('stars');
 if(scene==='selfie'||scene==='memory')world.setPose(state.pose);
 if(scene==='welcome')world.react('curious');if(scene==='confirm')world.react(state.waitCount?'surprised':'excited');
 if(scene==='waiting'||scene==='maybe')world.react('patient',state.waitCount%3);
}
const worldCopy={letter:['Open the little letter','✉'],flower:['Touch a flower','✿'],lantern:['Light the lantern path','✧'],water:['Make a ripple','≈'],bench:['Sit beside the lake','⌑'],moon:['Look at the moon','☾'],star:['Connect the little stars','✦'],note:['Find a hidden note','✧'],next:['Follow the path','→'],penguin:['Say hello to him','♡']};
function showHotspots(points){
 const enabled=['letterClosed','explore','final'].includes(state.scene),root=$('#worldHotspots');
 const ids=enabled?points.map(p=>p.id).join(','):'';
 if(root.dataset.ids!==ids){root.dataset.ids=ids;root.innerHTML=enabled?points.map(p=>`<button class="world-hotspot" data-world="${p.id}" aria-label="${escape(p.label)}"><span aria-hidden="true">${p.icon}</span><small>${escape(p.label)}</small></button>`).join(''):'';}
 if(enabled)points.forEach(p=>{
  const el=root.querySelector(`[data-world="${p.id}"]`);if(!el)return;
  const stage=$('#worldStage').getBoundingClientRect(),text=story.getBoundingClientRect();
  let x=stage.left+stage.width*p.x/100;const y=stage.top+stage.height*p.y/100;
  // Keep the bench's label clear of the reading panel at narrower desktop widths.
  if(p.id==='bench'&&innerWidth>700)x=Math.max(x,text.right+64);
  el.style.left=(x-stage.left)/stage.width*100+'%';el.style.top=p.y+'%';
  const safe=y>90&&(innerWidth<=700?y<text.top-30:x>text.right+35&&y<innerHeight-170);
  el.hidden=!p.visible||!safe;
 });
}
function discover(id){
 const marker=$('#worldHotspots').querySelector(`[data-world="${id}"]>span`);
 if(marker&&!reduced)marker.animate([{transform:'scale(1)'},{transform:'scale(1.18)'},{transform:'scale(1)'}],{duration:450,easing:'ease-out'});
 if(id==='letter'){go('letter');return;}
 if(id==='next'){rememberChapter(state);state.location=state.location==='roses'?'grove':'stars';render();window.scrollTo({top:0,behavior:reduced?'instant':'smooth'});moment(`Wandered through ${locations[state.location].title.toLowerCase()}`);return;}
 if(id==='flower'){world?.interact(id);openMoment('flower');return;}
 world?.interact(id);journeyAudio?.chime();
 if(!state.discoveries.includes(id))state.discoveries.push(id);
 const copy={lantern:'One warm light, then another. Follow them together.',water:'A little ripple. A little quiet.',bench:'We can sit here for a moment.',moon:'The same moon, wherever we are.',star:'A few little stars. A shape that belongs to us.',note:'A tiny note: I like the long way, when it’s with you.',penguin:'He was trying to act very casual. Obviously.'};
 bubble(copy[id]||'A little discovery.');if(id==='note')toast(copy.note);moment(copy[id]||'Said hello along the path');
}
function discoveryControls(){
 if(state.scene!=='explore')return '';
 const ids={roses:['flower','next'],grove:['lantern','next'],stars:['water','bench','moon','star','note']}[state.location];
 return `<div class="discoveries" aria-label="Discover this place">${ids.map(id=>`<button data-world="${id}">${worldCopy[id][1]} ${worldCopy[id][0]}</button>`).join('')}</div>`;
}
function render(){clearTimeout(timer);const scene=state.scene;document.body.dataset.scene=scene;document.body.dataset.location=state.location;document.body.classList.toggle('reduced',reduced);document.body.classList.toggle('portal-glow',scene==='portal');document.body.classList.toggle('cinematic',scene==='portal');document.body.classList.toggle('immersed',!['welcome','waiting','confirm','maybe','customize'].includes(scene));$('#worldHotspots').innerHTML='';$('#worldHotspots').dataset.ids='';animateSection();$('#back').hidden=!state.history.length;$('#walkHint').hidden=scene!=='explore';$('#stars').hidden=!(scene==='explore'&&state.location==='stars');$('#miniActions').hidden=scene!=='explore';$('#miniActions').innerHTML=['<button data-action="hand">♡ Hold hands</button>','<button data-action="flower">✿ A little flower</button>','<button data-action="hug">A tiny hug</button>','<button data-action="snow">♡ Make a snow heart</button>'].join('');bubble('');applyWorld();
 const chapter=['welcome','waiting','confirm','maybe'].includes(scene)?0:['customize','portal'].includes(scene)?1:['letterClosed','letter'].includes(scene)?2:scene==='distance'?3:['explore','conversation','moment'].includes(scene)?4:scene==='personal'?5:scene==='final'?6:7;
 $('.chapter-num').textContent=String(chapter+1).padStart(2,'0');$('#chapterName').textContent=['THE INVITATION','A PENGUIN OF YOUR OWN','THE LITTLE LETTER','A LITTLE HONESTY','WANDERING TOGETHER','A MOMENT TO LISTEN','THE VIEWPOINT','A MEMORY TO KEEP'][chapter];
 updateWalkingHint();
 switch(scene){
 case 'welcome':video('welcome');bubble('Hey… I was waiting for you.');story.innerHTML=`<p class="eyebrow">A SMALL WORLD. A SHARED ADVENTURE.</p><h1 tabindex="-1">Somewhere,<br><em>just for us.</em></h1><p class="intro">Leave the noise behind for a little while.<br>There’s a world waiting to be explored.<br>And someone who’d love your company.</p><div class="hand-note">you + me + a little wonder</div><div class="actions">${button('Yes, I’ll come','yes')}${button('Not yet','wait','secondary')}</div><p class="tiny-note">Would you walk with me for a little while?</p>`;break;
 case 'waiting':video('welcome');bubble(['That’s okay. I can wait.','A tiny snow heart. No hurry.','The stars aren’t going anywhere.','I found a flower. I’ll keep it safe.'][state.waitCount%4]);story.innerHTML=heading('TAKE ALL THE TIME YOU NEED',waitingReask?'So… fancy a little walk?':'We can stay<br>here a while.','Wander around, look at the lights, or just take a breath. This little world will wait.')+`<div class="actions">${button('Walk with you','yes')}${button('A little more time','wait','secondary')}</div><p class="tiny-note">Tap a little light. There’s no wrong answer.</p>`;$('#stars').hidden=false;timer=setTimeout(()=>{if(state.scene==='waiting'&&!waitingReask){waitingReask=true;render();}},18000);break;
 case 'confirm':bubble('Trying very hard to look casually excited.');story.innerHTML=heading('ONE VERY HAPPY PENGUIN','Really?<br><em>Are you sure?</em>','He was going to play it cool. The little happy jump gave him away.')+`<div class="actions">${button('Yes, I’m sure','sure')}${button('Maybe… 👀','maybe','secondary')}</div>`;break;
 case 'maybe':bubble('I’ll take that as progress.');story.innerHTML=heading('A MAYBE IS WELCOME TOO','A little maybe.<br>A little stargazing.','We can just enjoy the view for a moment. Come along whenever it feels right.')+`<div class="actions">${button('Okay, I’m sure','sure')}${button('Still a maybe','wait','secondary')}</div>`;break;
 case 'customize':video('welcome');bubble('Wait. This adventure needs you, too.');story.innerHTML=heading('A PENGUIN OF YOUR OWN','A little touch<br>of <em>you.</em>','Choose something that feels like you. There’s no wrong outfit for a little adventure.')+`<span class="field-label">Your little accessory</span><div class="accessories">${accessoryOptions.map(({id,label})=>`<button class="chip ${state.accessory===id?'selected':''}" data-accessory="${id}" aria-pressed="${state.accessory===id}">${label}</button>`).join('')}</div><span class="field-label">A favourite colour</span><div class="swatches">${['#ee9eb5','#cfacd9','#f1c6ad','#f8dae5'].map((c,i)=>`<button class="swatch ${state.accent===c?'selected':''}" style="--color:${c}" data-accent="${c}" aria-label="${['Rose','Lilac','Peach','Pearl'][i]} accent" aria-pressed="${state.accent===c}"></button>`).join('')}</div>${button('Ready. Let’s go','portal')}<p class="tiny-note">Your penguin stays with you for the whole journey.</p>`;break;
 case 'portal':video('forest');bubble('');story.innerHTML=`<div class="gateway-words" role="status"><p class="eyebrow">ONE LITTLE STEP, TOGETHER</p><p class="sky-writing">Here we go…</p></div><button class="gateway-skip" data-action="skipGateway">Continue to our quiet place ↗</button>`;world?.beginGateway();if(!world||world.failed)timer=setTimeout(leaveGateway,650);break;
 case 'letterClosed':video('forest');bubble('There’s something here for you.');story.innerHTML=heading('A QUIET PLACE UNDER THE STARS','A little letter.<br>Just for you.','It’s been waiting here on the table. Open it whenever you’re ready.')+button('Open the letter','letter');break;
 case 'letter':video('forest');story.innerHTML=`<p class="eyebrow">A FEW WORDS, FROM ME TO YOU</p><div class="letter"><p>${escape(state.letter)}</p><p class="signature">With a little hope, and a lot of heart ♡</p></div><div class="actions">${button('Keep walking','distance')}</div>`;bubble('No perfect words. Just a little honesty.');break;
 case 'distance':video('forest');bubble('There’s no answer you need to give.');story.innerHTML=heading('WHERE WE ARE, RIGHT NOW','How far apart<br>do we feel?','Move your penguin to a distance that feels honest. We don’t have to rush anything.')+`<output id="distanceLabel" class="distance-label" for="distanceSlider">${distanceLabel(state.distance)}</output><input id="distanceSlider" class="slider" type="range" min="0" max="100" value="${state.distance}" aria-label="How close do you feel right now?" aria-valuetext="${distanceLabel(state.distance)}"><div class="slider-extremes"><span>Very far</span><span>Right beside you</span></div>${button('This is where I am','distanceDone')}`;break;
 case 'explore':video(locations[state.location].video);bubble(state.location==='stars'?'Pick a star. There’s a little thought inside.':'You choose the way. I’ll walk with you.');story.innerHTML=heading('THE LONG WAY IS THE LOVELY WAY',locations[state.location].title,'A little discovery. A little us.')+`${discoveryControls()}<div class="route-list">${Object.entries(locations).map(([id,l],i)=>`<button class="route ${state.location===id?'active':''}" data-location="${id}"><span class="route-index">0${i+1}</span><span class="route-text"><strong>${l.title}</strong><small>${l.description}</small></span><em>${state.conversations.includes(l.question)?'✓':'↗'}</em></button>`).join('')}</div><div class="actions">${state.conversations.includes(locations[state.location].question)?button('Talk here again','conversation','secondary'):button('A little conversation','conversation')}${state.conversations.length===3?button('To the viewpoint','personal'):''}</div><p class="tiny-note">${state.conversations.length}/3 little conversations discovered. You can answer or skip.</p>`;break;
 case 'conversation': {const q=conversations[locations[state.location].question];const chosen=state.answers.find(a=>a.question===q.question)?.answer;const custom=chosen&&!q.options.includes(chosen);story.innerHTML=heading('A LITTLE CONVERSATION',q.question)+`<div class="answer-options">${q.options.map((o,i)=>`<button class="answer ${chosen===o?'selected':''}" data-answer="${i}">${o}<span>${chosen===o?'♡':'↗'}</span></button>`).join('')}</div><div id="customConversation" ${chosen==='Something else'||custom?'':'hidden'}><textarea id="conversationText" maxlength="600" placeholder="Whatever you’d like to say…" aria-label="Your own answer">${custom?escape(chosen):''}</textarea></div><div id="reply" class="response"></div><div class="actions">${button('Keep wandering','conversationDone','secondary')}<button class="text-button" data-action="skipConversation">I’d rather just enjoy the view</button></div>`;break;}
 case 'moment':renderMoment();break;
 case 'personal':{video('forest');const q=personal[state.personalIndex];const chosen=state.answers.find(a=>a.question===q.question)?.answer;story.innerHTML=heading(`A MOMENT TO LISTEN · ${state.personalIndex+1} OF 3`,q.question,'You can choose a thought, add your own words, or simply let this one pass.')+`<div class="answer-options">${q.options.map(o=>`<button class="answer ${chosen===o?'selected':''}" data-personal="${escape(o)}">${o}<span>♡</span></button>`).join('')}</div><textarea id="personalText" maxlength="900" rows="3" aria-label="Your own thoughts" placeholder="Or tell me in your own words…">${chosen&&!q.options.includes(chosen)?escape(chosen):''}</textarea><div class="actions">${button(state.personalIndex===2?'Let’s enjoy the view':'One little step','personalNext')}<button class="text-button" data-action="personalSkip">Let this one pass</button></div>`;bubble('I’m listening. Take your time.');break;}
 case 'final':video('forest');bubble('A little closer, at your own pace.');story.innerHTML=heading('HERE, WITH YOU','A little pause.<br>A little <em>hope.</em>')+`<p class="intro">${escape(state.message)}</p><p class="fineprint">We started: ${distanceLabel(state.distance).toLowerCase()}.</p><label class="field-label" for="finalSlider">Where would you like to sit now?</label><output id="finalLabel" class="distance-label" for="finalSlider">${distanceLabel(state.finalDistance)}</output><input id="finalSlider" class="slider" type="range" min="0" max="100" value="${state.finalDistance}" aria-label="Choose your distance at the final viewpoint" aria-valuetext="${distanceLabel(state.finalDistance)}"><div class="slider-extremes"><span>There’s still some space</span><span>Side by side</span></div>${button('Keep this little moment','selfie')}`;break;
 case 'selfie':video('forest');bubble('Wait. We can’t finish without proof.');story.innerHTML=heading('ONE FOR THE MEMORY BOOK','Okay, say<br><em>“little fish.”</em>','Choose a pose. Serious penguin faces are entirely optional.')+`<div class="pose-grid">${['Standing together','Side hug','Funny pose','Heart pose','Penguin kiss','Looking at the stars'].map(p=>`<button class="chip ${state.pose===p?'selected':''}" data-pose="${p}" aria-pressed="${state.pose===p}">${p}</button>`).join('')}</div><div id="photoArea">${selfieURL?`<img class="selfie" src="${selfieURL}" alt="Our two customized penguins in their chosen selfie pose">`:''}</div><div class="actions">${button(selfieURL?'Take another':'Take our selfie','photo')}${selfieURL?button('Make our memory card','memory'):''}</div>`;break;
 case 'memory':video('celebration');bubble('A little memory. A lot of us.');currentBlob=null;story.innerHTML=heading('OUR LITTLE JOURNEY',`A moment<br>to <em>keep.</em>`,'The small laughs. The honest words. Two little penguins who took a walk together.')+`<div id="memoryThumb"></div><p class="memory-title">${escape(state.date)} · just us, for a little while</p><div class="actions">${button('Download our memory','download')}${button('Share with me','share','secondary')}</div><div id="shareFallback"></div><button class="text-button" data-action="replay">Replay our journey ↗</button><p class="privacy">Your memory includes the answers you chose to give. It stays with you until you choose to share it.</p>`;story.querySelectorAll('[data-action="download"],[data-action="share"]').forEach(b=>b.disabled=true);prepareMemory();break;
 default:state.scene='welcome';render();
 }
 save();
}
function renderMoment(){const type=state.momentType;const copy={hand:['A LITTLE QUESTION','May I hold<br>your hand?','Only if you’d like that.','You may 👀','Behave yourself'],flower:['A TINY SOMETHING','A flower<br>for you.','He found the prettiest little one on the path.','I’ll keep it','Leave it growing'],hug:['A WARM LITTLE PAUSE','Can I have<br>a little hug?','No hurry. The view is lovely, too.','Come here','Maybe later']}[type];story.innerHTML=heading(copy[0],copy[1],copy[2])+`<div class="actions">${button(copy[3],'acceptMoment')}${button(copy[4],'declineMoment','secondary')}</div>`;bubble(type==='flower'?'I thought you might like this.':'No pressure. Promise.');}
function openMoment(type){returnScene='explore';state.momentType=type;go('moment');}
function finishConversation(skip=false){const q=conversations[locations[state.location].question],text=$('#customConversation')?.hidden?'':$('#conversationText')?.value.trim();if(skip)state.answers=state.answers.filter(a=>a.question!==q.question);else if(text)answer(q.question,text);if(!state.conversations.includes(locations[state.location].question))state.conversations.push(locations[state.location].question);if(skip)toast('Of course. We can simply enjoy the walk.');go('explore');}
function nextPersonal(skip=false){const q=personal[state.personalIndex];const text=$('#personalText')?.value.trim();if(skip)state.answers=state.answers.filter(a=>a.question!==q.question);else if(text)answer(q.question,text);if(state.personalIndex<2){state.personalIndex++;render();save();}else{state.finalDistance=state.currentDistance;go('final');}}
async function takePhoto(){
 if(busy)return;const epoch=journeyEpoch;busy=true;const area=$('#photoArea');
 try{for(const n of [3,2,1]){if(epoch!==journeyEpoch||state.scene!=='selfie')return;area.innerHTML=`<div class="countdown" role="status">${n}…</div>`;await new Promise(r=>setTimeout(r,900));}
 world?.setPose(state.pose);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const photo=await captureSelfie();if(epoch!==journeyEpoch||state.scene!=='selfie')return;selfieURL=photo;$('#flash').classList.remove('flash');void $('#flash').offsetWidth;$('#flash').classList.add('flash');moment(`A selfie: ${state.pose.toLowerCase()}`);busy=false;render();
 }finally{if(epoch===journeyEpoch)busy=false;}
}
async function captureSelfie(){const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=1000;const ctx=canvas.getContext('2d');const bg=ctx.createLinearGradient(0,0,0,1000);bg.addColorStop(0,'#152a43');bg.addColorStop(1,'#50656c');ctx.fillStyle=bg;ctx.fillRect(0,0,1600,1000);try{if(film.readyState>=2){const sc=Math.max(1600/film.videoWidth,1000/film.videoHeight);ctx.globalAlpha=.32;ctx.drawImage(film,(1600-film.videoWidth*sc)/2,(1000-film.videoHeight*sc)/2,film.videoWidth*sc,film.videoHeight*sc);ctx.globalAlpha=1;}const imageData=world?.capture();if(imageData){const img=new Image();img.src=imageData;await img.decode();const sc=Math.min(1600/img.width,1000/img.height);ctx.drawImage(img,(1600-img.width*sc)/2,(1000-img.height*sc)/2,img.width*sc,img.height*sc);}else{ctx.font='170px serif';ctx.textAlign='center';ctx.fillText('🐧  🐧',800,600);}}catch{ctx.font='170px serif';ctx.textAlign='center';ctx.fillText('🐧  🐧',800,600);}ctx.textAlign='left';ctx.fillStyle='#f6e7d1';ctx.font='italic 28px Georgia';ctx.fillText('Somewhere, just for us.',70,85);ctx.font='16px Segoe UI';ctx.fillText(state.date,70,935);ctx.textAlign='right';ctx.fillText('our little journey  ♡',1530,935);return canvas.toDataURL('image/png');}
function prepareMemory(){const epoch=journeyEpoch;generateMemory().then(blob=>{if(!blob||epoch!==journeyEpoch||state.scene!=='memory')return;story.querySelectorAll('[data-action="download"],[data-action="share"]').forEach(b=>b.disabled=false);}).catch(()=>{if(epoch!==journeyEpoch||state.scene!=='memory')return;story.querySelectorAll('[data-action="download"],[data-action="share"]').forEach(b=>b.disabled=false);toast('Your memory couldn’t be drawn yet. Please try the download again.');});}
async function generateMemory(){
 const epoch=journeyEpoch,snapshot=structuredClone(state),photo=selfieURL||await captureSelfie();
 const blob=await createMemoryCard({...snapshot,title:'Our Little Journey',distance:distanceLabel(snapshot.distance),finalDistance:distanceLabel(snapshot.finalDistance)},photo);
 if(epoch!==journeyEpoch||state.scene!=='memory')return null;
 selfieURL=photo;currentBlob=blob;if(cardURL)URL.revokeObjectURL(cardURL);cardURL=URL.createObjectURL(blob);if($('#memoryThumb'))$('#memoryThumb').innerHTML=`<img class="memory-preview" src="${cardURL}" alt="Preview of your personal journey memory card">`;return blob;
}

const actions={skipGateway:leaveGateway,yes:()=>go('confirm'),wait:()=>{state.waitCount++;waitingReask=false;go('waiting');},sure:()=>go('customize'),maybe:()=>{state.waitCount++;go('maybe');},portal:()=>{moment('Chose a penguin of your own');go('portal');},letter:()=>go('letter'),distance:()=>go('distance'),distanceDone:()=>{state.currentDistance=state.distance;state.finalDistance=state.distance;go('explore');bubble(state.distance<40?'I understand. Let’s not rush it.':state.distance<70?'Maybe we still have some walking to do.':'I like this distance.');},conversation:()=>go('conversation'),conversationDone:()=>finishConversation(),skipConversation:()=>finishConversation(true),personal:()=>{state.personalIndex=0;go('personal');},personalNext:()=>nextPersonal(),personalSkip:()=>nextPersonal(true),hand:()=>openMoment('hand'),flower:()=>openMoment('flower'),hug:()=>openMoment('hug'),snow:()=>{world?.react('snow');moment('Made a tiny heart in the snow');toast('One slightly wonky snow heart. Made together.');},acceptMoment:()=>{const type=state.momentType;if(type==='hand'){moment('Held hands along the path');}if(type==='flower'){state.accessory='flower';if(!state.discoveries.includes('flower'))state.discoveries.push('flower');moment('Kept a little flower from the garden');}if(type==='hug')moment('A little hug on the way');back();world?.react({hand:'hand',flower:'flower',hug:'hug'}[type]);bubble({hand:'I’ll try very hard to behave. No promises about the grin.',flower:'It suits you. I had a feeling.',hug:'This is a good little moment.'}[type]);},declineMoment:()=>{back();world?.endContact();world?.react('wave');bubble('Of course. Happy just being here.');},selfie:()=>go('selfie'),photo:takePhoto,memory:()=>go('memory'),download:async()=>{const blob=currentBlob??await generateMemory();downloadBlob(blob,'our-little-journey.png');toast('A little memory to keep.');},share:async()=>{const blob=currentBlob??await generateMemory();const result=await shareMemory(blob);if(result.fallback){$('#shareFallback').innerHTML=`<div class="share-fallback">Your memory has been downloaded.<br>Open WhatsApp, choose who to share with, and <strong>attach the saved image</strong>.<br><a href="${escape(result.url)}" target="_blank" rel="noopener">Open WhatsApp with our message ↗</a></div>`;}},replay:()=>$('#resetDialog').showModal()};
document.addEventListener('click',async event=>{const el=event.target.closest('button');if(!el)return;const action=el.dataset.action;if(action){try{await actions[action]?.();}catch(e){toast('That little step didn’t work. Please try once more.');console.error(e);}return;}if(el.dataset.world){discover(el.dataset.world);return;}if(el.dataset.accessory){state.accessory=el.dataset.accessory;render();}if(el.dataset.accent){state.accent=el.dataset.accent;render();}if(el.dataset.location){if(state.location!==el.dataset.location)rememberChapter(state);state.location=el.dataset.location;if(!state.visited.includes(state.location))state.visited.push(state.location);render();window.scrollTo({top:0,behavior:reduced?'instant':'smooth'});moment(`Wandered through ${locations[state.location].title.toLowerCase()}`);}if(el.dataset.answer!==undefined){const i=Number(el.dataset.answer),q=conversations[locations[state.location].question];answer(q.question,q.options[i]);document.querySelectorAll('[data-answer]').forEach(b=>b.classList.toggle('selected',b===el));$('#reply').textContent=q.replies[i];$('#customConversation').hidden=q.options[i]!=='Something else';world?.react(q.reactions[i]);}if(el.dataset.personal){answer(personal[state.personalIndex].question,el.dataset.personal);document.querySelectorAll('[data-personal]').forEach(b=>b.classList.toggle('selected',b===el));$('#personalText').value='';world?.react('wave');}if(el.dataset.pose){state.pose=el.dataset.pose;selfieURL=null;currentBlob=null;save();render();world?.setPose(state.pose);}if(el.dataset.walk)world?.walkTo(Number(el.dataset.walk)*.8);if(el.dataset.star!==undefined){const messages=['You don’t have to have everything figured out tonight.','There’s something lovely about taking the long way together.','A little wish: more laughter, more listening, more us.'];bubble(messages[Number(el.dataset.star)]);world?.interact('star');moment('Found a little message among the stars');}if(el.hasAttribute('data-close'))el.closest('dialog').close();});
document.addEventListener('input',e=>{if(e.target.id==='distanceSlider'){state.distance=Number(e.target.value);state.selectedPartnerDistance=state.distance;state.currentDistance=state.distance;$('#distanceLabel').textContent=distanceLabel(state.distance);e.target.setAttribute('aria-valuetext',distanceLabel(state.distance));world?.setDistance(state.distance);save();}if(e.target.id==='finalSlider'){state.finalDistance=Number(e.target.value);state.currentDistance=state.finalDistance;state.selectedPartnerDistance=state.finalDistance;$('#finalLabel').textContent=distanceLabel(state.finalDistance);e.target.setAttribute('aria-valuetext',distanceLabel(state.finalDistance));world?.setDistance(state.finalDistance);save();}if(e.target.id==='personalText')saveDraft(e.target.value);if(e.target.id==='conversationText')saveDraft(e.target.value,true);});
function saveDraft(text,conversation=false){const q=conversation?conversations[locations[state.location].question].question:personal[state.personalIndex].question;if(text.trim())answer(q,text.trim());else{state.answers=state.answers.filter(a=>a.question!==q);save();}}
$('#spaceSlider').oninput=e=>{const value=Number(e.target.value);state.selectedPartnerDistance=value;state.currentDistance=value;state.finalDistance=value;if(['welcome','waiting','confirm','maybe','customize','letterClosed','letter','distance'].includes(state.scene))state.distance=value;$('#spaceLabel').textContent=distanceLabel(value);e.target.setAttribute('aria-valuetext',distanceLabel(value));world?.setDistance(value);save();};
let pointerStart;
$('#world').addEventListener('pointerdown',e=>{pointerStart={x:e.clientX,y:e.clientY,drag:world?.guidedCamera?.drag||0};$('#world').setPointerCapture(e.pointerId);});
$('#world').addEventListener('pointermove',e=>{if(!pointerStart||!world?.guidedCamera||state.scene==='portal')return;const dx=e.clientX-pointerStart.x;if(Math.abs(dx)>8)world.guidedCamera.drag=Math.max(-1,Math.min(1,pointerStart.drag+dx/240));});
$('#world').addEventListener('pointerup',e=>{if(!pointerStart)return;if(Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)<8&&['explore','waiting'].includes(state.scene)){const rect=$('#world').getBoundingClientRect();world?.walkTo(((e.clientX-rect.left)/rect.width)*2-1);}pointerStart=null;});
$('#world').addEventListener('pointercancel',()=>pointerStart=null);
document.addEventListener('keydown',e=>{if(e.target.matches('input,textarea,select')||document.querySelector('dialog[open]'))return;if(state.scene==='explore'&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();world?.walkTo(e.key==='ArrowLeft'?-.8:.8);}if(state.scene==='portal'&&e.key==='Escape')actions.skipGateway();});
$('#back').onclick=back;$('#brand').onclick=e=>{e.preventDefault();$('#chaptersDialog').showModal();};$('#chapterInfo').onclick=()=>$('#chaptersDialog').showModal();$('#settings').onclick=()=>{$('#motion').checked=reduced;$('#quality').value=world?.quality?.mode||'auto';$('#letterEdit').value=state.letter;$('#messageEdit').value=state.message;$('#settingsDialog').showModal();};$('#motion').onchange=e=>{reduced=e.target.checked;document.body.classList.toggle('reduced',reduced);world?.setReducedMotion(reduced);if(reduced){$('#film').pause();$('#filmNext').pause();}else film.play().catch(()=>{});try{localStorage.setItem('journey-gentle-motion',JSON.stringify(reduced));}catch{}};$('#saveLetter').onclick=()=>{state.letter=$('#letterEdit').value.trim()||draftLetter;state.message=$('#messageEdit').value.trim()||draftMessage;try{localStorage.setItem('journey-words',JSON.stringify({letter:state.letter,message:state.message}));}catch{}save();$('#settingsDialog').close();render();toast('Your words are saved in this browser.');};$('#reset').onclick=()=>{$('#settingsDialog').close();$('#resetDialog').showModal();};$('#confirmReset').onclick=()=>{journeyEpoch++;gatewayHandoff.cancel();busy=false;clearTimeout(timer);clearTimeout(toastTimer);clearTimeout(filmPauseTimer);sectionAnimation?.cancel();lastSectionKey=null;pointerStart=null;waitingReask=false;returnScene='explore';$('#toast').classList.remove('show');$('#toast').textContent='';$('#flash').classList.remove('flash');world?.reset();state={...defaults(),letter:state.letter,message:state.message};selfieURL=null;currentBlob=null;if(cardURL)URL.revokeObjectURL(cardURL);cardURL=null;$('#resetDialog').close();render();save();window.scrollTo(0,0);};

async function toggleSound(){journeyAudio??=new JourneyAudio();soundOn=await journeyAudio.toggle();journeyAudio.place(state.location);$('#sound').setAttribute('aria-pressed',String(soundOn));$('#sound').setAttribute('aria-label',soundOn?'Turn sound off':'Turn sound on');$('#soundText').textContent=soundOn?'Sound on':'Sound off';$('#soundIcon').textContent=soundOn?'♫':'♪';}
$('#quality').onchange=e=>{world?.quality?.choose(e.target.value);try{localStorage.setItem('journey-quality',e.target.value);}catch{}};
$('#settings').addEventListener('click',()=>{$('#spaceSlider').value=state.selectedPartnerDistance;$('#spaceLabel').textContent=distanceLabel(state.selectedPartnerDistance);$('#spaceSlider').setAttribute('aria-valuetext',distanceLabel(state.selectedPartnerDistance));});
$('#spaceSlider').addEventListener('input',()=>{if($('#distanceSlider')){$('#distanceSlider').value=state.distance;$('#distanceLabel').textContent=distanceLabel(state.distance);}if($('#finalSlider')){$('#finalSlider').value=state.finalDistance;$('#finalLabel').textContent=distanceLabel(state.finalDistance);}});
$('#sound').onclick=()=>toggleSound().catch(()=>toast('Sound is unavailable in this browser.'));
document.addEventListener('visibilitychange',()=>{journeyAudio?.visibility();if(document.hidden)film.pause();else if(!reduced)film.play().catch(()=>{});});
async function init(){const progress=$('.loader-track span');progress.style.width='30%';try{world=new JourneyWorld($('#world'),{reducedMotion:reduced,onHotspots:showHotspots,onDeparture:()=>{document.body.dataset.walking='true';},onArrival:()=>{updateWalkingHint();if(state.scene==='portal')leaveGateway();},onError:()=>{$('#fallback').hidden=false;}});}catch(e){$('#fallback').hidden=false;console.warn('Using the gentle fallback world',e);}try{const q=localStorage.getItem('journey-quality');if(['auto','low','medium','high'].includes(q))world?.quality?.choose(q);}catch{}progress.style.width='80%';if(['portal','moment'].includes(state.scene))state.scene=state.scene==='portal'?'letterClosed':'explore';render();if(document.body.classList.contains('immersed'))world?.settle();progress.style.width='100%';await new Promise(r=>setTimeout(r,700));$('#loading').classList.add('done');setTimeout(()=>$('#loading').remove(),900);}
window.addEventListener('pagehide',e=>{if(e.persisted)return;gatewayHandoff.cancel();world?.dispose();journeyAudio?.dispose();clearTimeout(timer);clearTimeout(toastTimer);clearTimeout(filmPauseTimer);});
init();
