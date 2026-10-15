import {spellProfiles} from './spell_profiles.mjs';
import {drawSpellPanel} from './render_spell.mjs';
const data=Object.fromEntries(await Promise.all(['cleaned','hurt','critical'].map(async s=>[s,await fetch(`../../motion/walk-reference-v1/mage-${s}-motion.json`).then(r=>r.json())])));
const select=document.querySelector('#spell');for(const spell of Object.keys(spellProfiles)){const o=document.createElement('option');o.value=spell;o.textContent=spell.replace(/([a-z])([A-Z])/g,'$1 $2');select.append(o);}
const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d');let time=0,last=performance.now(),playing=true;
document.querySelector('#play').onclick=e=>{playing=!playing;e.target.textContent=playing?'Pause':'Play';};
document.querySelector('#phase').oninput=e=>{time=Number(e.target.value);playing=false;document.querySelector('#play').textContent='Play';};
function draw(now){
 if(playing)time+=Math.min(.1,(now-last)/1000);last=now;
 const width=Math.round(canvas.getBoundingClientRect().width),columns=width>=780?3:1,height=columns===3?210:630;
 if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
 for(let rank=1;rank<=3;rank++)drawSpellPanel(ctx,data[document.querySelector('#injury').value],{x:columns===3?(rank-1)*width/3:0,y:columns===3?0:(rank-1)*210,width:width/columns,height:210,spellId:select.value,rank,seconds:time});
 document.querySelector('#phase').value=time%1.6;requestAnimationFrame(draw);
}requestAnimationFrame(draw);
