// Where undergrowth grows. Scrub, flowers and litter are not sprinkled over the whole arena: they gather at the edge of the woods and at the
// foot of the rock, thin out into the meadow and keep off the road. The field is derived only from the C# terrain frame (trunks, boulders,
// rock heights and the road line), so it is deterministic and presentation only.
const SOIL = 0, ASH = 1, STONE = 2, WOOD = 4;

/** Cells (centres) closer than this to the road's centre line stay bare: the road is 2.4 m wide and its verge is worn. */
export const ROAD_CLEAR_CELLS = 2.6;
const ROAD_FADE_CELLS = 4;
const TREE_REACH_CELLS = 6;
const ROCK_REACH_CELLS = 3;

/** How densely a cell grows undergrowth, 0 (bare) to 1 (thick), cached on the frame. */
export function undergrowthField(frame) {
    if (frame.coverField) return frame.coverField;
    const { columns, rows } = frame;
    // Ground cover belongs to the authored map, not to its changing collision surface after excavation.
    const material = frame.baseMaterial ?? frame.material;
    const surface = frame.baseSurface ?? frame.surface;
    const count = columns * rows;
    const nearTree = new Float32Array(count).fill(99), nearRock = new Float32Array(count).fill(99), nearRoad = new Float32Array(count).fill(99);
    const spread = (target, cx, cy, reach, accept) => {
        for (let dy = -reach; dy <= reach; dy++) for (let dx = -reach; dx <= reach; dx++) {
            const c = Math.round(cx) + dx, r = Math.round(cy) + dy;
            if (c < 0 || r < 0 || c >= columns || r >= rows) continue;
            const distance = Math.hypot(c - cx, r - cy);
            if (distance <= reach && distance < target[r * columns + c] && accept(c, r)) target[r * columns + c] = distance;
        }
    };
    const always = () => true;
    for (let index = 0; index < count; index++) {
        const column = index % columns, row = Math.floor(index / columns);
        if (frame.trunks?.has(index) || material[index] === WOOD) spread(nearTree, column, row, TREE_REACH_CELLS, always);
        else if (frame.boulders?.has(index) || (material[index] === STONE && surface[index] >= 6)) spread(nearRock, column, row, ROCK_REACH_CELLS, always);
    }
    const road = frame.road;
    if (road?.length) for (let i = 0; i + 1 < road.length; i += 2) spread(nearRoad, road[i] / 16 - .5, road[i + 1] / 16 - .5, ROAD_FADE_CELLS + 1, always);
    const cover = new Float32Array(count);
    for (let index = 0; index < count; index++) {
        const m = material[index];
        if (m !== SOIL && m !== ASH) continue;
        // Thick in the first cells beside the trunks, thinning out over the next few; a little at the foot of rock; a trace elsewhere.
        const trees = nearTree[index] <= 1.5 ? 1 : nearTree[index] <= TREE_REACH_CELLS ? .6 * (1 - (nearTree[index] - 1.5) / (TREE_REACH_CELLS - 1.5)) ** 1.4 : 0;
        const rocks = nearRock[index] <= ROCK_REACH_CELLS ? .55 * (1 - nearRock[index] / (ROCK_REACH_CELLS + .5)) : 0;
        const road = nearRoad[index] <= ROAD_CLEAR_CELLS ? 0 : nearRoad[index] <= ROAD_CLEAR_CELLS + ROAD_FADE_CELLS ? (nearRoad[index] - ROAD_CLEAR_CELLS) / ROAD_FADE_CELLS : 1;
        cover[index] = Math.max(trees, rocks, .02) * road;
    }
    frame.coverField = cover;
    frame.rockNear = nearRock; frame.roadNear = nearRoad;
    return cover;
}

/** Chance that a cell holds loose stones: likely right at the foot of rock, fading out within three cells, never on the road. */
export function stoneChanceAt(frame, column, row) {
    if (!frame?.material || column < 0 || row < 0 || column >= frame.columns || row >= frame.rows) return 0;
    undergrowthField(frame);
    const index = row * frame.columns + column;
    if (frame.roadNear[index] <= ROAD_CLEAR_CELLS) return 0;
    const rock = frame.rockNear[index];
    return rock <= 1.5 ? .5 : rock <= ROCK_REACH_CELLS ? .2 : 0;
}

/** Cover of one cell; 0 when the frame cannot say (no frame, or a cell outside it). */
export function undergrowthAt(frame, column, row) {
    if (!frame?.material || column < 0 || row < 0 || column >= frame.columns || row >= frame.rows) return 0;
    return undergrowthField(frame)[row * frame.columns + column];
}
