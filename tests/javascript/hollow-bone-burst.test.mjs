import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
    selectHollowDeathStyle,hollowBoneBurstDelay,hollowBoneFragments,drawHollowBoneBurst
} from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/hollow-bone-burst.js';

const CORPSE=Object.freeze({
    entityId:12,deathStyle:'shatter-burst',deathInjury:'standard',
    x:100,y:100,radius:11,visualScale:1
});
function recordingCanvas(){
    const calls={rect:[],image:[],transforms:[],colors:[]};
    const ctx={
        globalAlpha:1,imageSmoothingEnabled:true,fillStyle:'',
        save(){calls.transforms.push(['save']);},
        restore(){calls.transforms.push(['restore']);},
        scale(...args){calls.transforms.push(['scale',...args]);},
        translate(...args){calls.transforms.push(['translate',...args]);},
        rotate(...args){calls.transforms.push(['rotate',...args]);},
        fillRect(...args){calls.rect.push([this.fillStyle,...args]);},
        drawImage(...args){calls.image.push(args)}
    };
    return {ctx,calls};
}

test('roughly one Hollowed in four shatters, both styles occur, unchanged per entity',()=>{
    const counts=new Map([['collapse',0],['shatter-burst',0],['buckle-burst',0]]);
    for(let id=0;id<1200;id++){
        const style=selectHollowDeathStyle(id);
        assert.equal(style,selectHollowDeathStyle(id));
        counts.set(style,counts.get(style)+1);
    }
    assert.ok(counts.get('collapse')>800&&counts.get('collapse')<950);
    assert.ok(counts.get('shatter-burst')>=70&&counts.get('shatter-burst')<160);
    assert.ok(counts.get('buckle-burst')>=170&&counts.get('buckle-burst')<300);
    assert.equal(hollowBoneBurstDelay('shatter-burst'),.035);
    assert.equal(hollowBoneBurstDelay('buckle-burst'),.25);
    assert.equal(hollowBoneBurstDelay('collapse'),Infinity);
    for(const id of [-1,Number.NaN,1.7,Infinity])assert.equal(selectHollowDeathStyle(id),'collapse');
});

test('actual anatomical bone pieces preserve one-arm and broken-leg injuries',()=>{
    const intact=hollowBoneFragments('standard');
    const missingLeft=hollowBoneFragments('one-arm-left');
    const brokenRight=hollowBoneFragments('broken-arm-right');
    const leg=hollowBoneFragments('broken-leg-left');
    assert.equal(intact.length,14);
    assert.equal(missingLeft.length,12);
    assert.equal(missingLeft.some(x=>x.limb==='leftArm'),false);
    assert.equal(missingLeft.some(x=>x.name==='upperR'),true);
    assert.equal(brokenRight.find(x=>x.name==='upperR').kind,'short');
    assert.equal(brokenRight.find(x=>x.name==='handR').kind,'short');
    assert.equal(leg.find(x=>x.name==='shinL').kind,'short');
    assert.equal(leg.find(x=>x.name==='shinR').kind,'long');
    assert.ok(intact.some(x=>x.kind==='skull'));
    assert.ok(intact.some(x=>x.kind==='ribs'));
    assert.ok(intact.some(x=>x.kind==='pelvis'));
});

test('renders physical bone fragments, ground remains and ash dust, never a rotated walking frame',()=>{
    const {ctx,calls}=recordingCanvas();
    assert.equal(drawHollowBoneBurst(ctx,CORPSE,0),false,'show source actor before burst');
    assert.equal(drawHollowBoneBurst(ctx,CORPSE,.28),true);
    assert.ok(calls.rect.length>100,'actual detailed pixel-bone masks and impact dust');
    assert.ok(calls.transforms.filter(x=>x[0]==='rotate').length>=12);
    assert.ok(calls.rect.some(x=>x[0].includes('rgba(')),'ground shadow or dust');
    assert.ok(calls.rect.some(x=>x[0]==='#e7e0ca'),'bone highlight');
    assert.ok(calls.rect.some(x=>x[0]==='#454c4a'),'Gothic bone outline');
    assert.equal(ctx.imageSmoothingEnabled,false);
    assert.equal(drawHollowBoneBurst(ctx,{...CORPSE,deathStyle:'collapse'},.5),false);
});

test('buckle first shows the existing real 3D rig, then shatters after 250ms',()=>{
    const corpse={...CORPSE,deathStyle:'buckle-burst'};
    const {ctx}=recordingCanvas();
    assert.equal(drawHollowBoneBurst(ctx,corpse,.12),false);
    assert.equal(drawHollowBoneBurst(ctx,corpse,.249),false);
    assert.equal(drawHollowBoneBurst(ctx,corpse,.25),true);
    assert.equal(drawHollowBoneBurst(ctx,corpse,1.5),true);
    assert.equal(drawHollowBoneBurst(ctx,corpse,3.8),true);
});

test('reduced motion paints an immediate stable bone pile with no dust particles',()=>{
    const {ctx,calls}=recordingCanvas(),corpse={...CORPSE,deathStyle:'shatter-burst'};
    assert.equal(drawHollowBoneBurst(ctx,corpse,.2,true),true);
    const baseline=calls.transforms.filter(x=>x[0]==='translate').map(x=>x.join(','));
    const count=calls.rect.length;
    assert.ok(count>40);
    const b=recordingCanvas();
    assert.equal(drawHollowBoneBurst(b.ctx,corpse,1.5,true),true);
    assert.deepEqual(b.calls.transforms.filter(x=>x[0]==='translate').map(x=>x.join(',')),baseline);
    assert.equal(b.calls.rect.length,count);
    assert.ok(!b.calls.rect.some(x=>String(x[0]).includes('214,199,169')),'no dust cloud with reduced motion');
});

test('canvas bone sprites cache once when HTML canvas API is present (mobile performance)',()=>{
    const previous=globalThis.document;
    let created=0,painted=0;
    globalThis.document={createElement(){
        created++;
        return {width:0,height:0,getContext(){return {fillRect(){painted++},fillStyle:''};}};
    }};
    try{
        const {ctx,calls}=recordingCanvas(),corpse={...CORPSE,entityId:3};
        drawHollowBoneBurst(ctx,corpse,.4);
        assert.ok(calls.image.length>=12,'bone fragments draw from cached sprites');
        const originalCount=created;
        drawHollowBoneBurst(ctx,corpse,.7);
        assert.equal(created,originalCount,'same bone masks reused across render frames');
        assert.ok(painted>20);
    }finally{globalThis.document=previous;}
});

test('pure presentation module does not touch simulation state or draw random gameplay outcomes',()=>{
    const source=readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/hollow-bone-burst.js',import.meta.url),'utf8');
    assert.equal(source.includes('Math.random'),false);
    for(const token of ['ctx.drawImage','ctx.fillRect','ctx.rotate','entityId','deathInjury','visualScale'])
        assert.ok(source.includes(token));
    const copy={...CORPSE};
    const {ctx}=recordingCanvas();
    drawHollowBoneBurst(ctx,copy,2);
    assert.deepEqual(copy,CORPSE,'corpses remain read-only inputs, no C# state mutation');
});
