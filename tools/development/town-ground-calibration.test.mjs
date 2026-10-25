import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../../src/Wyrmforge.Presentation.Web/wwwroot/js/town/town-ground-calibration.js", import.meta.url), "utf8");
const {TOWN_GROUND_CALIBRATION, TOWN_CALIBRATION_ANCHORS,
    townLegacyFootpointToWorld, townWorldGroundToLegacyFootpoint} =
    await import("data:text/javascript;base64," + Buffer.from(source).toString("base64"));

test("ground calibration preserves authored well/gate location and metric axes", () => {
    assert.equal(TOWN_GROUND_CALIBRATION.pixelsPerMetre, 64);
    for (const anchor of Object.values(TOWN_CALIBRATION_ANCHORS)) {
        const {x, y, z} = townLegacyFootpointToWorld(...anchor.legacyFootpoint);
        assert.deepEqual([x, y, z], anchor.world);
    }
    assert.ok(townLegacyFootpointToWorld(900, 536).x > 0, "right of painting is east");
    assert.ok(townLegacyFootpointToWorld(836, 472).y > 0, "up painting is north");
});

test("ground-contact positions round-trip without drift", () => {
    for (const [x, y] of [[0, 0], [1672, 941], [836, 536], [836, 350], [727, 511], [942, 560]]) {
        const world = townLegacyFootpointToWorld(x, y);
        const legacy = townWorldGroundToLegacyFootpoint(world.x, world.y, world.z);
        assert.ok(Math.abs(legacy.x - x) < 1e-10);
        assert.ok(Math.abs(legacy.y - y) < 1e-10);
    }
});

test("ground calibration refuses invalid values and unsupported elevated pixel mapping", () => {
    assert.throws(() => townLegacyFootpointToWorld(Infinity, 0), RangeError);
    assert.throws(() => townWorldGroundToLegacyFootpoint(0, 0, 2), RangeError);
    assert.throws(() => townLegacyFootpointToWorld(0, 0,
        {...TOWN_GROUND_CALIBRATION, pixelsPerMetre: 0}), RangeError);
});
