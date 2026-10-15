import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {drawSpellPanel} from './render_spell.mjs';
import {resolveSpellLook} from './spell_profiles.mjs';
import {synthesizeSpellSound,encodeWave} from './spell_audio.mjs';
const {createCanvas}=createRequire(import.meta.url)('@napi-rs/canvas');
const data=JSON.parse(readFileSync(new URL('../../motion/walk-reference-v1/mage-cleaned-motion.json',import.meta.url)));
const output=process.argv[2];if(!output)throw Error('Pass a scratch output directory');mkdirSync(output,{recursive:true});
const cases=['ArcaneOrb','FireBolt','FrostShard','ChainLightning'].flatMap(spellId=>[1,3].map(rank=>({spellId,rank})));
const rate=22050,mixed=new Float32Array(Math.round(cases.length*1.6*rate));
const add=(sound,start)=>{const at=Math.round(start*rate);for(let i=0;i<sound.samples.length&&at+i<mixed.length;i++)mixed[at+i]+=sound.samples[i]*.42;};
for(let group=0;group<cases.length;group++){
 const {spellId,rank}=cases[group],look=resolveSpellLook({spellId,rank});let arrival;
 for(let f=0;f<48;f++){
  const panel=createCanvas(320,190),pc=panel.getContext('2d');
  const info=drawSpellPanel(pc,data,{x:0,y:0,width:320,height:190,spellId,rank,seconds:f/30});arrival=info.arrivalSeconds;
  const canvas=createCanvas(640,420),ctx=canvas.getContext('2d');ctx.fillStyle='#111b1a';ctx.fillRect(0,0,640,420);
  ctx.imageSmoothingEnabled=false;ctx.drawImage(panel,0,0,640,380);
  ctx.fillStyle='#bac6b9';ctx.font='14px sans-serif';ctx.fillText(`${look.school} · rank ${rank} · gesture, release and confirmed impact`,16,402);
  writeFileSync(`${output}/frame-${String(group*48+f).padStart(3,'0')}.png`,canvas.toBuffer('image/png'));
 }
 add(synthesizeSpellSound(look),group*1.6);add(synthesizeSpellSound(look,{event:'impact'}),group*1.6+arrival);
}
writeFileSync(`${output}/sound-review.wav`,encodeWave(mixed,rate));
console.log({frames:cases.length*48,seconds:cases.length*1.6,soundPeak:mixed.reduce((m,v)=>Math.max(m,Math.abs(v)),0)});
