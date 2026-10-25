import {
    LEGACY_TOWN_FRAME, TOWN_DISTRICTS, TOWN_SCENE_IDS,
    legacyTownToNormalized, normalizedToLegacyTown,
    townDistrictFromNormalizedU, townDistrictIndex
} from "../../src/Wyrmforge.Presentation.Web/wwwroot/js/town/town-scene-contract.js";
import assert from "node:assert/strict";
import test from "node:test";

test("Town district IDs are stable and center remains the default district", () => {
    assert.deepEqual(TOWN_DISTRICTS, ["west", "center", "east"]);
    assert.equal(townDistrictIndex("center"), 1);
    assert.equal(townDistrictFromNormalizedU(0), "west");
    assert.equal(townDistrictFromNormalizedU(1 / 3), "center");
    assert.equal(townDistrictFromNormalizedU(2 / 3), "east");
    assert.equal(townDistrictFromNormalizedU(1), "east");
    assert.throws(() => townDistrictIndex("north"), RangeError);
});

test("legacy Town coordinate mapping round-trips without changing source geometry", () => {
    assert.deepEqual(LEGACY_TOWN_FRAME, {width: 1672, height: 941, districts: 3});
    for (const [x, y] of [[0, 0], [836, 470.5], [1672, 941], [655, 385], [985, 747]]) {
        const {u, v} = legacyTownToNormalized(x, y);
        const restored = normalizedToLegacyTown(u, v);
        assert.ok(Math.abs(restored.x - x) < 1e-9);
        assert.ok(Math.abs(restored.y - y) < 1e-9);
    }
    assert.throws(() => legacyTownToNormalized(NaN, 0), RangeError);
    assert.throws(() => normalizedToLegacyTown(0, 0, {width: 0, height: 1}), RangeError);
});

test("canonical semantic objects have unique permanent IDs", () => {
    const ids = Object.values(TOWN_SCENE_IDS);
    assert.equal(ids.length, 7);
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(ids.every(id => id.startsWith("town.")));
});
