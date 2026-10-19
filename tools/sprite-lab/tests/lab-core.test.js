const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../../../src/Wyrmforge.Presentation.Web/wwwroot/sprite-lab/src/lab-core.js');
test('all eight headings map to unique direction labels', () => {
  const points=[[1,0,'E'],[1,1,'SE'],[0,1,'S'],[-1,1,'SW'],[-1,0,'W'],[-1,-1,'NW'],[0,-1,'N'],[1,-1,'NE']];
  for (const [dx,dy,direction] of points) assert.equal(C.directionFromVector(dx,dy),direction);
});
test('five authored directions mirror westward poses',()=>{
  const cfg={...C.DEFAULT_CONFIG};
  assert.deepEqual(C.directionFrame(cfg,'SW',1),{x:166,y:160,width:166,height:160,direction:'SW',frame:1,row:1,flipX:true});
  assert.equal(C.directionFrame(cfg,'NW',0).row,3);
});
test('eight-direction production layout has no mirrored directions',()=>{
  const cfg={...C.DEFAULT_CONFIG,layout:'eight',rows:8};
  for(const dir of C.DIRECTIONS) assert.equal(C.directionFrame(cfg,dir,0).flipX,false);
});
test('opaque images are rejected for production',()=>{
  const w=80,h=50;
  const pixels={width:w,height:h,data:new Uint8ClampedArray(w*h*4)};
  for(let i=3;i<pixels.data.length;i+=4)pixels.data[i]=255;
  const checks=C.validate(w,h,{...C.DEFAULT_CONFIG,columns:8,rows:5,cellWidth:10,cellHeight:10},pixels);
  assert(checks.some(c=>c.severity==='fail' && /transparent/i.test(c.title)));
});
