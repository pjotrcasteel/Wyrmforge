import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const base=new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/art/enemies/hollow-rigged/',import.meta.url);
const read=name=>JSON.parse(readFileSync(new URL(name,base),'utf8'));
const metadata=read('layers.json'),manifest=read('manifest.json'),profile=read('animation-profile.json');

test('semantic metadata targets the exact approved walk and attack PNG bytes',()=>{
 for(const name of ['walk','attack']){
  const clip=manifest.clips[name],hash=createHash('sha256').update(readFileSync(new URL(clip.image,base))).digest('hex');
  assert.equal(metadata.sourceHashes[name],hash);assert.equal(hash.slice(0,12),clip.hash);
 }
});

test('every direction and frame has valid named regions and native-pixel attachments',()=>{
 assert.deepEqual(metadata.directions,['N','NE','E','SE','S','SW','W','NW']);
 for(const name of ['walk','attack'])for(const direction of metadata.directions){
  const frames=metadata.clips[name][direction];assert.equal(frames.length,manifest.clips[name].frames);
  for(const frame of frames){
   assert.equal(frame.attachment.length,2);assert.ok(frame.attachment.every(Number.isFinite));
   for(const region of [profile.actions.attack.supportRegion,profile.actions.attack.region]){
    assert.ok(frame.regions[region].length>0);
    for(const [y,x,width] of frame.regions[region]){
     assert.ok([y,x,width].every(Number.isInteger));assert.ok(y>=0&&y<metadata.canvasSize);
     assert.ok(x>=0&&width>0&&x+width<=metadata.canvasSize);
    }
   }
  }
 }
});
