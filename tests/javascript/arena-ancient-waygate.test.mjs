import test from 'node:test';
import assert from 'node:assert/strict';
import { drawAncientWaygate } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-ancient-waygate.js';

function fakeContext() {
    const calls=[];
    const ctx = new Proxy({calls}, {
        get(target,key) {
            if (key in target) return target[key];
            return (...args) => {calls.push([key,...args]);};
        },
        set(target,key,value) {target[key]=value;return true;}
    });
    return ctx;
}
test('waygate handles absent exits without drawing',()=>{
    const ctx=fakeContext();
    drawAncientWaygate(ctx,null,0,true);
    assert.equal(ctx.calls.length,0);
});
test('dormant gate is rendered but has no portal vortex',()=>{
    const ctx=fakeContext();
    drawAncientWaygate(ctx,{x:100,y:200,radius:30},0,true);
    assert.ok(ctx.calls.some(([name])=>name==='fillRect'));
    assert.equal(ctx.calls.filter(([name])=>name==='clip').length,0);
});
test('completed objective enables animated portal interior',()=>{
    const ctx=fakeContext();
    drawAncientWaygate(ctx,{x:100,y:200,radius:30},2,false);
    assert.equal(ctx.calls.filter(([name])=>name==='clip').length,1);
    assert.ok(ctx.calls.filter(([name])=>name==='ellipse').length>=8);
});
