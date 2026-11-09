import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../../../src/Wyrmforge.Presentation.Web/wwwroot/experimental/voxel/world.js', import.meta.url),'utf8');
const {VoxelWorld,MATERIAL,CHUNK_SIZE}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
test('deterministic seeded generation',()=>{
  const a=new VoxelWorld(17),b=new VoxelWorld(17);
  for(const [x,y] of [[0,0],[-17,20],[31,-32]])for(let z=0;z<32;z++)assert.equal(a.get(x,y,z),b.get(x,y,z));
});
test('negative coordinate chunk boundaries',()=>{
  const w=new VoxelWorld();
  assert.equal(w.locate(-1,-1,0).cx,-1);
  assert.equal(w.locate(-1,-1,0).cy,-1);
  assert.equal(w.locate(-16,-16,0).index,(CHUNK_SIZE*CHUNK_SIZE-1)*32);
});
test('bedrock is indestructible',()=>{
  const w=new VoxelWorld();
  assert.equal(w.set(0,0,0,MATERIAL.AIR),false);
  assert.equal(w.get(0,0,0),MATERIAL.BEDROCK);
});
test('explosion changes only nearby material and tracks dirty chunks',()=>{
  const w=new VoxelWorld();
  const distant=w.get(100,100,22);
  const changed=w.explode(0,0,22,3);
  assert.ok(changed>0);
  assert.equal(w.get(100,100,22),distant);
  assert.ok(w.consumeDirty().length>0);
  assert.equal(w.consumeDirty().length,0);
});
test('a chunk edge edit invalidates its neighbor',()=>{
  const w=new VoxelWorld();
  assert.equal(w.set(15,0,20,MATERIAL.AIR),true);
  assert.ok(w.consumeDirty().includes('1,0'));
});
