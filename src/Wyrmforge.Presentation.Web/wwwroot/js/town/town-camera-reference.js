// T1 camera parity adapter for the current DOM panorama. Does not change rendering.
// Scene width is the measured CSS pixel width, not the 1672px source painting width.
// An eventual 3D camera can use its projected world centre and visible world width.
export function townReferenceCamera(viewportWidth, renderedSceneWidth, districtIndex, calibration) {
    if (![viewportWidth, renderedSceneWidth].every(Number.isFinite) ||
        viewportWidth <= 0 || renderedSceneWidth <= 0 ||
        !Number.isInteger(districtIndex) || districtIndex < 0 || districtIndex > 2 ||
        !calibration || ![calibration.legacyFrameWidth, calibration.originPixelX,
            calibration.pixelsPerMetre].every(Number.isFinite) ||
        calibration.legacyFrameWidth <= 0 || calibration.pixelsPerMetre <= 0)
        throw new RangeError("Invalid Town camera inputs");
    const sliceWidth = renderedSceneWidth / 3;
    const requestedLeft = sliceWidth * (districtIndex + .5) - viewportWidth / 2;
    const maxScroll = Math.max(0, renderedSceneWidth - viewportWidth);
    const scrollLeft = Math.max(0, Math.min(maxScroll, requestedLeft));
    // When the full Town fits on desktop, all district indices share a camera.
    const centerCssX = maxScroll === 0 ? renderedSceneWidth / 2 : scrollLeft + viewportWidth / 2;
    const centerLegacyX = centerCssX / renderedSceneWidth * calibration.legacyFrameWidth;
    const visibleWorldWidth = Math.min(viewportWidth, renderedSceneWidth) /
        renderedSceneWidth * calibration.legacyFrameWidth / calibration.pixelsPerMetre;
    return {
        scrollLeft, centerLegacyX,
        centerWorldX: (centerLegacyX - calibration.originPixelX) / calibration.pixelsPerMetre,
        visibleWorldWidth
    };
}
