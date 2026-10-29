// The bounded claw study uses the existing animation adapter. This tests
// route/asset isolation only; no synthetic atlas is presented as game footage.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root=new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/',import.meta.url);
const profile=JSON.parse(readFileSync(new URL('../art/review/animation-foundation-sprite-walk/profile.json',root),'utf8'));
const manifest=JSON.parse(readFileSync(new URL('../art/review/animation-foundation-sprite-walk/manifest.json',root),'utf8'));
const uri=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const stub=uri(`export function createCreatureAnimationAssets(url) {
  globalThis.__anReviewAssetPath=String(url);
  return {ready:()=>true,manifest:${JSON.stringify(manifest)},profile:${JSON.stringify(profile)},draw:()=>false};
}`);
const source=readFileSync(new URL('hollow-sprites.js',root),'utf8')
 .replaceAll('import.meta.url',"'https://example.test/js/hollow-sprites.js'")
 .replace(/from '(\.\/[^']+)'/g,(_,p)=>'from '+JSON.stringify(
     p==='./creature-animation-assets.js'?stub:uri(readFileSync(new URL(p,root),'utf8'))));
const original=globalThis.location;
globalThis.location={search:'?animationFoundation=sprite-claw'};
try {
    const module=await import(uri(source));
    test('baked claw proof uses the same shared adapter and dedicated opt-in assets',()=>{
        assert.equal(typeof module.createHollowState,'function');
        assert.equal(globalThis.__anReviewAssetPath,
            'https://example.test/art/review/animation-foundation-sprite-claw/');
    });
} finally {
    globalThis.location=original;
    delete globalThis.__anReviewAssetPath;
}
