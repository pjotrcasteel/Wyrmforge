import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

const root = new URL("../../src/Wyrmforge.Presentation.Web/wwwroot/", import.meta.url);
const source = await readFile(new URL("js/town/town-obj-parser.js", root), "utf8");
const {parseTownObj} = await import("data:text/javascript;base64," + Buffer.from(source).toString("base64"));

test("real central-square OBJ produces distinct stable meshes and valid triangle counts", async () => {
    const text = await readFile(new URL("art/town/geometry/t1-central-square-preview.obj", root), "utf8");
    const graph = JSON.parse(await readFile(new URL("art/town/geometry/t1-central-square.scene.json", root), "utf8"));
    const parsed = parseTownObj(text);
    assert.equal(parsed.vertices.length, 240);
    assert.equal(parsed.triangleCount, 384);
    assert.equal(parsed.groups.size, 12);
    for (const node of graph.nodes.filter(n => n.meshId)) {
        const group = parsed.groups.get(node.meshId.split("#")[1]);
        assert.ok(group, node.id);
        assert.equal(group.materialId, node.materialId);
        assert.equal(group.positions.length, group.triangles.length * 9);
    }
});

test("Town parser refuses invalid vertex references, duplicate semantic IDs and degenerate faces", () => {
    const prefix = "v 0 0 0\nv 1 0 0\nv 0 1 0\ng town.test\nusemtl stone\n";
    const valid = prefix + "f 1 2 3\n";
    assert.equal(parseTownObj(valid).triangleCount, 1);
    assert.throws(() => parseTownObj(prefix + "f 1 2 4\n"), RangeError);
    assert.throws(() => parseTownObj(prefix + "f 1 2 2\n"), RangeError);
    assert.throws(() => parseTownObj(valid + "g town.test\nusemtl stone\nf 1 2 3\n"), TypeError);
    assert.throws(() => parseTownObj(prefix.replace("g town.test", "g ../outside") + "f 1 2 3\n"), TypeError);
});

test("Gothic T2 mesh includes 36 material-bound 3D groups and 39 validated semantic nodes", async () => {
    const obj = await readFile(new URL("art/town/geometry/t2-central-square-gothic.obj", root), "utf8");
    const scene = JSON.parse(await readFile(new URL("art/town/geometry/t2-central-square-gothic.scene.json", root), "utf8"));
    const parsed = parseTownObj(obj);
    assert.equal(parsed.vertices.length, 5098);
    assert.equal(parsed.triangleCount, 5074);
    assert.equal(parsed.groups.size, 36);
    assert.equal(scene.nodes.length, 39);
    for (const node of scene.nodes.filter(n => n.meshId)) {
        const group = parsed.groups.get(node.meshId.split("#")[1]);
        assert.ok(group, node.id);
        assert.equal(group.materialId, node.materialId);
    }
    for (const id of ["town.center.world-gate-masonry", "town.center.world-gate-banners",
                      "town.center.well-brickwork", "town.center.well-roof-tiles",
                      "town.center.noticeboard-parchment", "town.center.paving-cobbles-mid"])
        assert.ok(parsed.groups.has(id), id);
});
