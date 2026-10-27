# Public lamp hue consistency

The owner liked the reduced light overlap but identified inconsistent orange lamps.
The point lights already shared #ffd2a0; their emissive textures still used individually
painted RGB. Common apertures now preserve linear luminance and aperture coverage while
sharing the point-light chromaticity. No change to light intensity, range, ground or well.

Rendering commit: 72a927f50d03fe36ad7032c4e1d431b4c06cf150. 80 focused Town JS tests pass. Fresh real GPU common
captures at 1120 and 390, plus RGB-zero off at 390. The JPEG is an unretouched compressed
export of the native 1672x941 framebuffer. Software GPU, not physical-phone performance.
Different painted receiving surfaces still vary in reflected color; this is not a claim
that all existing baked color variation has been removed. T2 remains unapproved.
