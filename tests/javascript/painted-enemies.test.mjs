import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const source = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/painted-enemies.js',import.meta.url),'utf8');
const mod = await import('data:text/javascript;base64,'+Buffer.from(source.replace("new URL('../art/enemies/', import.meta.url)","new URL('https://example.test/art/enemies/')")).toString('base64'));
test('painted pose precedence follows real frozen, damage and telegraph state',()=>{
    assert.equal(mod.paintedPose({kind:1},15),15);
    assert.equal(mod.paintedPose({kind:1,frozen:true},15),0);
    assert.equal(mod.paintedPose({kind:1,telegraph:{}},15),3);
    assert.equal(mod.paintedPose({kind:1,hitFlash:true,telegraph:{}},15),6);
    assert.equal(mod.paintedPose({kind:1,dead:true},15),7);
    assert.equal(mod.paintedPose({kind:0},5),5);
});
test('Mire Hound is always rendered by the same cached pixel atlas as the mage, never by the painterly texture',()=>{
    const ctx={ drawImage(){ throw new Error('Painted hound drawn despite native pixel selection'); } };
    for(const gait of [0,3,4,5,6,7,8,9,10,11,12,13,14,15])
        assert.equal(mod.drawPaintedEnemy(ctx,{kind:1,x:50,y:50,radius:13},gait),false);
});

test('only authoritative death events create once-only bounded corpses',()=>{
    const state={};
    mod.updatePaintedCorpses(state,[],null,1);assert.equal(state.corpses.size,0);
    const event={entityId:7,kind:1,x:50,y:60,bodyRadius:12};
    mod.updatePaintedCorpses(state,[event],null,1);assert.equal(state.corpses.size,1);
    mod.updatePaintedCorpses(state,[event],null,1.2);assert.equal([...state.corpses.values()][0].at,1);
    mod.updatePaintedCorpses(state,[],null,1.81);assert.equal(state.corpses.size,0);
    mod.updatePaintedCorpses(state,[{x:1,y:2}],null,2);assert.equal(state.corpses.size,0);
});
test('all packed textures match manifest hashes and fixed cell dimensions',()=>{
    const root=new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/art/enemies/',import.meta.url);
    const manifest=JSON.parse(readFileSync(new URL('manifest.json',root)));
    for(const d of [...Object.values(manifest.enemies),...Object.values(manifest.wyrms)])
        for(const [name,hash] of [[d.image,d.hash],...(d.walkImage?[[d.walkImage,d.walkHash]]:[])]){
            const png=readFileSync(new URL(name,root));
            assert.equal(png.readUInt32BE(16),768);assert.equal(png.readUInt32BE(20),384);
            assert.equal(createHash('sha256').update(png).digest('hex').slice(0,12),hash);
        }
});
