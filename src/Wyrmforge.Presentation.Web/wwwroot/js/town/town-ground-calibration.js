// T1 provisional painting-to-ground camera calibration (not a production render projection).
// Pixel coordinates are references measured on the approved 1672x941 night painting.
// 64 legacy pixels/metre is a removable authoring-scale assumption, not a measured real-world dimension.
export const TOWN_GROUND_CALIBRATION = Object.freeze({
    legacyFrameWidth: 1672,
    legacyFrameHeight: 941,
    originPixelX: 836,
    originPixelY: 536,
    pixelsPerMetre: 64,
    worldElevationMetres: 0
});

function check(calibration) {
    if (!calibration || ![
        calibration.legacyFrameWidth, calibration.legacyFrameHeight,
        calibration.originPixelX, calibration.originPixelY,
        calibration.pixelsPerMetre, calibration.worldElevationMetres
    ].every(Number.isFinite) || calibration.pixelsPerMetre <= 0 ||
        calibration.legacyFrameWidth <= 0 || calibration.legacyFrameHeight <= 0)
        throw new RangeError("Invalid Town ground calibration");
}

// Converts a *ground-contact pixel*, not a rooftop/foreground pixel, to provisional 3D coordinates.
// X = east, Y = north, Z = elevation (metres). Projection inversion is for z=0 footpoints only.
export function townLegacyFootpointToWorld(x, y, calibration = TOWN_GROUND_CALIBRATION) {
    check(calibration);
    if (![x, y].every(Number.isFinite)) throw new RangeError("Invalid Town ground pixel");
    const {originPixelX, originPixelY, pixelsPerMetre, worldElevationMetres} = calibration;
    return {x: (x - originPixelX) / pixelsPerMetre,
        y: (originPixelY - y) / pixelsPerMetre, z: worldElevationMetres};
}

export function townWorldGroundToLegacyFootpoint(x, y, z = TOWN_GROUND_CALIBRATION.worldElevationMetres,
    calibration = TOWN_GROUND_CALIBRATION) {
    check(calibration);
    if (![x, y, z].every(Number.isFinite) || z !== calibration.worldElevationMetres)
        throw new RangeError("Only the calibrated ground plane can map back to legacy painting pixels");
    return {x: calibration.originPixelX + x * calibration.pixelsPerMetre,
        y: calibration.originPixelY - y * calibration.pixelsPerMetre};
}

// Reference anchors from night-navigation.json. Only the gate destination is an authored point;
// the well is the chosen calibration origin. Neither defines physical obstacle depth/height.
export const TOWN_CALIBRATION_ANCHORS = Object.freeze({
    "town.center.well": Object.freeze({legacyFootpoint: [836, 536], world: [0, 0, 0], source: "calibration"}),
    "town.center.world-gate": Object.freeze({legacyFootpoint: [836, 350],
        world: [0, 186 / 64, 0], source: "night-navigation.json:gate-steps"})
});
