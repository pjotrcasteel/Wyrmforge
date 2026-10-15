import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {drawSpellPanel} from './render_spell.mjs';
const {createCanvas}=createRequire(import.meta.url)('@napi-rs/canvas');
const data=JSON.parse(readFileSync(new URL('../../motion/walk-reference-v1/mage-cleaned-motion.json',import.meta.url)));
const output=process.argv[2];if(!output)throw Error('Pass a scratch frame directory');mkdirSync(output,{recursive:true});
for(let f=0;f<96;f++){
 const canvas=createCanvas(960,790),ctx=canvas.getContext('2d');ctx.fillStyle='#111b1a';ctx.fillRect(0,0,960,790);
 ['ArcaneOrb','FireBolt','FrostShard','ChainLightning'].forEach((spellId,row)=>{
  for(let rank=1;rank<=3;rank++)drawSpellPanel(ctx,data,{x:(rank-1)*320,y:row*190,width:320,height:190,spellId,rank,seconds:f/30});
 });
 ctx.fillStyle='#b5c1b7';ctx.font='12px sans-serif';ctx.fillText('Spell identity / rank study · cast overlay + release + impact · gameplay timing unchanged · final painted art / produced audio pending',12,781);
 writeFileSync(`${output}/frame-${String(f).padStart(3,'0')}.png`,canvas.toBuffer('image/png'));
 if(f===1)writeFileSync(new URL('./spell-rank-review.png',import.meta.url),canvas.toBuffer('image/png'));
}
