import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {frameAtTime,resolveDirection,sourceRectangle} from './playback.mjs';
const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
const atlas=JSON.parse(readFileSync(new URL('./atlas.json',import.meta.url)));
const directions=[['S',0,1],['SE',1,1],['E',1,0],['NE',1,-1],['N',0,-1],['NW',-1,-1],['W',-1,0],['SW',-1,1]];
for(const [name,x,y] of directions)assert.equal(resolveDirection(x,y),name);
assert.equal(resolveDirection(0,0,'NE'),'NE');
assert.equal(frameAtTime(0,atlas),0);assert.equal(frameAtTime(31/30,atlas),31);assert.equal(frameAtTime(32/30,atlas),0);
for(const state of Object.values(atlas.states)){
 const image=await loadImage(new URL(state.file,import.meta.url).pathname);assert.equal(image.width,4096);assert.equal(image.height,1024);
 const canvas=createCanvas(128,128),ctx=canvas.getContext('2d');
 for(const direction of atlas.directions)for(let f=0;f<32;f++){
  const r=sourceRectangle(atlas,direction.name,f);ctx.clearRect(0,0,128,128);ctx.drawImage(image,r.x,r.y,128,128,0,0,128,128);
  const pixels=ctx.getImageData(0,0,128,128).data;let opaque=0;
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){const alpha=pixels[(y*128+x)*4+3];if(alpha)opaque++;if(x<2||y<2||x>125||y>125)assert.equal(alpha,0);}
  assert(opaque>100,'Sprite should contain a visible body');
 }
}
console.log('Passed: eight direction mappings, cycle boundary, 768 nonempty transparent cells and padding.');
