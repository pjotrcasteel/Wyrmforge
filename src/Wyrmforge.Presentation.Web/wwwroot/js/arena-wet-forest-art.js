// Wet Forest floor painter: semantic, seeded 12px material tiles, not smoothed overlay blobs.
import { wetForestTreeFireState } from './arena-wet-forest-vegetation.js';
import { drawApprovedWetForestBase } from './arena-approved-ground-preview.js';
import { drawLiveWetForestMaterialBase } from './arena-live-wet-forest-materials.js';
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


/**
 * Worn, connected details along the actual C# route. Broken twin ruts help the
 * forest read as a traversed place at phone scale, without painting a narrow
 * obligatory lane or adding any blocker to the generous combat glades.
 */
export function createWetForestTrailImprints(recipe, seed, width, height) {
    if (!recipe?.trail?.length || width <= 0 || height <= 0) return [];
    const marks = [];
    const steps = Math.max(1, Math.floor(height / 9));
    for (let i = 0; i < steps; i++) {
        const y = snap2((i + .5) * height / steps);
        const trail = wetForestTrailAt(recipe.trail, y / height);
        for (const side of [-1, 1]) {
            const irregularity = hash(seed ^ 0x16c4b6, i, side + 2);
            if (irregularity < .43) continue;
            const offset = side * (14 + trail.width * width * .12);
            const x = snap2(trail.x * width + offset + (irregularity - .5) * 10);
            const w = irregularity > .82 ? 8 : 4;
            if (x < 0 || y < 0 || x + w > width || y + 2 > height) continue;
            marks.push({ x, y, width: w, height: 2, alpha: .46,
                color: irregularity > .82 ? '#544537' : '#232a24', kind: 'rut' });
        }
    }
    return marks;
}

/**
 * Clearing edges read as trampled soil giving way to leaf duff. Every mark is
 * INSIDE a seeded C# ground patch; the central fighting floor remains clean
 * enough to see automatic spell telegraphs and hundreds of moving enemies.
 */
export function createWetForestGladeMargins(recipe, seed, width, height) {
    const margins = [];
    for (const [index, clearing] of (recipe?.ground ?? []).entries()) {
        if (clearing.kind !== 'clearing') continue;
        const cx = clearing.x * width, cy = clearing.y * height;
        const rx = clearing.radiusX * width, ry = clearing.radiusY * height;
        const large = clearing.radiusX >= .15;
        const count = large ? 46 : 20;
        for (let i = 0; i < count; i++) {
            const variation = hash(seed ^ (index * 467), i, 47);
            if (variation < .14) continue;
            const theta = (i / count) * Math.PI * 2 + variation * .10;
            const radius = .80 + variation * .30;
            const x = snap2(cx + Math.cos(theta) * rx * radius);
            const y = snap2(cy + Math.sin(theta) * ry * radius);
            const w = variation > .82 ? 8 : 4;
            if (x < 0 || y < 0 || x + w > width || y + 2 > height) continue;
            margins.push({ x, y, width: w, height: 2, alpha: large ? .34 : .45,
                color: i % 3 === 0 ? '#202923' : '#4f4a39', kind: 'margin' });
        }
    }
    return margins;
}

// A second, sparse authored-pixel vocabulary breaks up the flat fill on each
// *walkable* material. The marks never define colliders, flames or tall props.
// Their direction, count and colors reflect wet soil, eroded stone and leaf litter.
const FLOOR_DETAIL = Object.freeze({
    loam: ['#343b30', '#1d2620', '#4b4535'],
    moss: ['#3b4838', '#1b2b23', '#4b513d'],
    mud: ['#423d32', '#252822', '#4c493c'],
    leafbed: ['#594734', '#2b2b25', '#6c5036'],
    puddle: ['#31413d', '#101b1c', '#47534a'],
    road: ['#52493b', '#282a26', '#675642'],
    clearing: ['#474336', '#232923', '#625643'],
});
const snap2 = value => Math.round(value / 2) * 2;

/** Tiny sediment facets and ruts, never independent upright artwork. */
export function createWetForestSurfaceDetails(tiles, seed, width, height) {
    const marks = [];
    for (const tile of tiles ?? []) {
        const gx = tile.x / CELL, gy = tile.y / CELL;
        const chance = hash(seed ^ 0x32ac0187, gx, gy);
        if (chance > .33) continue;
        const palette = FLOOR_DETAIL[tile.material] || FLOOR_DETAIL.loam;
        const dx = 2 + 2 * Math.floor(hash(seed ^ 0x1038a3e, gx, gy) * 4);
        const dy = 2 + 2 * Math.floor(hash(seed ^ 0x351211e, gx, gy) * 4);
        const x = tile.x + dx, y = tile.y + dy;
        const put = (px, py, w, h, color, alpha = 1) => {
            if (px >= 0 && py >= 0 && px + w <= width && py + h <= height)
                marks.push({ x: px, y: py, width: w, height: h, color, alpha, material: tile.material });
        };
        const type = tile.material;
        if (type === 'puddle') {
            // Three interrupted reflected reeds on black water, not glowing pools.
            put(x, y, 6, 2, palette[0], .67);
            if (chance < .12) put(tile.x + 2, tile.y + 8, 4, 2, palette[2], .43);
        } else if (type === 'road' || type === 'clearing') {
            // Broken worn paving and wheel-compressed dirt—flat enough to kite on.
            put(x, y, 6, 2, palette[0], .64);
            if (chance < .17) put(tile.x + 2, tile.y + 8, 4, 2, palette[1], .88);
            if (chance < .09) put(tile.x + 8, tile.y + 2, 2, 2, palette[2], .70);
        } else if (type === 'leafbed') {
            put(x, y, 4, 2, palette[0], .78);
            put(x - 2, y + 2, 2, 2, palette[2], .56);
        } else if (type === 'moss') {
            put(x, y, 4, 2, palette[0], .56);
            if (chance < .15) put(x + 2, y - 2, 2, 4, palette[2], .49);
        } else {
            // Silt striation and embedded grains are deliberately discontinuous.
            put(x, y, 4, 2, palette[0], .62);
            if (chance < .13) put(x - 2, y + 2, 2, 2, palette[1], .77);
        }
    }
    return marks;
}

/**
 * Fire scars grow out from the feet of ACTUAL C# trees, following their same
 * seed-stable char/burning state. They are baked as harmless flat ash, not new
 * obstacles, damage zones, or independent glowing landmarks.
 */
export function createWetForestScorchPlan(props, seed, width, height, influence, element) {
    if (element !== 'fire' || influence <= 0) return [];
    const marks = [];
    for (const prop of props ?? []) {
        if (prop.kind !== 'pine' && prop.kind !== 'dead-tree') continue;
        const state = wetForestTreeFireState(prop.kind, prop.id, seed, influence, element);
        if (state === 'healthy') continue;
        const px = snap2(prop.x * width), py = snap2(prop.y * height);
        const burning = state === 'burning' || state === 'split-glowing';
        const count = burning ? 13 : 9;
        for (let i = 0; i < count; i++) {
            const jitter = hash(seed ^ (prop.id * 971), i, 73);
            const angle = i * 2.399963 + hash(seed, prop.id, 13) * .9;
            const distance = 8 + jitter * (burning ? 30 : 23);
            const x = snap2(px + Math.cos(angle) * distance);
            const y = snap2(py + Math.sin(angle) * distance * .51);
            const widthPx = i % 3 === 0 ? 8 : 4, heightPx = i % 4 === 0 ? 4 : 2;
            if (x < 0 || y < 0 || x + widthPx > width || y + heightPx > height) continue;
            const ember = burning && i % 5 === 1 && influence > .63;
            marks.push({ x, y, width: widthPx, height: heightPx,
                color: ember ? '#a45f2c' : i % 3 === 0 ? '#1c211d' : '#322721',
                alpha: ember ? .60 : .78, treeId: prop.id });
        }
        // Rare late-route roots split the soil. Every 2px hot seam belongs to
        // a real burning C# tree and stays visibly small and non-solid.
        // Gameplay damage/telegraphs will only come with a later hazard system.
        if (burning && influence > .78 && (prop.id % 3 === 0 || state === 'split-glowing')) {
            for (let arm = 0; arm < 2; arm++) {
                const theta = hash(seed ^ prop.id, arm, 991) * Math.PI * 2;
                for (let segment = 0; segment < 4; segment++) {
                    const radius = 12 + segment * 7;
                    const x = snap2(px + Math.cos(theta) * radius);
                    const y = snap2(py + Math.sin(theta) * radius * .48);
                    if (x < 0 || y < 0 || x + 6 > width || y + 2 > height) continue;
                    marks.push({ x, y, width: 6, height: 2, color: '#171b18', alpha: .78, treeId: prop.id });
                    if (segment % 2 === 0) marks.push({
                        x: x + 2, y, width: 2, height: 2,
                        color: '#bb7131', alpha: .72, treeId: prop.id,
                    });
                }
            }
        }
    }
    return marks;
}

// Pixel-relief cobbles follow the *existing* C# woodland trail, not a short
// side-to-side wall. The path winds the full world height with locally broken
// paving, mud gaps and soft edges; it never adds any solid gameplay geometry.
export function createWetForestOldPaving(recipe, seed, width, height) {
    if (!recipe?.trail?.length || width <= 0 || height <= 0) return [];
    const marks = [];
    const spacing = 14;
    for (let row = 0; row <= Math.ceil(height / spacing); row++) {
        const y = row * spacing + 4;
        if (y + 10 >= height) break;
        const trail = wetForestTrailAt(recipe.trail, y / height);
        const center = trail.x * width;
        const halfWidth = Math.min(70, Math.max(44, trail.width * width * .53));
        const wear = .59 + .13 * Math.sin(row * .14 + (seed & 31) * .17) +
            .10 * Math.sin(row * .28 + (seed & 15) * .47);
        for (let lane = -5; lane <= 5; lane++) {
            const roll = hash(seed ^ 0x5e9a4d13, row, lane + 7);
            const edge = Math.abs(lane) / 5;
            // Whole sections decay into earth; only occasional stones survive at the edges.
            if (roll > wear - edge * .13 || (row + lane * 3) % 19 === 0) continue;
            const drift = hash(seed ^ 0x21ab8a17, lane + 11, row) - .5;
            const x = Math.round((center + lane * halfWidth / 5 + drift * 8) / 2) * 2;
            const py = Math.round((y + drift * 7 + ((lane & 1) ? 4 : 0)) / 2) * 2;
            const w = 8 + Math.floor(hash(seed ^ 0x347291, row, lane + 7) * 6) * 2;
            const h = roll > .78 ? 8 : 6;
            if (x < 2 || py < 2 || x + w + 2 > width || py + h + 2 > height) continue;
            // Restrained stone relief: dark wet paving should read as an old
            // footpath, not a pile of outlined Lego bricks. Most stones have a
            // single muted face; occasional small bevels suggest height.
            const face = roll > .72 ? '#5c6054' : roll > .43 ? '#50564b' : '#444c42';
            const mark = (dx, dy, mw, mh, color, alpha, kind) => {
                marks.push({ x: x + dx, y: py + dy, width: mw, height: mh,
                    color, alpha, kind });
            };
            mark(0, 0, w, h, face, .79, 'stone-face');
            const weather = hash(seed ^ 0x4129d0, row + 19, lane + 9);
            // Local and low-contrast only: no continuous black outlines.
            if (weather < .34)
                mark(2, h, w - 4, 2, '#1e2722', .24, 'stone-shadow');
            if (weather > .76)
                mark(2, 0, w - 6, 2, '#797b6b', .29, 'stone-highlight');
            if (weather > .56 && weather < .76)
                mark(w - 2, 2, 2, h - 2, '#303b32', .32, 'stone-bevel');
            if (weather < .07)
                mark(w - 4, 0, 2, 2, '#303b32', .45, 'stone-chip');
            if (weather > .93)
                mark(w - 4, h - 2, 4, 2, '#435842', .40, 'stone-moss');
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
        // The same refuge has a compact trampled floor and long-abandoned
        // firepit. As flat paint it remains after the real ruin is destroyed;
        // no extra barriers, tents or unearned crates appear on walkable ground.
        for (let i = -5; i <= 5; i++) {
            const roll = hash(seed ^ 0x35f12, i + 8, 39);
            rect(ctx, ox + i * 12, oy - 16 + Math.round(roll * 5) * 2,
                12, 4, i % 3 === 0 ? '#20251f' : '#2b2923');
            if (i % 2 === 0)
                rect(ctx, ox + i * 11, oy + 20 + (i % 3) * 4,
                    12, 2, '#594536');
        }
        // Footprints approach the camp via the already walkable soil.
        for (let i = 0; i < 7; i++) {
            const x = ox - 38 + i * 13;
            const y = oy + 32 + (i % 3) * 6;
            rect(ctx, x, y, 6, 2, '#20251e');
            rect(ctx, x + 5, y + 2, 4, 2, '#262b23');
        }
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

export function drawWetForestGround(ctx, plan, approvedAtlas = null) {
    const recipe = plan?.wetForest;
    if (!recipe) return;
    const width = plan.width, height = plan.height, seed = plan.seed | 0;
    const tiles = createWetForestTilePlan(recipe, seed, width, height);
    ctx.save();
    ctx.globalAlpha = 1;
    // Production Hunts and the lab share the exact PR #340 source-backed
    // materials. The previous code-painted floor stays as a safe fallback
    // while asynchronous artwork decodes (or if an asset is unavailable).
    const sourcePainted = !approvedAtlas && drawLiveWetForestMaterialBase(ctx, tiles, seed, width, height);
    const painted = sourcePainted || (approvedAtlas && drawApprovedWetForestBase(ctx, tiles, approvedAtlas, seed, width, height));
    if (!painted) for (const tile of tiles) {
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
    // The archived material paintings ALREADY contain soil/vegetation detail.
    // Keep older procedural flecks and rut stains only for the fallback.
    // Never draw synthetic old texture noise on top of the approved art study.
    if (!sourcePainted) {
        // The floor uses a semantic material map: worn road margins and wet banks
        // blend locally rather than exposing an even grid of perfectly square cells.
        for (const mark of createWetForestMaterialEdges(tiles, seed, width, height)) {
            ctx.globalAlpha = .73;
            rect(ctx, mark.x, mark.y, mark.width, mark.height, mark.color);
        }
        ctx.globalAlpha = 1;
        // Baked micro-material detail: broken soil facets, not a flat color wash.
        for (const mark of createWetForestSurfaceDetails(tiles, seed, width, height)) {
            ctx.globalAlpha = mark.alpha;
            rect(ctx, mark.x, mark.y, mark.width, mark.height, mark.color);
        }
        ctx.globalAlpha = 1;
        // Large-scale continuity: eroded ruts and soft edges of spacious glades.
        // These strokes are all walkable, and generated once with the static texture.
        for (const mark of [
            ...createWetForestGladeMargins(recipe, seed, width, height),
            ...createWetForestTrailImprints(recipe, seed, width, height),
        ]) {
            ctx.globalAlpha = mark.alpha;
            rect(ctx, mark.x, mark.y, mark.width, mark.height, mark.color);
        }
        ctx.globalAlpha = 1;
        // Embedded old paving follows the existing woodland trail for the whole
        // arena rather than painting a short raised-looking bar across the floor.
        for (const mark of createWetForestOldPaving(recipe, seed, width, height)) {
            ctx.globalAlpha = mark.alpha;
            rect(ctx, mark.x, mark.y, mark.width, mark.height, mark.color);
        }
        ctx.globalAlpha = 1;
    }
    // Distinct ground-only history around one physical C# story landmark.
    groundSite(ctx, recipe.site, recipe.siteX * width, recipe.siteY * height, seed);
    for (const mark of createWetForestScorchPlan(
        plan.forestProps, seed, width, height, clamp(plan.corruption || 0, 0, 1), plan.element)) {
        ctx.globalAlpha = mark.alpha;
        rect(ctx, mark.x, mark.y, mark.width, mark.height, mark.color);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
}
