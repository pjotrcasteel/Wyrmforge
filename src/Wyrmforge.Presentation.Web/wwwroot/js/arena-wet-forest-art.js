// Wet Forest floor painter: semantic, seeded 12px material tiles, not smoothed overlay blobs.
// The C# recipe owns roads, human sites and shallow ground patches. No tile creates a collider.
const CELL = 12;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
// Restrained wet-earth materials: separated by value and texture, not bright greens
// or a fullscreen "Gothic" color grade. The mage and enemies keep their own palette.
const MATERIALS = Object.freeze({
    loam: ['#252c25', '#272e27', '#283029', '#242b25'],
    moss: ['#283329', '#29342a', '#2b362c', '#283228'],
    mud: ['#2d2d29', '#30302b', '#32322d', '#2c2c28'],
    leafbed: ['#383229', '#39332a', '#3b352b', '#373229'],
    puddle: ['#151e1f', '#182122', '#1b2424', '#161f20'],
    road: ['#39362d', '#3b372e', '#3d392e', '#38352d'],
    clearing: ['#30312c', '#32332d', '#34342e', '#2e302b'],
});
const GRAIN = Object.freeze({
    loam: '#464a3d', moss: '#495843', mud: '#4b4638', leafbed: '#62503a',
    puddle: '#455650', road: '#625543', clearing: '#505044',
});

// Integer-only coordinate hashing avoids random state shared with simulation or actor motion.
function hash(seed, x, y) {
    let v = (seed | 0) ^ Math.imul(x, 0x9e3779b1) ^ Math.imul(y, 0x85ebca6b);
    v = Math.imul(v ^ (v >>> 16), 0x7feb352d);
    v = Math.imul(v ^ (v >>> 15), 0x846ca68b);
    return ((v ^ (v >>> 16)) >>> 0) / 4294967296;
}
function noise(seed, x, y, scale) {
    const gx = x / scale, gy = y / scale, ix = Math.floor(gx), iy = Math.floor(gy);
    const a = smooth(gx - ix), b = smooth(gy - iy);
    return lerp(lerp(hash(seed, ix, iy), hash(seed, ix + 1, iy), a),
        lerp(hash(seed, ix, iy + 1), hash(seed, ix + 1, iy + 1), a), b);
}

export function wetForestTrailAt(trail, fraction) {
    if (!trail?.length) return { x: .5, width: .12 };
    if (trail.length === 1) return { x: trail[0].x, width: trail[0].width };
    const f = clamp(fraction, 0, 1), last = trail.length - 1;
    const i = Math.min(last - 1, Math.floor(f * last));
    const a = trail[i], b = trail[i + 1];
    const t = smooth(clamp((f - a.y) / Math.max(.00001, b.y - a.y), 0, 1));
    return { x: lerp(a.x, b.x, t), width: lerp(a.width, b.width, t) };
}

function offshootDistance(recipe, seed, x, y, width, height) {
    const start = wetForestTrailAt(recipe.trail, recipe.siteY).x * width;
    const end = recipe.siteX * width;
    if (Math.abs(end - start) < 25) return Infinity;
    const t = (x - start) / (end - start);
    if (t < 0 || t > 1) return Infinity;
    // A visual worn branch within existing open woodland, never a mandatory corridor.
    const windingY = recipe.siteY * height + 13 * Math.sin(Math.PI * t) *
        Math.sin((seed & 15) * .37 + t * Math.PI);
    return Math.abs(y - windingY);
}

/** Pure floor classification; every returned material is walkable. No graphics or combat state. */
export function createWetForestTilePlan(recipe, seed, width, height) {
    if (!recipe?.trail?.length || width <= 0 || height <= 0) return [];
    const tiles = [];
    const sw = Math.ceil(width / CELL), sh = Math.ceil(height / CELL);
    const patches = (recipe.ground || []).map(p => ({
        kind: p.kind, x: p.x * width, y: p.y * height,
        rx: Math.max(2, p.radiusX * width), ry: Math.max(2, p.radiusY * height),
    }));
    for (let row = 0; row < sh; row++) {
        const y = row * CELL + CELL / 2;
        const track = wetForestTrailAt(recipe.trail, clamp(y / height, 0, 1));
        for (let col = 0; col < sw; col++) {
            const x = col * CELL + CELL / 2;
            const n = noise(seed ^ 0x342cdf6a, x, y, 96);
            const small = noise(seed ^ 0x415c7a39, x, y, 42);
            const jitter = (small - .5) * 12;
            let material = n > .72 ? 'moss' : n < .29 ? 'mud' : 'loam';
            // Broad coherent ecology patches, rather than a different random color per cell.
            for (const patch of patches) {
                const dx = (x - patch.x) / patch.rx;
                const dy = (y - patch.y) / patch.ry;
                if (dx * dx + dy * dy < 1 + (small - .5) * .20) {
                    material = patch.kind === 'leafbed' ? 'leafbed' :
                        patch.kind === 'clearing' ? 'clearing' : patch.kind;
                }
            }
            // Roads stay recognizable and fully connected despite a pixel-stepped edge.
            const distance = Math.abs(x - track.x * width);
            if (distance < track.width * width * .5 + jitter)
                material = 'road';
            if (offshootDistance(recipe, seed, x, y, width, height) < 16 + jitter * .25)
                material = 'road';
            // The site itself is a readable soil imprint, not invented raised masonry.
            const sx = (x - recipe.siteX * width) / 83;
            const sy = (y - recipe.siteY * height) / 46;
            if (sx * sx + sy * sy < 1 + (small - .5) * .15) material = 'clearing';
            const variation = Math.min(3, Math.floor(hash(seed ^ 0x567a3021, col, row) * 4));
            tiles.push({ x: col * CELL, y: row * CELL, material, variation });
        }
    }
    return tiles;
}

// Deliberately irregular 2px silt/soil edges bridge neighbouring material cells.
// The road and flooded patches keep their C# recipe footprint; these are paint only.
// Plan generated once during terrain bake, not every animation frame.
export function createWetForestMaterialEdges(tiles, seed, width, height = Infinity) {
    if (!tiles?.length || width <= 0) return [];
    const columns = Math.ceil(width / CELL);
    const marks = [];
    const bank = (a, b) => a === 'puddle' || b === 'puddle' ? '#222a27'
        : a === 'road' || b === 'road' ? '#302f29'
            : a === 'leafbed' || b === 'leafbed' ? '#302f27' : '#293329';
    for (let i = 0; i < tiles.length; i++) {
        const current = tiles[i], col = i % columns;
        for (const [neighbour, dx, dy, salt] of [
            [col + 1 < columns ? tiles[i + 1] : null, CELL, 0, 129],
            [tiles[i + columns], 0, CELL, 317],
        ]) {
            if (!neighbour || neighbour.material === current.material) continue;
            // Irregular 2px/4px sediment pixels dissolve square 12px seams.
            // Borrow a few dark adjacent grains on BOTH sides, never a grid line.
            const seamX = current.x + dx, seamY = current.y + dy;
            for (let step = 0; step < CELL; step += 2) {
                const pick = hash(seed ^ salt, current.x + step, current.y + step);
                if (pick < .23) continue;
                const offset = Math.floor(hash(seed ^ (salt + 17), step + current.x, current.y) * 4) * 2 - 4;
                const x = dx ? seamX + offset : current.x + step;
                const y = dy ? seamY + offset : current.y + step;
                const edgeWidth = pick > .8 ? 4 : 2, edgeHeight = 2;
                if (x >= 0 && y >= 0 && x + edgeWidth <= width && y + edgeHeight <= height)
                    marks.push({ x, y, width: edgeWidth, height: edgeHeight,
                        color: bank(current.material, neighbour.material) });
            }
        }
    }
    return marks;
}

function rect(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x / 2) * 2, Math.round(y / 2) * 2, w, h);
}
function groundSite(ctx, site, x, y, seed) {
    ctx.save();
    const ox = Math.round(x / 2) * 2, oy = Math.round(y / 2) * 2;
    if (site === 'forgotten-graves') {
        // Flat depressions and disturbed grave-soil at the C# marker site.
        for (let i = 0; i < 4; i++) {
            const px = ox - 39 + (i % 2) * 54, py = oy - 21 + Math.floor(i / 2) * 33;
            rect(ctx, px, py, 25, 13, '#242a26');
            rect(ctx, px + 2, py + 2, 21, 5, '#4c4538');
            rect(ctx, px + 5, py + 9, 15, 2, '#626052');
        }
    } else if (site === 'abandoned-camp') {
        // Charred ground and embedded splinters; the physical C# camp prop stays independent.
        for (let i = -3; i <= 3; i++)
            rect(ctx, ox + i * 9, oy - 12 + ((i * i) % 3) * 4, 8, 6, '#222722');
        for (let i = 0; i < 5; i++)
            rect(ctx, ox - 56 + i * 20, oy + 22 + i % 2 * 4, 14, 3, '#65513c');
    } else if (site === 'ruined-waystone') {
        // Worn flagstone imprints, never an implied inaccessible stone wall.
        for (let row = -2; row <= 2; row++)
            for (let col = -2; col <= 2; col++) {
                if ((row * row + col * col) > 7) continue;
                const dx = col * 17 + (row % 2) * 6, dy = row * 10;
                rect(ctx, ox + dx - 7, oy + dy - 4, 12, 6, (row + col) % 3 ? '#525549' : '#43483e');
                rect(ctx, ox + dx - 5, oy + dy - 4, 6, 2, '#666757');
            }
    } else if (site === 'broken-wagon') {
        // Dragging parallel ruts and fragments under the real C# cart and crates.
        for (const dy of [-10, 10]) {
            for (let i = 0; i < 15; i++) {
                const sway = Math.round(Math.sin(i * .7 + seed * .001) * 4 / 2) * 2;
                rect(ctx, ox - 99 + i * 8, oy + dy + sway, 6, 2, '#252a25');
            }
        }
        for (let i = 0; i < 6; i++)
            rect(ctx, ox - 32 + i * 12, oy + 27 + i % 2 * 4, 8, 3, '#685540');
    }
    ctx.restore();
}

export function drawWetForestGround(ctx, plan) {
    const recipe = plan?.wetForest;
    if (!recipe) return;
    const width = plan.width, height = plan.height, seed = plan.seed | 0;
    const tiles = createWetForestTilePlan(recipe, seed, width, height);
    ctx.save();
    ctx.globalAlpha = 1;
    for (const tile of tiles) {
        const { x, y, material, variation } = tile;
        const colors = MATERIALS[material] || MATERIALS.loam;
        rect(ctx, x, y, Math.min(CELL, width - x), Math.min(CELL, height - y), colors[variation]);
        // Soil flecks must not reveal the underlying 12px tile grid. Keep the
        // visual noise sparse, seed-stable and contained in the original floor.
        const grain = hash(seed ^ 0x4f6a21, x / CELL, y / CELL);
        if (grain < .46) {
            const dx = 2 + Math.floor(grain * 5) * 2;
            const dy = 2 + Math.floor(hash(seed ^ 0x78a41f, y / CELL, x / CELL) * 4) * 2;
            ctx.globalAlpha = material === 'puddle' ? .16 : .2;
            rect(ctx, x + dx, y + dy, grain < .15 ? 4 : 2, 2, GRAIN[material] || GRAIN.loam);
            if (material === 'road' && grain < .12)
                rect(ctx, x + dx + 2, y + 8, 4, 2, '#252923');
            ctx.globalAlpha = 1;
        }
    }
    // The floor uses a semantic material map: worn road margins and wet banks
    // blend locally rather than exposing an even grid of perfectly square cells.
    for (const mark of createWetForestMaterialEdges(tiles, seed, width, height)) {
        ctx.globalAlpha = .73;
        rect(ctx, mark.x, mark.y, mark.width, mark.height, mark.color);
    }
    ctx.globalAlpha = 1;
    // Distinct ground-only history around one physical C# story landmark.
    groundSite(ctx, recipe.site, recipe.siteX * width, recipe.siteY * height, seed);
    const influence = clamp(plan.corruption || 0, 0, 1);
    for (let i = 0; i < Math.round(influence * 24); i++) {
        const x = 36 + hash(seed ^ 0x2a1f87, i, 7) * (width - 72);
        const y = 42 + hash(seed ^ 0x4b2219, i, 11) * (height - 84);
        rect(ctx, x, y, 12 + (i % 4) * 4, 4 + (i % 3) * 2, '#342723');
        rect(ctx, x + 4, y, 4, 2, '#654337');
    }
    ctx.restore();
}
