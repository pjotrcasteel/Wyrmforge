import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../../src/Wyrmforge.Presentation.Web/wwwroot/js/town/town-scene-schema.js", import.meta.url), "utf8");
const {validateTownScene, TOWN_SCENE_SCHEMA_VERSION, TOWN_WORLD_AXES} =
    await import("data:text/javascript;base64," + Buffer.from(source).toString("base64"));

const node = (id, parentId = null) => ({
    id, parentId, roles: ["visual", "collider"], tags: ["landmark"],
    transform: {position: [0, 0, 0], rotationDegrees: [0, 0, 0], scale: [1, 1, 1]},
    meshId: "town.well.mesh", materialId: "town.stone"
});

test("T1 uses explicit metric axes and validates a nested 3D scene", () => {
    assert.equal(TOWN_SCENE_SCHEMA_VERSION, 1);
    assert.deepEqual(TOWN_WORLD_AXES, {east: "+x", north: "+y", up: "+z", units: "m"});
    const scene = {version: 1, nodes: [node("town.center"), node("town.center.well", "town.center")]};
    assert.equal(validateTownScene(scene), scene);
});

test("T1 rejects missing parents, duplicate IDs, cycles, bad roles and invalid transforms", () => {
    const check = nodes => assert.throws(() => validateTownScene({version: 1, nodes}));
    check([node("town.well", "town.missing")]);
    check([node("town.well"), node("town.well")]);
    check([node("town.a", "town.b"), node("town.b", "town.a")]);
    check([{...node("town.well"), roles: ["unknown"]}]);
    check([{...node("town.well"), transform: {...node("town.well").transform, scale: [0, 1, 1]}}]);
    check([{...node("town.well"), transform: {...node("town.well").transform, position: [NaN, 0, 0]}}]);
});

test("T1 imported central-square scene has stable mesh groups and a gate anchor", async () => {
    const json = await readFile(new URL("../../src/Wyrmforge.Presentation.Web/wwwroot/art/town/geometry/t1-central-square.scene.json", import.meta.url), "utf8");
    const scene = JSON.parse(json);
    assert.equal(validateTownScene(scene), scene);
    assert.deepEqual(scene.worldAxes, TOWN_WORLD_AXES);
    const ids = new Set(scene.nodes.map(n => n.id));
    for (const id of ["town.center.well", "town.center.well-canopy", "town.center.noticeboard", "town.center.world-gate"])
        assert.ok(ids.has(id), id);
    const gate = scene.nodes.find(n => n.id === "town.center.world-gate");
    assert.deepEqual(gate.transform.position, [0, 186 / 64, 0]);
    assert.ok(scene.nodes.filter(n => n.meshId).every(n => n.meshId.includes(".obj#town.center.")));
});
