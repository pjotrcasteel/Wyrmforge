const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const C=require('../../../src/Wyrmforge.Presentation.Web/wwwroot/sprite-lab/src/lab-core.js');
test('planted feet remain fixed in world space during each support interval',async()=>{
  const {WALK,footAt}=await import('../hollow-rig.mjs');
  for(const offset of [0,.5]){
    let prior=null;
    for(let i=0;i<2000;i++){
      const phase=i/1000,foot=footAt(phase,offset);
      const worldX=foot.point[0]+phase*WALK.travelPerCycle;
      if(foot.planted&&prior?.planted)assert(Math.abs(worldX-prior.worldX)<1e-9);
      if(foot.planted)assert.equal(foot.lift,0);
      prior={planted:foot.planted,worldX};
    }
  }
});
test('walk never has both feet airborne and rigid bone lengths remain constant',async()=>{
  const {poseAt,REST}=await import('../hollow-rig.mjs');
  const length=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
  for(let i=0;i<1000;i++){
    const p=poseAt(i/1000);assert(p.near.planted||p.far.planted);
    for(const side of ['near','far']){
      assert(Math.abs(length(p[side+'Hip'],p[side+'Knee'])-length(REST[side+'Hip'],REST[side+'Knee']))<1e-9);
      assert(Math.abs(length(p[side+'Knee'],p[side].point)-length(REST[side+'Knee'],REST[side+'Ankle']))<1e-9);
      const arm=p[side+'Arm'];
      assert(Math.abs(length(arm.shoulder,arm.elbow)-length(REST[side+'Shoulder'],REST[side+'Elbow']))<1e-9);
      assert(Math.abs(length(arm.elbow,arm.wrist)-length(REST[side+'Elbow'],REST[side+'Wrist']))<1e-9);
    }
  }
});
test('one full cycle returns to the exact same pose',async()=>{
  const {poseAt}=await import('../hollow-rig.mjs');assert.deepEqual(poseAt(0),poseAt(1));
});
test('single-view export does not invent seven additional directions',()=>{
  const cfg={...C.DEFAULT_CONFIG,layout:'single',rows:1,columns:16,cellWidth:192,cellHeight:192,fps:12};
  const m=C.normalizedManifest(cfg,'hollow-walk-rig-v2.png',3072,192,true);
  assert.deepEqual(Object.keys(m.directions),['SE']);assert.equal(m.source.rows,1);
  assert.equal(C.describeLayout(cfg).authoredDirections,1);
  assert.equal(m.origin.productionValidated,false);
});
test('rig atlas contains 16 distinct frames and no opaque pixel touches a cell edge',async()=>{
  const {decodePng}=await import('../../art/lib/png.mjs');
  const png=decodePng(fs.readFileSync(path.resolve(__dirname,'../../../src/Wyrmforge.Presentation.Web/wwwroot/sprite-lab/assets/hollow-walk-rig-v2.png')));
  assert.equal(png.width,3072);assert.equal(png.height,192);
  const hashes=new Set();
  for(let col=0;col<16;col++){
    const data=[];
    for(let y=0;y<192;y++)for(let x=0;x<192;x++){
      const at=(y*3072+col*192+x)*4;
      if(x===0||x===191||y===0||y===191)assert.equal(png.rgba[at+3],0);
      data.push(...png.rgba.subarray(at,at+4));
    }
    assert(data.some((v,i)=>i%4===3&&v>128));
    hashes.add(require('node:crypto').createHash('sha256').update(Buffer.from(data)).digest('hex'));
  }
  assert.equal(hashes.size,16);
});
