import test from 'node:test';
import assert from 'node:assert/strict';
import { PLAZA_PAVING_POLYGON, TOWN_PAVING_BOUNDS, validateTownPavingPolygon, levelPavingNormal }
    from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/town-paving-material.js';

test('plaza surface is a genuinely authored screen-space contour inside the 1672x941 painting', () => {
    const shape = validateTownPavingPolygon();
    assert.equal(shape.points, PLAZA_PAVING_POLYGON.length);
    assert.ok(shape.area > 100000 && shape.area < 450000, 'Conservative central square only, not arbitrary Town background');
    const [left, top, width, height] = TOWN_PAVING_BOUNDS;
    const points = PLAZA_PAVING_POLYGON;
    assert.equal(Math.min(...points.map(p => p[0])), left);
    assert.equal(Math.min(...points.map(p => p[1])), top);
    assert.equal(Math.max(...points.map(p => p[0])) - left, width);
    assert.equal(Math.max(...points.map(p => p[1])) - top, height);
    assert.throws(() => validateTownPavingPolygon([[0, 0], [2, 0], [2, 1]]), /Degenerate/);
    assert.throws(() => validateTownPavingPolygon([[-1, 0], [1200, 2], [20, 100]]), RangeError);
});

test('authored level stone normal uses world-up orientation, never brightness inferred from pixel art', () => {
    const forward = [8, -12, 12].map(n => n / Math.hypot(8, -12, 12));
    const right = [-forward[1], forward[0], 0], rightScale = Math.hypot(...right);
    const r = {x:right[0]/rightScale,y:right[1]/rightScale,z:0};
    const up = {x:forward[1]*r.z-forward[2]*r.y,
        y:forward[2]*r.x-forward[0]*r.z,z:forward[0]*r.y-forward[1]*r.x};
    const b = levelPavingNormal(r,up,{x:forward[0],y:forward[1],z:forward[2]});
    assert.equal(b.length, 4);
    assert.equal(b[0], 128, 'ground does not point left or right in tangent space');
    assert.ok(b[1] > 128 && b[2] > 128, 'world-up normal has positive vertical and camera components');
    assert.equal(b[3], 255);
    assert.throws(() => levelPavingNormal({z:0}, {z:0}, {z:0}), TypeError);
});
