/* WyrmForge Sprite Lab core. Works in browsers and Node; no dependencies. */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.SpriteLabCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';
    const DIRECTIONS = Object.freeze(['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']);
    const ANGLE_DIRECTIONS = Object.freeze(['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE']);
    const DIR_INFO = Object.freeze({
        N: ['NORTH', '↑'], NE: ['NORTH-EAST', '↗'], E: ['EAST', '→'], SE: ['SOUTH-EAST', '↘'],
        S: ['SOUTH', '↓'], SW: ['SOUTH-WEST', '↙'], W: ['WEST', '←'], NW: ['NORTH-WEST', '↖'],
    });
    const FIVE_ROW_MAP = Object.freeze({
        S: { row: 0, flipX: false }, SE: { row: 1, flipX: false }, E: { row: 2, flipX: false },
        NE: { row: 3, flipX: false }, N: { row: 4, flipX: false }, SW: { row: 1, flipX: true },
        W: { row: 2, flipX: true }, NW: { row: 3, flipX: true },
    });
    const EIGHT_ROW_MAP = Object.freeze(Object.fromEntries(DIRECTIONS.map((key, row) => [key, { row, flipX: false }])));
    const DEFAULT_CONFIG = Object.freeze({ columns: 8, rows: 5, cellWidth: 166, cellHeight: 160, offsetX: 0, offsetY: 0, fps: 8, layout: 'five' });

    function directionFromVector(dx, dy) {
        if (!Number.isFinite(dx) || !Number.isFinite(dy) || Math.hypot(dx, dy) < 0.001) return 'S';
        const angle = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
        return ANGLE_DIRECTIONS[Math.round(angle / 45) % 8];
    }
    function directionFrame(config, direction, frame) {
        const mapped = (config.layout === 'eight' ? EIGHT_ROW_MAP : FIVE_ROW_MAP)[direction];
        if (!mapped) throw new Error(`Invalid direction: ${direction}`);
        const columns = Number(config.columns);
        const index = ((Math.floor(Number(frame)) % columns) + columns) % columns;
        return {
            x: Number(config.offsetX) + index * Number(config.cellWidth),
            y: Number(config.offsetY) + mapped.row * Number(config.cellHeight),
            width: Number(config.cellWidth), height: Number(config.cellHeight),
            direction, frame: index, row: mapped.row, flipX: mapped.flipX,
        };
    }
    function describeLayout(config) {
        return { authoredDirections: config.layout === 'eight' ? 8 : 5, playableDirections: 8, framesPerDirection: config.columns };
    }
    function inspectAlpha(data) {
        if (!data || !data.data || !data.width || !data.height) return null;
        let samples = 0, transparent = 0, translucent = 0;
        const stepX = Math.max(1, Math.floor(data.width / 110));
        const stepY = Math.max(1, Math.floor(data.height / 110));
        for (let y = 0; y < data.height; y += stepY) {
            for (let x = 0; x < data.width; x += stepX) {
                const alpha = data.data[(y * data.width + x) * 4 + 3];
                if (alpha < 20) transparent++;
                else if (alpha < 250) translucent++;
                samples++;
            }
        }
        return { transparentRatio: transparent / samples, translucentRatio: translucent / samples };
    }
    function framePixelCoverage(data, x0, y0, width, height) {
        if (!data || !data.data) return null;
        let covered = 0, samples = 0, bounds = { minX: width, minY: height, maxX: -1, maxY: -1 };
        const stride = Math.max(1, Math.floor(Math.min(width, height) / 50));
        for (let y = 0; y < height; y += stride) for (let x = 0; x < width; x += stride) {
            const at = ((y0 + y) * data.width + (x0 + x)) * 4 + 3;
            if (data.data[at] > 20) {
                covered++;
                bounds.minX = Math.min(bounds.minX, x); bounds.maxX = Math.max(bounds.maxX, x);
                bounds.minY = Math.min(bounds.minY, y); bounds.maxY = Math.max(bounds.maxY, y);
            }
            samples++;
        }
        return { coveredRatio: covered / samples, empty: covered === 0, bounds };
    }
    function validate(imageWidth, imageHeight, config, data) {
        const checks = [];
        const add = (severity, title, message) => checks.push({ severity, title, message });
        if (!Number.isInteger(imageWidth) || !Number.isInteger(imageHeight) || imageWidth < 1 || imageHeight < 1) {
            add('fail', 'Load a spritesheet', 'Drop a PNG onto the import area to begin.'); return checks;
        }
        const names = ['columns', 'rows', 'cellWidth', 'cellHeight', 'offsetX', 'offsetY'];
        if (names.some(key => !Number.isInteger(Number(config[key])) || (key.startsWith('offset') ? Number(config[key]) < 0 : Number(config[key]) < 1))) {
            add('fail', 'Invalid grid configuration', 'Columns, rows and frame sizes must be positive integers; offsets must be non-negative integers.');
            return checks;
        }
        if (!['five', 'eight'].includes(config.layout)) {
            add('fail', 'Unknown direction mapping', 'Select the five-view or eight-view layout.'); return checks;
        }
        const minimumRows = config.layout === 'eight' ? 8 : 5;
        if (Number(config.rows) < minimumRows) add('fail', 'Missing direction rows', `This preset requires ${minimumRows} authored rows; found ${config.rows}.`);
        else add('pass', 'Eight-way navigation', config.layout === 'eight' ? 'All eight facing directions have their own art rows.' : 'Five authored directions, plus three mirrored views for complete eight-way facing.');
        if (Number(config.columns) < 8) add('warn', 'Short walk cycle', 'Use at least eight frames per direction to establish our animation baseline.');
        else add('pass', 'Walk cycle frames', `${config.columns} frames per authored direction.`);
        const endX = Number(config.offsetX) + Number(config.columns) * Number(config.cellWidth);
        const endY = Number(config.offsetY) + Number(config.rows) * Number(config.cellHeight);
        const within = endX <= imageWidth && endY <= imageHeight;
        if (!within) add('fail', 'Frames outside image', `Atlas ${imageWidth}×${imageHeight}, grid reaches ${endX}×${endY}. Adjust frame dimensions or offsets.`);
        else add('pass', 'Grid bounds', `The ${config.columns} × ${config.rows} source grid fits within ${imageWidth} × ${imageHeight} pixels.`);
        if (config.layout === 'five') add('warn', 'Three mirrored directions', 'NW, W and SW are flipped right-facing views; for the final art standard, draw all eight directions.');
        else add('pass', 'Unique 8-way art', 'No mirrored direction is required.');
        if (!within) return checks;
        const alpha = inspectAlpha(data);
        if (alpha) {
            if (alpha.transparentRatio < 0.005) add('fail', 'Background is not transparent', 'The sheet contains a painted or opaque background. PNG extension alone does not provide transparency.');
            else if (alpha.transparentRatio < .1) add('warn', 'Little transparent padding', 'Less than 10% of sampled pixels are transparent. Check for a background or crowded frames.');
            else add('pass', 'Transparent artwork', `${Math.round(alpha.transparentRatio * 100)}% of sampled pixels are fully transparent.`);
            if (alpha.transparentRatio >= .1) {
                let empty = 0, bleed = 0; const rowBaseline = new Map(), rowCenter = new Map();
                for (let row = 0; row < minimumRows; row++) for (let col = 0; col < Number(config.columns); col++) {
                    const cell = framePixelCoverage(data, Number(config.offsetX) + col * Number(config.cellWidth),
                        Number(config.offsetY) + row * Number(config.cellHeight), Number(config.cellWidth), Number(config.cellHeight));
                    if (!cell || cell.empty) { empty++; continue; }
                    if (cell.bounds.minX === 0 || cell.bounds.maxX >= Number(config.cellWidth) - 1 || cell.bounds.minY === 0 || cell.bounds.maxY >= Number(config.cellHeight) - 1) bleed++;
                    if (!rowBaseline.has(row)) { rowBaseline.set(row, []); rowCenter.set(row, []); }
                    rowBaseline.get(row).push(cell.bounds.maxY);
                    rowCenter.get(row).push((cell.bounds.minX + cell.bounds.maxX) / 2);
                }
                if (empty) add('fail', 'Missing visible artwork', `${empty} cell(s) contain no opaque sprite pixels.`);
                else add('pass', 'All frames contain artwork', 'Every required frame has nontransparent pixels.');
                if (bleed) add('warn', 'Art touches frame boundaries', `${bleed} frames touch a cell edge and may clip on animation.`);
                else add('pass', 'No detected frame clipping', 'Artwork has clear alpha padding at sampled frame boundaries.');
                const spread = items => Math.max(...items) - Math.min(...items);
                const footJitter = [...rowBaseline.values()].some(values => values.length > 1 && spread(values) > Math.max(5, Number(config.cellHeight) * 0.08));
                const pivotJitter = [...rowCenter.values()].some(values => values.length > 1 && spread(values) > Number(config.cellWidth) * 0.14);
                if (footJitter || pivotJitter) add('warn', 'Inconsistent sprite pivot', 'Frame silhouettes move too far within their cells. Align feet and center points so the creature does not jump in place.');
                else add('pass', 'Pivot stability', 'Detected alpha silhouettes have consistent foot and center alignment.');
            }
        } else add('warn', 'Transparency not yet scanned', 'Reload the image to inspect pixel alpha.');
        const remWidth = imageWidth - endX, remHeight = imageHeight - endY;
        if (remWidth > Number(config.cellWidth) / 2 || remHeight > Number(config.cellHeight) / 2)
            add('warn', 'Unused source image space', 'The selected grid leaves a substantial unused border; check image offsets.');
        return checks;
    }
    function manifest(config, file, imageWidth, imageHeight) {
        const mappings = config.layout === 'eight' ? EIGHT_ROW_MAP : FIVE_ROW_MAP;
        return {
            schemaVersion: '1.0', name: file || 'unnamed-creature', animation: 'walk',
            source: { width: imageWidth, height: imageHeight, columns: Number(config.columns), rows: Number(config.rows),
                frameWidth: Number(config.cellWidth), frameHeight: Number(config.cellHeight), offsetX: Number(config.offsetX), offsetY: Number(config.offsetY) },
            playback: { fps: Number(config.fps), loop: true },
            coordinateSystem: 'screen-x-right-y-down', directions: Object.fromEntries(DIRECTIONS.map(key => [key, { ...mappings[key] }])),
            notes: config.layout === 'five' ? 'NW, W and SW are derived by horizontal mirroring; this is not native eight-direction art.' : 'All eight directions have unique source rows.',
        };
    }
    function normalizedManifest(config, file, originalWidth, originalHeight, ready = false) {
        const cw = Number(config.cellWidth), ch = Number(config.cellHeight), columns = Number(config.columns);
        const normalized = manifest({ ...config, layout: 'eight', rows: 8, offsetX: 0, offsetY: 0 },
            (file || 'unnamed-creature').replace(/\.(png|jpe?g|webp)$/i, '') + '-8way-export.png', columns * cw, 8 * ch);
        normalized.origin = { file, imageWidth: originalWidth, imageHeight: originalHeight, sourceLayout: config.layout,
            mirroredDirections: config.layout === 'five' ? ['NW', 'W', 'SW'] : [], technicalValidated: ready,
            productionValidated: false, visualAccepted: false };
        normalized.notes = config.layout === 'five'
            ? 'EXPORT: 8 rows exist in the output image, but NW, W, SW were mirrored from the original 5-row concept. Transparency has NOT been repaired.'
            : 'EXPORT: each direction is represented by original artwork. Transparency has NOT been repaired.';
        return normalized;
    }
    return { DIRECTIONS, DIR_INFO, FIVE_ROW_MAP, EIGHT_ROW_MAP, DEFAULT_CONFIG,
        directionFromVector, directionFrame, describeLayout, inspectAlpha, framePixelCoverage, validate, manifest, normalizedManifest };
});
