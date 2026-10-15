import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {spellProfiles} from './spell_profiles.mjs';
import {drawSpellPanel} from './render_spell.mjs';
const {createCanvas}=createRequire(import.meta.url)('@napi-rs/canvas');
for(const width of [342,960]){
 const calls=[],elements={};let next;
 for(const id of ['spell','play','phase','sound','audioRank','injury'])elements[`#${id}`]={value:id==='audioRank'?'3':id==='injury'?'cleaned':'',textContent:'',append(option){if(!this.value)this.value=option.value;}};
 const native=createCanvas(width,630),ctx=native.getContext('2d');
 const canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width}),get width(){return native.width;},set width(v){native.width=v;},get height(){return native.height;},set height(v){native.height=v;}};
 const context={spellProfiles,drawSpellPanel,createSpellAudioPlayer:()=>({resume:async()=>{},stop:()=>{},cast:(look,delay)=>calls.push({spell:look.spellId,rank:look.rank,delay})}),window:{AudioContext:class{}},document:{querySelector:s=>s==='canvas'?canvas:elements[s],createElement:()=>({})},performance:{now:()=>0},requestAnimationFrame:f=>next=f,fetch:async url=>({json:async()=>JSON.parse(readFileSync(new URL(url,import.meta.url),'utf8'))})};
 vm.createContext(context);
 const code=readFileSync(new URL('./viewer.mjs',import.meta.url),'utf8').replace(/^import .*\n/gm,'');
 await vm.runInContext(`(async()=>{${code}})()`,context);
 next(0);assert.equal(calls.length,0,'Audio must stay muted until a gesture');
 await elements['#sound'].onclick({target:elements['#sound']});next(0);assert.equal(calls.length,1);assert.equal(calls[0].rank,3);
 for(let i=1;i<=50;i++)next(i*1000/30);assert.equal(calls.length,2,'One release/contact pair per cast, not one per visual rank');
 elements['#audioRank'].value='2';elements['#audioRank'].onchange();next(1700);assert.equal(calls.at(-1).rank,2);
 elements['#spell'].value='FireBolt';elements['#spell'].onchange();next(1734);assert.equal(calls.at(-1).spell,'FireBolt');
 const before=calls.length;await elements['#sound'].onclick({target:elements['#sound']});for(let i=0;i<100;i++)next(1800+i*1000/30);assert.equal(calls.length,before);
 console.log({width,height:canvas.height,mutedInitially:true,rankSwitch:true,spellSwitch:true,noTripleAudio:true,muteWorks:true});
}
