import {spellProfiles} from './spell_profiles.mjs';
import {drawSpellPanel} from './render_spell.mjs';
import {createSpellAudioPlayer} from './spell_audio.mjs';
const data=Object.fromEntries(await Promise.all(['cleaned','hurt','critical'].map(async s=>[s,await fetch(`../../motion/walk-reference-v1/mage-${s}-motion.json`).then(r=>r.json())])));
const select=document.querySelector('#spell');for(const spell of Object.keys(spellProfiles)){const o=document.createElement('option');o.value=spell;o.textContent=spell.replace(/([a-z])([A-Z])/g,'$1 $2');select.append(o);}
const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d');let time=0,last=performance.now(),playing=true,audio=null,soundOn=false,lastSoundCycle=-1;
document.querySelector('#play').onclick=e=>{playing=!playing;if(!playing)audio?.stop();e.target.textContent=playing?'Pause':'Play';};
document.querySelector('#phase').oninput=e=>{time=Number(e.target.value);playing=false;audio?.stop();document.querySelector('#play').textContent='Play';};
document.querySelector('#sound').onclick=async e=>{
 try {
  if(!audio)audio=createSpellAudioPlayer(new (window.AudioContext||window.webkitAudioContext)());
  soundOn=!soundOn;audio.stop();
  if(soundOn){await audio.resume();time=0;lastSoundCycle=-1;playing=true;document.querySelector('#play').textContent='Pause';}
  e.target.textContent=soundOn?'Sound on':'Sound off';
 }catch{soundOn=false;e.target.textContent='Audio unavailable';}
};
select.onchange=()=>{if(!['FireBolt','FrostShard'].includes(select.value))document.querySelector('#combination').value='';audio?.stop();time=0;lastSoundCycle=-1;};
document.querySelector('#combination').onchange=()=>{if(document.querySelector('#combination').value&&!['FireBolt','FrostShard'].includes(select.value))select.value='FireBolt';audio?.stop();time=0;lastSoundCycle=-1;};
document.querySelector('#audioRank').onchange=()=>{audio?.stop();time=0;lastSoundCycle=-1;};
function draw(now){
 if(playing)time+=Math.min(.1,(now-last)/1000);last=now;
 const width=Math.round(canvas.getBoundingClientRect().width),columns=width>=780?3:1,height=columns===3?210:630;
 if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
 const panels=[];
 for(let rank=1;rank<=3;rank++)panels.push(drawSpellPanel(ctx,data[document.querySelector('#injury').value],{x:columns===3?(rank-1)*width/3:0,y:columns===3?0:(rank-1)*210,width:width/columns,height:210,spellId:select.value,rank,combinationId:document.querySelector('#combination').value||null,seconds:time}));
 const cycle=Math.floor(time/1.6);
 if(soundOn&&playing&&cycle!==lastSoundCycle){const panel=panels[Number(document.querySelector('#audioRank').value)-1];audio.cast(panel.look,Math.max(0,panel.arrivalSeconds-time%1.6));lastSoundCycle=cycle;}
 document.querySelector('#phase').value=time%1.6;requestAnimationFrame(draw);
}requestAnimationFrame(draw);
