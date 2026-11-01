import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decodePng } from '../../tools/art/lib/png.mjs';
import { WANG_ATLAS_SIZE, validateAuthoredWang, paintAuthoredWangRoad }
    from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/world-site-authored-wang.js';

const base = 'src/Wyrmforge.Presentation.Web/wwwroot/art/terrain/wf32/ar4b-wang/';
const source = decodePng(readFileSync(base + 'atlas.png'));
const atlas = {width:source.width,height:source.height,data:source.rgba};
const manifest = JSON.parse(readFileSync(base + 'manifest.json','utf8'));

function fixture() {
    const width=96,height=64,columns=width/4,rows=height/4;
    const labels=new Uint8Array(columns*rows).fill(1);
    // C#-supplied road islands and narrow C# semantics (not a JS road generator).
    for(let row=2;row<13;row++)for(let col=4;col<16;col++)
        labels[row*columns+col]=2;
    for(let row=9;row<13;row++)for(let col=16;col<20;col++)
        labels[row*columns+col]=2;
    for(let row=0;row<3;row++)for(let col=20;col<24;col++)
        labels[row*columns+col]=4; // Rock: untouched by Wang road
    const pixels=new Uint8ClampedArray(width*height*4);
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
        const i=(y*width+x)*4,c=labels[Math.floor(y/4)*columns+Math.floor(x/4)];
        pixels[i]=c===2?77:c===4?33:18;
        pixels[i+1]=c===2?70:c===4?40:65;
        pixels[i+2]=c===2?45:c===4?48:31;
        pixels[i+3]=255;
    }
    return {width,height,columns,labels,pixels};
}
test('manifest matches actual 32px road/grass atlas, fails closed on invalid data',()=>{
    assert.equal(validateAuthoredWang(atlas,manifest),true);
    assert.deepEqual(WANG_ATLAS_SIZE,{width:496,height:331,tile:32,variants:8,masks:16});
    assert.equal(validateAuthoredWang(atlas,{...manifest,approved:true}),false);
    assert.equal(validateAuthoredWang({...atlas,width:495},manifest),false);
});
test('C# road pixels receive authored colors but every non-road class preserves authority',()=>{
    const f=fixture(),before=f.pixels.slice(),labelsBefore=f.labels.slice();
    assert.equal(paintAuthoredWangRoad(f.pixels,f.width,f.height,atlas,manifest,
        f.labels,f.columns,1387),true);
    assert.deepEqual(f.labels,labelsBefore,'Never edit C# surface winners');
    let roadChanged=0,forestPreserved=0,rockPreserved=0;
    for(let y=0;y<f.height;y++)for(let x=0;x<f.width;x++){
        const off=(y*f.width+x)*4,label=f.labels[Math.floor(y/4)*f.columns+Math.floor(x/4)];
        if(label===2&&f.pixels[off]!==before[off])roadChanged++;
        if(label===1&&x<10&&y>12&&f.pixels[off]===before[off])forestPreserved++;
        if(label===4){
            rockPreserved++;
            assert.deepEqual(f.pixels.slice(off,off+4),before.slice(off,off+4));
        }
        assert.equal(f.pixels[off+3],255);
    }
    assert.ok(roadChanged>100);
    assert.ok(forestPreserved>50);
    assert.ok(rockPreserved>0);
});
test('same C# labels / seed reproduce exactly; malformed atlas fails without mutation',()=>{
    const a=fixture(),b=fixture();
    paintAuthoredWangRoad(a.pixels,a.width,a.height,atlas,manifest,a.labels,a.columns,123);
    paintAuthoredWangRoad(b.pixels,b.width,b.height,atlas,manifest,b.labels,b.columns,123);
    assert.deepEqual(a.pixels,b.pixels);
    const c=fixture(),before=c.pixels.slice();
    assert.equal(paintAuthoredWangRoad(c.pixels,c.width,c.height,atlas,
        {...manifest,revision:'wrong'},c.labels,c.columns,123),false);
    assert.deepEqual(c.pixels,before);
});
