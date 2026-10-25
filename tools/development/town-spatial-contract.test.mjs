import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

const root = new URL("../../src/Wyrmforge.Presentation.Web/wwwroot/", import.meta.url);
const load = async name => {
    const source = await readFile(new URL("js/town/" + name, root), "utf8");
    return import("data:text/javascript;base64," + Buffer.from(source).toString("base64"));
};
const [{parseTownObj}, {buildTownSpatialIndex}] = await Promise.all([
    load("town-obj-parser.js"), load("town-spatial-contract.js")
]);
const obj = await readFile(new URL("art/town/geometry/t1-central-square-preview.obj", root), "utf8");
const scene = JSON.parse(await readFile(new URL("art/town/geometry/t1-central-square.scene.json", root), "utf8"));
const spatial = buildTownSpatialIndex(scene, parseTownObj(obj));

test("T3 collision is derived from individual 3D shells; gate center remains open", () => {
    assert.equal(spatial.colliders.length, 13);
    assert.equal(spatial.walkable.length, 4);
    assert.equal(spatial.isWalkable(0, 0), false, "central well collision");
    assert.equal(spatial.isWalkable(0, 3.5), true, "open World Gate is not blocked by the lintel AABB");
    assert.equal(spatial.isWalkable(-3.1, 2.1), false, "foliage tree trunk collision");
    assert.equal(spatial.isWalkable(-1.57, .66), true, "noticeboard panel itself is not a ground collider");
    assert.deepEqual(spatial.anchors.get("town.center.world-gate"), [0, 186 / 64, 0]);
});

test("T3 path avoids physical well, respects actor clearance and dynamic obstacles", () => {
    const start = {x: -2.5, y: 0}, finish = {x: 2.5, y: 0};
    const route = spatial.route(start, finish);
    assert.ok(route && route.length > 5);
    assert.ok(route.every(p => spatial.isWalkable(p.x, p.y)));
    assert.ok(route.some(p => Math.abs(p.y) > 1), "route must travel around the well");
    assert.equal(spatial.route({x: 0, y: 0}, finish), null, "cannot start inside the well");
    const temporary = [{id: "town.dynamic.visitor", footprint:
        [[-2.75, -.45], [-2.25, -.45], [-2.25, .45], [-2.75, .45]]}];
    assert.equal(spatial.isWalkable(start.x, start.y, .15, temporary), false);
    assert.equal(spatial.route(start, finish, {dynamicObstacles: temporary}), null);
});

test("T3 spatial queries support fourteen independent NPC requests without AI coupling", () => {
    const started = performance.now();
    for (let i = 0; i < 14; i++) {
        const y = -.2 + i * .02;
        const route = spatial.route({x: -2.6, y}, {x: 2.6, y});
        assert.ok(route?.length > 2, "NPC " + i);
    }
    const milliseconds = performance.now() - started;
    console.info("14 Town spatial routes (Node CI, NOT physical mobile FPS):", milliseconds.toFixed(1), "ms");
});
