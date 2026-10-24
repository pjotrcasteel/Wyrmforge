import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createHollowLegReview,hollowLegReviewRequested} from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/hollow-leg-review.js';

const root=new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/',import.meta.url);
const dir=new URL('art/enemies/hollow-rigged/review/broken-leg-left/',root);
const manifest=JSON.parse(readFileSync(new URL('manifest.json',dir),'utf8'));

function fakeContext(){
    const calls=[];
    return {calls,ctx:{globalAlpha:1,save(){calls.push(['save']);},restore(){calls.push(['restore']);},
        drawImage(...args){calls.push(['drawImage',...args]);}}};
}

test('off by default; only an explicit dragged preview token enables it',async()=>{
    assert.equal(hollowLegReviewRequested(''),false);
    assert.equal(hollowLegReviewRequested('?hollowLegReview=1'),false);
    assert.equal(hollowLegReviewRequested('?hollowLegReview=dragged'),true);
    assert.equal(hollowLegReviewRequested('?hollowLegReview=dragged-all'),false);
    const review=createHollowLegReview(dir,false);
    assert.equal(review.enabled,false);
    assert.equal(await review.preload(),false);
    const {calls,ctx}=fakeContext();
    assert.equal(review.draw(ctx,'standard','walk',5,'E',100,100,11),false);
    assert.deepEqual(calls,[]);
});

test('review manifest and PNG are byte-identical to unapproved full-body 8-way evidence',()=>{
    const png=readFileSync(new URL(manifest.image,dir));
    const original=readFileSync(new URL('../../../../../../docs/art/evidence/hollowed-broken-leg-dragged-recovery/candidate-walk-eight-directions.png',root));
    assert.deepEqual(png,original);
    const hash=createHash('sha1').update(Buffer.from('blob '+png.length+'\0')).update(png).digest('hex');
    assert.equal(hash,manifest.sourceBlobSha);
    assert.equal(png.readUInt32BE(16),1536);
    assert.equal(png.readUInt32BE(20),768);
    assert.deepEqual(manifest.directions,['N','NE','E','SE','S','SW','W','NW']);
    assert.equal(manifest.reviewOnly,true);
    assert.equal(manifest.artApproval,false);
    assert.equal(manifest.runtimeCutover,false);
    assert.equal(manifest.materialsRegenerated,false);
    assert.equal(manifest.fps,22);
    assert.equal(manifest.anchor[1],72);
});

test('enabled review loads exact atlas and draws standard WALK with exact 96px pivot',async()=>{
    const oldFetch=globalThis.fetch,oldImage=globalThis.Image;
    try{
        let requests=0;
        globalThis.fetch=async url=>{
            requests++;
            assert.ok(String(url).endsWith('/manifest.json'));
            return {ok:true,json:async()=>manifest};
        };
        globalThis.Image=class {
            naturalWidth=1536;naturalHeight=768;
            set src(url){this.url=url;queueMicrotask(()=>this.onload());}
        };
        const preview=createHollowLegReview(dir,true);
        assert.equal(await preview.preload(),true);
        assert.equal(preview.ready(),true);
        assert.equal(await preview.preload(),true);
        assert.equal(requests,1);
        const {calls,ctx}=fakeContext();
        assert.equal(preview.draw(ctx,'standard','walk',5,'W',200,180,11,.7,'none'),true);
        const imageCall=calls.find(c=>c[0]==='drawImage');
        assert.ok(imageCall);
        assert.equal(imageCall[2],5*96);
        assert.equal(imageCall[3],6*96);
        assert.equal(imageCall[7],200-48/96*93);
        assert.equal(imageCall[8],180-72/96*93);
        assert.equal(ctx.imageSmoothingEnabled,false);
        const count=calls.length;
        for(const [variant,clip] of [['broken-arm-right','walk'],['one-arm-left','walk'],
                ['standard','attack'],['standard','death']]){
            assert.equal(preview.draw(ctx,variant,clip,3,'W',200,180,11),false);
            assert.equal(calls.length,count);
        }
        assert.equal(preview.draw(ctx,'standard','walk',1,'bad',200,180,11),false);
    }finally{globalThis.fetch=oldFetch;globalThis.Image=oldImage;}
});

test('failed download or invalid material/cutover manifest leaves approved art in charge',async()=>{
    const oldFetch=globalThis.fetch,oldImage=globalThis.Image;
    try {
        globalThis.fetch=async()=>({ok:true,json:async()=>({...manifest,runtimeCutover:true})});
        globalThis.Image=class {};
        const review=createHollowLegReview(dir,true);
        assert.equal(await review.preload(),false);
        assert.equal(review.ready(),false);
        const {calls,ctx}=fakeContext();
        assert.equal(review.draw(ctx,'standard','walk',1,'S',0,0,11),false);
        assert.deepEqual(calls,[]);
    }finally{globalThis.fetch=oldFetch;globalThis.Image=oldImage;}
});
