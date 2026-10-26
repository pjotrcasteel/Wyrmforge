import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

const source=await readFile(new URL("../../src/Wyrmforge.Presentation.Web/wwwroot/js/town/town-canonical-projection.js",import.meta.url),"utf8");
const {FRAME,TOWN_SEMANTIC_VOLUMES,townPaintedDepth}=
    await import("data:text/javascript;base64,"+Buffer.from(source).toString("base64"));

test("T1 semantic Town geometry is metric, nonplanar, bounded and stable",()=>{
    assert.deepEqual(FRAME,{width:1672,height:941,pixelsPerMetre:94.1,columns:216,rows:122});
    assert.equal(TOWN_SEMANTIC_VOLUMES.length,24);
    assert.equal(new Set(TOWN_SEMANTIC_VOLUMES.map(volume=>volume.id)).size,24);
    const depths=[];
    for(let y=0;y<=941;y+=47)for(let x=0;x<=1672;x+=76)
        depths.push(townPaintedDepth(x,y));
    assert.ok(depths.every(Number.isFinite));
    assert.ok(Math.max(...depths)-Math.min(...depths)>6);
    assert.throws(()=>townPaintedDepth(NaN,0),RangeError);
});

test("T1 volumes use precise canonical pixel silhouettes and have nonzero actual 3D thickness",()=>{
    const points=volume=>volume.points;
    for(const volume of TOWN_SEMANTIC_VOLUMES){
        assert.match(volume.id,/^[a-z0-9-]+$/);
        assert.ok(volume.thickness>0&&volume.depth>0);
        assert.ok(points(volume).length>=3);
        assert.ok(points(volume).every(([x,y])=>x>=0&&x<=FRAME.width&&y>=0&&y<=FRAME.height));
    }
    for(const id of ["arcane-nexus-walls","blacksmith-facade","hall-of-fame-facade",
        "codex-facade","world-gate-arch","well-roof","well-lintel","noticeboard-panel"])
        assert.ok(TOWN_SEMANTIC_VOLUMES.some(v=>v.id===id),id);
    assert.ok(TOWN_SEMANTIC_VOLUMES.find(v=>v.id==="well-masonry")
        .points.some(([x,y])=>x===819&&y===508));
    assert.ok(TOWN_SEMANTIC_VOLUMES.find(v=>v.id==="noticeboard-panel")
        .points.some(([x,y])=>x===731&&y===454));
});
