import test from 'node:test';
import assert from 'node:assert/strict';
import { townRelightableContract } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/town-relightable-contract.js';

const triangle = [{x:0,y:0},{x:10,y:0},{x:0,y:10}];
const navigation = () => ({
    width:1672,height:941,
    walkable:[{id:'square',points:triangle}],
    obstacles:[{id:'well',footprint:triangle}],
    destinations:[],
    occluders:[{id:'well-foreground',clip:triangle,depthY:572,artwork:'art/town/night-active.webp'}]
});

test('town migration preserves canonical walk, collision and foreground coordinates', () => {
    const source = navigation();
    const result = townRelightableContract(source);
    assert.deepEqual(result.sourceSize,{width:1672,height:941});
    assert.deepEqual(result.walkable[0].polygon,triangle);
    assert.deepEqual(result.collision[0].polygon,triangle);
    assert.equal(result.foreground[0].depthY,572);
    assert.equal(result.foreground[0].legacyArtwork,'art/town/night-active.webp');
    assert.deepEqual(result.lightingGeometry,[]);
    assert.equal(result.migration,'awaiting-authored-relightable-layers');
    result.collision[0].polygon[0].x=999;
    assert.equal(source.obstacles[0].footprint[0].x,0);
});

test('town migration rejects malformed and duplicate navigation polygons', () => {
    const invalid = navigation();
    invalid.obstacles.push({id:'well',footprint:triangle});
    assert.throws(()=>townRelightableContract(invalid),/Duplicate/);
    invalid.obstacles.pop();
    invalid.occluders[0].clip=[{x:0,y:0}];
    assert.throws(()=>townRelightableContract(invalid),/Invalid town polygon/);
});
