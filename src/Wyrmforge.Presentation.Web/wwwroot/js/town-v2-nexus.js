// Town Scene V2 / separate optional rear-well silhouette, approved front route untouched.
// Navigation comes ONLY from the rasterized mask, never night-navigation.json.
// V1 remains completely unmodified outside the explicit ?townV2=1 test.
const WIDTH = 1672;
const HEIGHT = 941;
const FOOT_RADIUS = 8;
const CELL = 6;
const START = { x: 440, y: 401 };
const STAIR_EXIT = { x: 575, y: 492 };
const PLAZA_END = { x: 681, y: 623 };
const WELL_FRONT_MID = { x: 820, y: 582 };
const WELL_FRONT_END = { x: 974, y: 614 };
const FRONT_VISUAL_CONTACT_MAX_Y = 590; // Feet close enough for sprite to overlap well's front
// Independently selectable Phase 5 debug route; front V2 stays the default.
const REAR_ENTRY = { x: 680, y: 469 };
const REAR_END = { x: 852, y: 452 };
// A walker belongs on the far side of the TIMBER, not diverted around it.
// Screenshot-grounded crossing where the actual post alpha should occlude it.
const RIGHT_POST_PASS = { x: 800, y: 444 };
// Crop to the existing approved alpha contours with >=10px clear margins on each edge.
const WELL_CUTOUT = { x: 810, y: 392, width: 130, height: 160, depthY: 498 };
const NOTICE_CUTOUT = { x: 721, y: 411, width: 93, height: 139, depthY: 459 };
const WELL_RIM = { x: 920, y: 551 };
const WELL_CENTER = { x: 820, y: 535 };
const NOTICEBOARD_POST = { x: 762, y: 495 };
const LOWER_GARDEN = { x: 950, y: 708 };
// Only the front/south approach is allowed. The well base, noticeboard and
// rear side remain forbidden; no foreground well layer is needed in this slice.
// Screenshot-grounded: painted foliage is LEFT of the stair, not over its treads.
// The old (497..547, 411..465) cutout inadvertently replayed STAIR pixels over NPCs.
const FOLIAGE = { x: 418, y: 412, width: 42, height: 29, depthY: 438 };
const STAIR_MASONRY = { x: 530, y: 432 };
const STAIR_TREAD = { x: 500, y: 440 };
const PLANT_BASE = { x: 445, y: 443 };
const WELL_BASE = { x: 735, y: 550 };
const WEST_PLANTER = { x: 560, y: 612 };
const PLAZA_STONE = { x: 650, y: 565 };
const live = new Map();

const pixelIndex = (x, y) => ((Math.round(y) * WIDTH + Math.round(x)) * 4);
function buildNavigation(source, includeCoverage = false, reviewedMask = null, candidateMask = null) {
    const canvas = document.createElement("canvas");
    canvas.width = WIDTH; canvas.height = HEIGHT;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Town V2 requires a 2D mask context.");
    ctx.drawImage(source, 0, 0, WIDTH, HEIGHT);
    const pixels = ctx.getImageData(0, 0, WIDTH, HEIGHT).data;
    const inMask = (x, y) => x >= 0 && y >= 0 && x < WIDTH && y < HEIGHT &&
        pixels[pixelIndex(x, y)] > 230;
    const canStand = (x, y) => {
        if (!inMask(x, y)) return false;
        // The feet are a DISC, not a point; checks are done on mask pixels.
        for (let i = 0; i < 12; i++) {
            const a = i * Math.PI / 6;
            if (!inMask(x + FOOT_RADIUS * Math.cos(a), y + FOOT_RADIUS * Math.sin(a)))
                return false;
        }
        return true;
    };
    const overlay = document.createElement("canvas");
    overlay.width = WIDTH; overlay.height = HEIGHT;
    const overlayCtx = overlay.getContext("2d");
    const img = overlayCtx.createImageData(WIDTH, HEIGHT);
    // Audit is an optional second overlay. Do NOT convert black pixels into
    // "known solid": the current mask has no separate reviewed-solid class.
    const coverageOverlay = includeCoverage ? document.createElement("canvas") : null;
    if (coverageOverlay) {
        coverageOverlay.width = WIDTH;
        coverageOverlay.height = HEIGHT;
    }
    const coverageCtx = coverageOverlay?.getContext("2d");
    const coverageImg = coverageCtx?.createImageData(WIDTH, HEIGHT);
    let reviewedPixels = null;
    let candidatePixels = null;
    if (coverageImg) {
        if (!reviewedMask || reviewedMask.naturalWidth !== WIDTH || reviewedMask.naturalHeight !== HEIGHT)
            throw new Error("Town V2 audit needs a separate full-sized reviewed-solid atlas.");
        const reviewedCanvas = document.createElement("canvas");
        reviewedCanvas.width = WIDTH;
        reviewedCanvas.height = HEIGHT;
        const reviewedCtx = reviewedCanvas.getContext("2d", { willReadFrequently: true });
        if (!reviewedCtx) throw new Error("Town V2 cannot read reviewed-solid atlas.");
        reviewedCtx.drawImage(reviewedMask, 0, 0);
        reviewedPixels = reviewedCtx.getImageData(0, 0, WIDTH, HEIGHT).data;
        if (!candidateMask || candidateMask.naturalWidth !== WIDTH ||
            candidateMask.naturalHeight !== HEIGHT)
            throw new Error("Town V2 audit needs a separate full-sized candidate-ground atlas.");
        const candidateCanvas = document.createElement("canvas");
        candidateCanvas.width = WIDTH;
        candidateCanvas.height = HEIGHT;
        const candidateCtx = candidateCanvas.getContext("2d", { willReadFrequently: true });
        if (!candidateCtx) throw new Error("Town V2 cannot read candidate-ground atlas.");
        candidateCtx.drawImage(candidateMask, 0, 0);
        candidatePixels = candidateCtx.getImageData(0, 0, WIDTH, HEIGHT).data;
    }
    // Tile audit is calculated during the SAME raster pass. It is accounting,
    // not pathfinding; decorative unmapped areas remain unclassified.
    const tileSize = 256;
    const tileColumns = Math.ceil(WIDTH / tileSize);
    const tileRows = Math.ceil(HEIGHT / tileSize);
    const tiles = coverageImg ? Array.from({ length: tileColumns * tileRows }, (_, index) => {
        const column = index % tileColumns, row = Math.floor(index / tileColumns);
        const x = column * tileSize, y = row * tileSize;
        return {
            column, row, x, y,
            width: Math.min(tileSize, WIDTH - x), height: Math.min(tileSize, HEIGHT - y),
            authoredGroundPixels: 0, reviewedSolidPixels: 0,
            classConflictPixels: 0, candidateGroundPixels: 0,
            notSeparatelyClassifiedPixels: 0
        };
    }) : [];
    let authoredGroundPixels = 0;
    let reviewedSolidPixels = 0;
    let classConflictPixels = 0;
    let candidateGroundPixels = 0;
    let candidateSolidOverlapPixels = 0;
    let notSeparatelyClassifiedPixels = 0;
    for (let p = 0; p < pixels.length; p += 4) {
        const authored = pixels[p] > 230;
        const reviewedSolid = !!reviewedPixels && reviewedPixels[p] > 230 &&
            reviewedPixels[p + 3] > 230;
        const candidateGround = !!candidatePixels && candidatePixels[p] > 230 &&
            candidatePixels[p + 3] > 230;
        // Hypothesized paving is never proof of safe footsteps or a reason
        // to erase a previously verified obstacle.
        if (candidateGround && reviewedSolid) candidateSolidOverlapPixels++;
        // The legacy teal mask remains purely based on the existing walk
        // pixels. The semantic atlas NEVER changes the actual foot collider.
        if (authored) {
            img.data[p] = 42; img.data[p + 1] = 224;
            img.data[p + 2] = 194; img.data[p + 3] = 74;
        }
        if (authored && reviewedSolid) classConflictPixels++;
        else if (authored) authoredGroundPixels++;
        else if (reviewedSolid) reviewedSolidPixels++;
        else if (candidateGround) candidateGroundPixels++;
        else notSeparatelyClassifiedPixels++;
        if (coverageImg) {
            const coordinate = p / 4;
            const x = coordinate % WIDTH;
            const y = Math.floor(coordinate / WIDTH);
            const tile = tiles[Math.floor(y / tileSize) * tileColumns + Math.floor(x / tileSize)];
            if (authored && reviewedSolid) tile.classConflictPixels++;
            else if (authored) tile.authoredGroundPixels++;
            else if (reviewedSolid) tile.reviewedSolidPixels++;
            else if (candidateGround) tile.candidateGroundPixels++;
            else tile.notSeparatelyClassifiedPixels++;
            // Teal = approved route, red = independently reviewed solid,
            // magenta = authoritative contradiction, blue = proposed paving
            // only (still BLOCKED for foot navigation), amber = unknown.
            const color = authored && reviewedSolid ? [227, 54, 198] :
                authored ? [42, 224, 194] :
                reviewedSolid ? [232, 76, 67] :
                candidateGround ? [67, 130, 236] : [240, 147, 59];
            coverageImg.data[p] = color[0];
            coverageImg.data[p + 1] = color[1];
            coverageImg.data[p + 2] = color[2];
            coverageImg.data[p + 3] = 110;
        }
    }
    overlayCtx.putImageData(img, 0, 0);
    if (coverageImg) {
        coverageCtx.putImageData(coverageImg, 0, 0);
        // Bounded grid is an audit locator, never a rendered scenery cutout.
        coverageCtx.save();
        coverageCtx.strokeStyle = "rgba(255,255,255,.34)";
        coverageCtx.lineWidth = 1;
        for (let x = tileSize; x < WIDTH; x += tileSize) {
            coverageCtx.beginPath();
            coverageCtx.moveTo(x + .5, 0);
            coverageCtx.lineTo(x + .5, HEIGHT);
            coverageCtx.stroke();
        }
        for (let y = tileSize; y < HEIGHT; y += tileSize) {
            coverageCtx.beginPath();
            coverageCtx.moveTo(0, y + .5);
            coverageCtx.lineTo(WIDTH, y + .5);
            coverageCtx.stroke();
        }
        coverageCtx.restore();
    }
    const totalPixels = WIDTH * HEIGHT;
    if (includeCoverage && reviewedSolidPixels === 0)
        throw new Error("Town V2 audit has no independently reviewed solid pixels.");
    if (authoredGroundPixels + reviewedSolidPixels + classConflictPixels +
        candidateGroundPixels + notSeparatelyClassifiedPixels !== totalPixels)
        throw new Error("Town V2 semantic audit does not account for every canvas pixel.");
    for (const tile of tiles)
        if (tile.authoredGroundPixels + tile.reviewedSolidPixels +
            tile.classConflictPixels + tile.candidateGroundPixels +
            tile.notSeparatelyClassifiedPixels !==
                tile.width * tile.height)
            throw new Error("Town V2 coverage tile does not account for its entire raster.");
    return {
        canStand, overlay, coverageOverlay,
        coverage: {
            totalPixels, authoredGroundPixels, reviewedSolidPixels,
            classConflictPixels, candidateGroundPixels, candidateSolidOverlapPixels,
            notSeparatelyClassifiedPixels,
            knownSolidClassAvailable: includeCoverage,
            reviewedSolidNames: includeCoverage
                ? ["well-footprint", "noticeboard-base", "stair-root-bed"] : [],
            candidateGroundNames: includeCoverage
                ? ["south-plaza", "west-apron", "east-apron"] : [],
            tileSize, tileColumns, tileRows, tiles,
            fullSceneMapped: false
        }
    };
}
function planRoute(nav, from, to) {
    const toCell = ({ x, y }) => [Math.round(x / CELL), Math.round(y / CELL)];
    const [sx, sy] = toCell(from);
    const [gx, gy] = toCell(to);
    const code = (x, y) => x + "," + y;
    const nodes = [[sx, sy]];
    const parents = new Map([[code(sx, sy), null]]);
    let found = null;
    // Deterministic 8-neighbour flood through eroded mask pixels only.
    for (let at = 0; at < nodes.length && at < 25000; at++) {
        const [x, y] = nodes[at];
        if (Math.abs(x - gx) <= 1 && Math.abs(y - gy) <= 1) {
            found = code(x, y); break;
        }
        for (const [dx, dy] of [[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,1],[-1,-1],[1,-1]]) {
            const nx = x + dx, ny = y + dy, k = code(nx, ny);
            if (parents.has(k) || !nav.canStand(nx * CELL, ny * CELL)) continue;
            if (dx && dy && (!nav.canStand(nx * CELL, y * CELL) ||
                !nav.canStand(x * CELL, ny * CELL))) continue;
            parents.set(k, code(x, y));
            nodes.push([nx, ny]);
        }
    }
    if (!found) throw new Error("The V2 Nexus mask cannot connect its own route endpoints.");
    const reverse = [];
    for (let key = found; key !== null; key = parents.get(key)) {
        const [x,y] = key.split(",").map(Number);
        reverse.push({ x: x * CELL, y: y * CELL });
    }
    reverse.reverse();
    return reverse;
}
// Extract one actually transparent, tightly cropped PNG from the approved town art.
// Its alpha comes from a separate V2 canopy mask, never V1 obstacle/occluder polygons.
async function buildFoliage(scene, mask) {
    const base = scene.querySelector(".refuge-town-night-base");
    if (!base) throw new Error("Town V2 cannot find the approved night artwork.");
    if (!base.complete) await new Promise((resolve, reject) => {
        base.addEventListener("load", resolve, { once: true });
        base.addEventListener("error", reject, { once: true });
    });
    if (typeof base.decode === "function") await base.decode();
    if (base.naturalWidth !== WIDTH || base.naturalHeight !== HEIGHT)
        throw new Error("Town V2 art and depth mask have different dimensions.");

    const { x, y, width, height } = FOLIAGE;
    // Reject a foreground cutout that reaches the stone staircase itself.
    // No paint sampled from stairs may ever be composited in front of a citizen.
    if (x + width > 465 || y + height > 445)
        throw new Error("Town V2 foliage mask overlaps the staircase.");
    const cutout = document.createElement("canvas");
    cutout.width = width; cutout.height = height;
    const ctx = cutout.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Town V2 cannot create its foreground cutout.");
    ctx.drawImage(base, x, y, width, height, 0, 0, width, height);
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(mask, x, y, width, height, 0, 0, width, height);
    ctx.globalCompositeOperation = "source-over";
    const pixels = ctx.getImageData(0, 0, width, height).data;
    const alpha = new Uint8Array(width * height);
    let opaquePixels = 0;
    for (let i = 0; i < alpha.length; i++) {
        alpha[i] = pixels[i * 4 + 3];
        if (alpha[i] > 80) opaquePixels++;
    }
    if (opaquePixels < 100 || alpha[0] !== 0)
        throw new Error("Town V2 foliage must be tightly cropped with transparent edges.");
    const image = new Image();
    await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error("Could not decode the V2 foreground PNG."));
        image.src = cutout.toDataURL("image/png");
    });
    return { ...FOLIAGE, image, alpha, opaquePixels, format: "image/png" };
}

// Render the exact alpha of a photographed prop, never its bounding rectangle.
async function buildArchitectureCutout(scene, source, bounds, label) {
    const base = scene.querySelector(".refuge-town-night-base");
    if (!base || !base.complete || base.naturalWidth !== WIDTH || base.naturalHeight !== HEIGHT)
        throw new Error("Town V2 " + label + " needs the approved 1672x941 panorama.");
    const { x, y, width, height } = bounds;
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Town V2 " + label + " cannot build alpha.");
    ctx.drawImage(base, x, y, width, height, 0, 0, width, height);
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(source, x, y, width, height, 0, 0, width, height);
    ctx.globalCompositeOperation = "source-over";
    const rgba = ctx.getImageData(0, 0, width, height).data;
    const alpha = new Uint8Array(width * height);
    let opaquePixels = 0;
    for (let i = 0; i < alpha.length; i++) {
        alpha[i] = rgba[i * 4 + 3];
        if (alpha[i] > 80) opaquePixels++;
    }
    // Check the ENTIRE perimeter. Corner-only checks allowed cut-off roof and
    // noticeboard pixels to form straight opaque strips when composited.
    let clippedEdge = false;
    for (let x = 0; x < width; x++) {
        if (alpha[x] > 0 || alpha[(height - 1) * width + x] > 0) clippedEdge = true;
    }
    for (let y = 0; y < height; y++) {
        if (alpha[y * width] > 0 || alpha[y * width + width - 1] > 0) clippedEdge = true;
    }
    if (opaquePixels < 120 || clippedEdge)
        throw new Error("Town V2 " + label + " is clipped or lacks transparent margins.");
    const image = new Image();
    await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error("Town V2 " + label + " alpha PNG failed."));
        image.src = canvas.toDataURL("image/png");
    });
    return { ...bounds, image, alpha, opaquePixels, format: "image/png", edgeTransparent: !clippedEdge };
}
function overlapsFoliage(position, foliage) {
    if (!foliage || position.y >= foliage.depthY) return false;
    // Actual alpha coverage of the actor's silhouette, not a broad rectangular
    // clip that makes whole citizens vanish when approaching a plant.
    const left = Math.max(0, Math.floor(position.x - 6 - foliage.x));
    const right = Math.min(foliage.width - 1, Math.ceil(position.x + 6 - foliage.x));
    const top = Math.max(0, Math.floor(position.y - 30 - foliage.y));
    const bottom = Math.min(foliage.height - 1, Math.ceil(position.y - foliage.y));
    for (let y = top; y <= bottom; y++)
        for (let x = left; x <= right; x++)
            if (foliage.alpha[y * foliage.width + x] > 80) return true;
    return false;
}
// Walking and idle animation are derived from DISTANCE moved, never wall time
// or Math.random(): recording/replaying the same positions yields the same pose.
function updateResidentMotion(person, previous, dt) {
    const dx = person.position.x - previous.x;
    const dy = person.position.y - previous.y;
    const distance = Math.hypot(dx, dy);
    person.moving = distance > .015;
    if (person.moving) {
        person.stride += distance * .25;
        person.distanceWalked += distance;
        person.walkingFrames++;
        person.idleSeconds = 0;
        if (Math.abs(dx) > .03) person.facing = dx > 0 ? 1 : -1;
    } else {
        person.idleSeconds += dt;
        person.idleFrames++;
    }
}
// Every NPC uses the same foot-space and the same sampled architectural alpha.
// Sorted feet let a closer NPC appear IN FRONT of the props while a rear NPC
// disappears BEHIND exactly the wood/tiles; no copied pavement or broad overlays.
function drawCitizen(ctx, person) {
    ctx.save();
    ctx.translate(person.position.x, person.position.y);
    ctx.fillStyle = "#061622aa";
    ctx.beginPath();ctx.ellipse(0, 2, 9, 4, 0, 0, Math.PI * 2);ctx.fill();
    const animated = person.animated === true;
    const step = animated && person.moving ? Math.sin(person.stride) : 0;
    const bob = animated && person.moving ? Math.round(Math.abs(step) * 1.3) : 0;
    const arm = animated && person.moving ? Math.round(step * 2) : 0;
    // Bob the body, not the world-space foot origin used by navigation/depth.
    ctx.translate(0, -bob);
    if (animated) {
        ctx.fillStyle = "#332d2d";
        ctx.fillRect(-5, -3 + arm, 4, 5);
        ctx.fillRect(1, -3 - arm, 4, 5);
    }
    ctx.fillStyle = person.id === 0 ? "#d5ac73" : person.id === 1 ? "#be996e" : "#c5ae84";
    ctx.fillRect(-5,-21,10,19);
    ctx.fillStyle = person.id === 0 ? "#52677e" : person.id === 1 ? "#785548" : "#466c56";
    ctx.fillRect(-6,-17,12,11);
    if (animated) {
        ctx.fillStyle = "#a17c55";
        ctx.fillRect(-7,-16 + arm,2,8);
        ctx.fillRect(5,-16 - arm,2,8);
    }
    ctx.fillStyle = "#edcfad";ctx.fillRect(-4,-29,8,9);
    if (animated) {
        const glance = person.moving ? person.facing :
            (Math.floor(Math.max(0, person.idleSeconds - .5) / 1.6) + person.id) % 2 === 0 ? 1 : -1;
        ctx.fillStyle = "#47372d";
        ctx.fillRect(glance > 0 ? 2 : -3, -26, 1, 1);
    }
    ctx.strokeStyle = "#fcdd8d";ctx.lineWidth = 1.5;
    ctx.strokeRect(-7,-31,14,31);
    ctx.restore();
}
function draw(w) {
    const ctx = w.canvas.getContext("2d");
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    if (w.coverageAudit && w.nav.coverageOverlay)
        ctx.drawImage(w.nav.coverageOverlay, 0, 0);
    if (w.showMask) {
        ctx.drawImage(w.nav.overlay, 0, 0);
        ctx.save();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(251,211,127,.85)";
        ctx.setLineDash([6,5]);ctx.beginPath();
        w.route.forEach((p,i) => i ? ctx.lineTo(p.x,p.y) : ctx.moveTo(p.x,p.y));
        ctx.stroke();ctx.restore();
    }
    const residents = [{ id: 0, position: w.position, animated: w.extras.length > 0,
        stride: w.stride, moving: w.moving, facing: w.facing, idleSeconds: w.idleSeconds }, ...w.extras]
        .sort((a,b) => a.position.y - b.position.y || a.id - b.id);
    for (const person of residents) {
        drawCitizen(ctx, person);
        const well = !!w.wellCutout && overlapsFoliage(person.position, w.wellCutout);
        const notice = !!w.noticeCutout && overlapsFoliage(person.position, w.noticeCutout);
        const shrub = overlapsFoliage(person.position, w.foliage);
        if (person.id === 0) {
            w.lastWellOccluded = well && w.rearMode;
            w.lastNoticeOccluded = notice && w.rearMode;
            w.lastOccluded = shrub;
        }
        if (!w.showDepth) continue;
        if (well) {
            ctx.drawImage(w.wellCutout.image, w.wellCutout.x, w.wellCutout.y);
            if (person.id === 0) w.wellOcclusionFrames++;
            else w.crowdOcclusionFrames++;
        }
        if (notice) {
            ctx.drawImage(w.noticeCutout.image, w.noticeCutout.x, w.noticeCutout.y);
            if (person.id === 0) {
                w.noticeOcclusionFrames++;
                if (Math.abs(w.position.x - RIGHT_POST_PASS.x) <= 9 &&
                    Math.abs(w.position.y - RIGHT_POST_PASS.y) <= 15)
                    w.rightPostOcclusionFrames++;
            } else w.crowdOcclusionFrames++;
        }
        if (shrub) {
            ctx.drawImage(w.foliage.image, w.foliage.x, w.foliage.y);
            if (person.id === 0) w.depthFrames++;
            else w.crowdOcclusionFrames++;
        }
    }
}
function advanceExtra(w, person, dt) {
    person.landmarkCooldown = Math.max(0, person.landmarkCooldown - dt);
    if (person.pause > 0) { person.pause = Math.max(0, person.pause - dt); return; }
    // A subtle deterministic change of pace, tied to footsteps rather than
    // frame rate. Do not alter the authored route, end points or foot disc.
    let remaining = person.speed * (1 + .07 * Math.sin(person.stride * .37 + person.id)) * dt;
    while (remaining > 0 && person.targetIndex >= 0 && person.targetIndex < person.route.length) {
        const target = person.route[person.targetIndex];
        const dx = target.x - person.position.x, dy = target.y - person.position.y;
        const distance = Math.hypot(dx, dy);
        const travel = Math.min(remaining, distance);
        const candidate = distance < .001 ? { ...target } : {
            x: person.position.x + dx / distance * travel,
            y: person.position.y + dy / distance * travel
        };
        // If moving into another resident's space, turn back along the SAME
        // raster route. Do not freeze forever or generate an off-mask detour.
        // Movement AWAY from someone already near is always permitted.
        const neighbors = [{ position: w.position }, ...w.extras.filter(p => p !== person)];
        if (neighbors.some(p => {
            const next = Math.hypot(candidate.x - p.position.x, candidate.y - p.position.y);
            const previous = Math.hypot(person.position.x - p.position.x, person.position.y - p.position.y);
            return next < 19 && next < previous - .01;
        })) {
            person.yieldFrames++;
            person.direction = -person.direction;
            person.targetIndex = Math.max(0, Math.min(person.route.length - 1,
                person.targetIndex + person.direction));
            person.pause = .1;
            return;
        }
        person.position = candidate;
        remaining -= travel;
        if (distance <= travel + .001) person.targetIndex += person.direction;
        // A moment of interest at wide paved landmarks, not on the narrow
        // noticeboard passage. Cooldown prevents repeat pauses on nearby cells.
        const landmark = person.id === 1 ? REAR_ENTRY : PLAZA_END;
        if (person.landmarkCooldown <= 0 &&
            Math.hypot(person.position.x - landmark.x, person.position.y - landmark.y) < 8) {
            person.pause = .55 + person.id * .15;
            person.landmarkCooldown = 18;
            person.landmarkPauses++;
            break;
        }
    }
    if (person.targetIndex < 0 || person.targetIndex >= person.route.length) {
        person.direction = -person.direction;
        person.targetIndex = Math.max(0, Math.min(person.route.length - 1,
            person.targetIndex + person.direction * 2));
        person.pause = .8 + person.id * .35;
        person.turns++;
    }
}
function animate(w, now) {
    if (w.disposed) return;
    const dt = Math.min(.05, Math.max(0, (now - w.lastTime) / 1000));
    w.lastTime = now;
    const primaryBefore = { ...w.position };
    // Opt-in deterministic screenshot pose only. Normal V2 walking is unchanged.
    if (w.inspectPose || w.inspectWell) {
        // Keep rendering at a fixed position for exact photographic pixel checks.
    } else if (w.pause > 0) w.pause -= dt;
    else {
        let remaining = 35 * dt;
        while (remaining > 0 && w.targetIndex >= 0 && w.targetIndex < w.route.length) {
            const target = w.route[w.targetIndex];
            const dx = target.x - w.position.x, dy = target.y - w.position.y;
            const distance = Math.hypot(dx,dy);
            const travel = Math.min(remaining, distance);
            const next = distance < .001 ? { ...target } : {
                x: w.position.x + dx / distance * travel,
                y: w.position.y + dy / distance * travel
            };
            // The approved route never changes: the leader merely yields a
            // frame when another NPC would occupy the same foot space.
            if (w.extras.some(p => Math.hypot(next.x - p.position.x, next.y - p.position.y) < 17)) {
                w.primaryYieldFrames++;
                remaining = 0;
                break;
            }
            w.position = next;
            remaining -= travel;
            if (distance <= travel + .001) w.targetIndex += w.direction;
        }
        if (w.targetIndex < 0 || w.targetIndex >= w.route.length) {
            if (w.direction === 1) {
                w.plazaVisits++;
                w.wellFrontVisits++;
            }
            w.direction = -w.direction;
            w.targetIndex = Math.max(0, Math.min(w.route.length - 1, w.targetIndex + w.direction * 2));
            w.pause = .6;
        }
    }
    if (w.extras.length) updateResidentMotion(w, primaryBefore, dt);
    for (const person of w.extras) {
        const before = { ...person.position };
        advanceExtra(w, person, dt);
        updateResidentMotion(person, before, dt);
    }
    for (const person of w.extras)
        if (!w.nav.canStand(person.position.x, person.position.y)) w.maskViolations++;
    if (w.extras.length) {
        w.crowdFrames++;
        const positions = [w.position, ...w.extras.map(p => p.position)];
        for (let i = 0; i < positions.length; i++)
            for (let j = i + 1; j < positions.length; j++)
                if (Math.hypot(positions[i].x - positions[j].x,
                    positions[i].y - positions[j].y) < 12) w.crowdOverlapFrames++;
    }
    if (w.rearMode && w.position.x >= 810 && w.position.x <= 854 &&
        w.position.y <= 473) w.rearFrames++;
    // Visual-acceptance telemetry: a route that merely passes far south is
    // NOT accepted as "in front of the well", even if it remains mask-safe.
    if (w.position.x >= 760 && w.position.x <= 920 &&
        w.position.y <= FRONT_VISUAL_CONTACT_MAX_Y) {
        w.nearWellFrames++;
        w.nearestWellFootY = Math.min(w.nearestWellFootY, w.position.y);
    }
    // Every interpolated animation frame must be foot-disc safe. The previous
    // 300ms status tick could miss brief excursions between observations.
    const safe = w.nav.canStand(w.position.x, w.position.y);
    if (!safe) w.maskViolations++;
    draw(w);
    if (now - w.lastStatus > 300) {
        w.lastStatus = now;
        w.status.textContent = "V2 · " + (w.extras.length + 1) + " NPC · " +
            (safe && w.maskViolations === 0 ? "ON MASK" : "OUTSIDE MASK") +
            " · " + (w.rearMode ? "WELL REAR" :
                w.position.x >= 720 ? "WELL FRONT" : w.position.y >= 540 ? "PLAZA" : "STAIRS") +
            " · DEPTH " + (w.showDepth ? "ON" : "OFF") +
            " · " + Math.round(w.position.x) + "," + Math.round(w.position.y) +
            (w.coverageAudit ? " · 7x4 GRID · ROUTE " +
                (w.nav.coverage.authoredGroundPixels * 100 /
                    w.nav.coverage.totalPixels).toFixed(1) +
                "% · SOLID " + w.nav.coverage.reviewedSolidPixels +
                " · CANDIDATE " + w.nav.coverage.candidateGroundPixels +
                " · CONFLICT " + w.nav.coverage.classConflictPixels +
                " · REST UNCLASSIFIED" : "");
    }
    w.frame = requestAnimationFrame(t => animate(w,t));
}
function loadMask(url) {
    return new Promise((resolve,reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Town V2 navigation mask missing: " + url));
        img.src = url;
    });
}
export async function mountTownV2Nexus(sceneSelector, toggleSelector, depthSelector, statusSelector) {
    const scene = document.querySelector(sceneSelector);
    const canvas = scene?.querySelector("[data-town-v2-canvas]");
    const toggle = document.querySelector(toggleSelector);
    const depthToggle = document.querySelector(depthSelector);
    const status = document.querySelector(statusSelector);
    if (!scene || !canvas || !toggle || !depthToggle || !status || live.has(scene)) return;
    const query = new URLSearchParams(window.location.search);
    const rearMode = query.get("townRoute") === "rear";
    const inspectPose = rearMode && query.get("townPose") === "post";
    const inspectWell = rearMode && query.get("townPose") === "well";
    const coverageAudit = query.get("townCoverage") === "1";
    // Explicit V2-only crowd preview. Keep the approved one-person inspection
    // and normal gameplay untouched until several residents pass on mobile.
    const residentCount = !inspectPose && !inspectWell && query.get("townResidents") === "3" ? 3 : 1;
    const state = {
        canvas, toggle, depthToggle, status, disposed: false, frame: 0,
        rearMode, inspectPose, inspectWell, residentCount, coverageAudit,
        nav: null, foliage: null, wellCutout: null, noticeCutout: null,
        extras: [], crowdFrames: 0, crowdOverlapFrames: 0, crowdOcclusionFrames: 0,
        primaryYieldFrames: 0, stride: 0, facing: 1, moving: false,
        idleSeconds: 0, walkingFrames: 0, idleFrames: 0, distanceWalked: 0,
        route: [], position: { ...START }, targetIndex: 1,
        direction: 1, pause: .5, lastTime: performance.now(),
        lastStatus: 0, showMask: true, showDepth: true, lastOccluded: false,
        depthFrames: 0, maskViolations: 0, plazaVisits: 0, wellFrontVisits: 0,
        nearWellFrames: 0, nearestWellFootY: HEIGHT,
        rearFrames: 0, wellOcclusionFrames: 0, noticeOcclusionFrames: 0,
        rightPostOcclusionFrames: 0,
        lastWellOccluded: false, lastNoticeOccluded: false
    };
    live.set(scene, state);
    if (residentCount > 1 || coverageAudit) {
        state.showMask = false;
        toggle.setAttribute("aria-pressed", "false");
    }
    state.click = () => {
        state.showMask = !state.showMask;
        toggle.setAttribute("aria-pressed", String(state.showMask));
    };
    toggle.addEventListener("click", state.click);
    state.depthClick = () => {
        state.showDepth = !state.showDepth;
        depthToggle.setAttribute("aria-pressed", String(state.showDepth));
    };
    depthToggle.addEventListener("click", state.depthClick);
    try {
        const walkUrl = new URL("art/town/nexus-v2-walk-mask.svg?v=0.0.181", document.baseURI);
        const depthUrl = new URL("art/town/nexus-v2-foliage-mask.svg?v=0.0.181", document.baseURI);
        const urls = [loadMask(walkUrl.href), loadMask(depthUrl.href)];
        if (rearMode || residentCount > 1 || coverageAudit) {
            urls.push(loadMask(new URL("art/town/nexus-v2-well-foreground.svg?v=0.0.181", document.baseURI).href));
            urls.push(loadMask(new URL("art/town/nexus-v2-noticeboard-foreground.svg?v=0.0.181", document.baseURI).href));
        }
        if (coverageAudit) {
            urls.push(loadMask(new URL(
                "art/town/nexus-v2-reviewed-solid-footprints.svg?v=0.0.181", document.baseURI).href));
            urls.push(loadMask(new URL(
                "art/town/nexus-v2-ground-candidates.svg?v=0.0.181", document.baseURI).href));
        }
        const [walkMask, depthMask, wellMask, noticeMask, reviewedMask, candidateMask] =
            await Promise.all(urls);
        if (state.disposed) return;
        state.nav = buildNavigation(walkMask, coverageAudit, reviewedMask, candidateMask);
        if (![START, STAIR_EXIT, STAIR_TREAD, PLAZA_STONE, PLAZA_END,
            WELL_FRONT_MID, WELL_FRONT_END].every(p => state.nav.canStand(p.x,p.y)))
            throw new Error("Town V2 stairs, plaza and well-front stops must fit the mask.");
        if (state.nav.canStand(STAIR_MASONRY.x, STAIR_MASONRY.y))
            throw new Error("Town V2 staircase side masonry must be blocked.");
        if (state.nav.canStand(PLANT_BASE.x, PLANT_BASE.y))
            throw new Error("Town V2 stair-side garden roots must be blocked.");
        if ([WELL_BASE, WELL_CENTER, WELL_RIM, NOTICEBOARD_POST, WEST_PLANTER,
            LOWER_GARDEN].some(p => state.nav.canStand(p.x,p.y)))
            throw new Error("Town V2 well, noticeboard and garden feet must stay blocked.");
        state.foliage = await buildFoliage(scene, depthMask);
        if (state.disposed) return;
        if (rearMode || residentCount > 1 || coverageAudit) {
            // A separate cutout each for the timber well and the noticeboard.
            // Neither reaches into front-route rendering or legacy occluders.
            [state.wellCutout, state.noticeCutout] = await Promise.all([
                buildArchitectureCutout(scene, wellMask, WELL_CUTOUT, "well"),
                buildArchitectureCutout(scene, noticeMask, NOTICE_CUTOUT, "noticeboard")
            ]);
            if (state.disposed) return;
            if (![STAIR_EXIT, REAR_ENTRY, REAR_END].every(p => state.nav.canStand(p.x,p.y)))
                throw new Error("Town V2 well rear feet leave verified paving.");
            const entryRoute = planRoute(state.nav, STAIR_EXIT, REAR_ENTRY);
            const rearRoute = planRoute(state.nav, REAR_ENTRY, REAR_END);
            state.rearRoute = [...entryRoute, ...rearRoute.slice(1)];
            if (!state.rearRoute.some(p => p.x >= 820 && p.x <= 855 && p.y < 473))
                throw new Error("Town V2 rear route never travels behind the well roof.");
            // Keep the validated passage BEHIND real noticeboard timber.
            if (!state.rearRoute.some(p => Math.abs(p.x - RIGHT_POST_PASS.x) <= 9 &&
                    Math.abs(p.y - RIGHT_POST_PASS.y) <= 15 &&
                    overlapsFoliage(p, state.noticeCutout)))
                throw new Error("Town V2 rear walker must pass behind real right-post timber.");
            if (rearMode) state.route = state.rearRoute;
        }
        if (!rearMode) {
        // Explicit intermediate anchors preserve the owner-approved Nexus/plaza
        // traversal and force actual CLOSE well frontage rather than a wide arc.
        // All legs are still derived from the single authored 8px-foot-eroded mask.
        const staircaseAndPlaza = planRoute(state.nav, START, PLAZA_END);
        const approach = planRoute(state.nav, PLAZA_END, WELL_FRONT_MID);
        const frontage = planRoute(state.nav, WELL_FRONT_MID, WELL_FRONT_END);
        state.route = [...staircaseAndPlaza, ...approach.slice(1), ...frontage.slice(1)];
        if (!state.route.some(p => Math.hypot(p.x - STAIR_EXIT.x, p.y - STAIR_EXIT.y) <= 12) ||
            !state.route.some(p => Math.hypot(p.x - PLAZA_END.x, p.y - PLAZA_END.y) <= 16))
            throw new Error("Town V2 route bypassed previously approved stairs/plaza.");
        if (!state.route.some(p => p.x >= 780 && p.x <= 880 && p.y <= FRONT_VISUAL_CONTACT_MAX_Y))
            throw new Error("Town V2 walker remains too far below the front of the well.");
        }
        // Grid navigation is small, but still verify interpolated feet along
        // every diagonal/straight segment before any movement begins.
        for (let i = 1; i < state.route.length; i++) {
            const from = state.route[i - 1], to = state.route[i];
            for (let t = 0; t <= 1; t += .25)
                if (!state.nav.canStand(from.x + (to.x - from.x) * t,
                    from.y + (to.y - from.y) * t))
                    throw new Error("Town V2 plaza route cuts across an unwalkable pixel.");
        }
        // Debug-only stable frame at the real crossing. It never changes the
        // path or masks. This proves a painted post occludes a stationary actor.
        if (state.inspectPose && !state.nav.canStand(RIGHT_POST_PASS.x, RIGHT_POST_PASS.y))
            throw new Error("Town V2 post inspection feet are outside the approved paving.");
        if (state.inspectWell && !state.nav.canStand(REAR_END.x, REAR_END.y))
            throw new Error("Town V2 well inspection feet are outside the approved paving.");
        state.position = state.inspectPose ? { ...RIGHT_POST_PASS } :
            state.inspectWell ? { ...REAR_END } : { ...state.route[0] };
        if (residentCount === 3) {
            // Three independently timed routes through verified paving. Never
            // derive a parallel-offset route through planters or cobblestones.
            const front = rearMode ? [
                ...planRoute(state.nav, START, PLAZA_END),
                ...planRoute(state.nav, PLAZA_END, WELL_FRONT_MID).slice(1),
                ...planRoute(state.nav, WELL_FRONT_MID, WELL_FRONT_END).slice(1)
            ] : state.route;
            const second = rearMode ? front : planRoute(state.nav, REAR_ENTRY, REAR_END);
            const third = planRoute(state.nav, PLAZA_END, WELL_FRONT_MID);
            for (const [id, route, speed] of [[1, second, 29], [2, third, 24]]) {
                if (!route || route.length < 5 ||
                    route.some(p => !state.nav.canStand(p.x, p.y)))
                    throw new Error("Town V2 secondary citizen left approved paving.");
                state.extras.push({
                    id, route, position: { ...route[0] }, targetIndex: 1,
                    direction: 1, speed, pause: id * .65, animated: true,
                    turns: 0, yieldFrames: 0,
                    stride: 0, facing: id === 1 ? 1 : -1, moving: false,
                    idleSeconds: 0, walkingFrames: 0, idleFrames: 0, distanceWalked: 0,
                    landmarkCooldown: 0, landmarkPauses: 0
                });
            }
        }
        state.lastTime = performance.now();
        state.frame = requestAnimationFrame(t => animate(state,t));
    } catch (e) {
        status.textContent = "V2 ERROR · " + e.message;
        console.error("Town V2 experiment:", e);
    }
}
export function readTownV2Diagnostics(canvas) {
    const entry = [...live.values()].find(s => s.canvas === canvas);
    if (!entry) return null;
    return {
        active: !!entry.nav && entry.route.length > 1,
        version: 2, source: "nexus-v2-walk-mask.svg", usingLegacyNavigation: false,
        npcCount: entry.extras.length + 1, routeLength: entry.route.length,
        residents: [{ id: 0, route: entry.rearMode ? "rear" : "front",
            position: { ...entry.position }, safe: entry.nav?.canStand(entry.position.x, entry.position.y),
            moving: entry.moving, facing: entry.facing, walkingFrames: entry.walkingFrames,
            idleFrames: entry.idleFrames, stride: entry.stride, distanceWalked: entry.distanceWalked },
            ...entry.extras.map(p => ({ id: p.id,
                route: p.id === 1 ? (entry.rearMode ? "front" : "rear") : "plaza",
                position: { ...p.position }, safe: entry.nav?.canStand(p.position.x, p.position.y),
                turns: p.turns, yieldFrames: p.yieldFrames,
                moving: p.moving, facing: p.facing, walkingFrames: p.walkingFrames,
                idleFrames: p.idleFrames, stride: p.stride,
                distanceWalked: p.distanceWalked, landmarkPauses: p.landmarkPauses }))],
        crowdFrames: entry.crowdFrames, crowdOverlapFrames: entry.crowdOverlapFrames,
        crowdOcclusionFrames: entry.crowdOcclusionFrames,
        primaryYieldFrames: entry.primaryYieldFrames,
        position: { ...entry.position }, safe: entry.nav?.canStand(entry.position.x,entry.position.y),
        shrubBlocked: entry.nav ? !entry.nav.canStand(PLANT_BASE.x, PLANT_BASE.y) : false,
        stairTreadsWalkable: entry.nav?.canStand(STAIR_TREAD.x, STAIR_TREAD.y) ?? false,
        stairExitWalkable: entry.nav?.canStand(STAIR_EXIT.x, STAIR_EXIT.y) ?? false,
        plazaWalkable: entry.nav?.canStand(PLAZA_STONE.x, PLAZA_STONE.y) ?? false,
        plazaEndpointWalkable: entry.nav?.canStand(PLAZA_END.x, PLAZA_END.y) ?? false,
        wellExcluded: entry.nav ? !entry.nav.canStand(WELL_BASE.x, WELL_BASE.y) : false,
        westPlanterExcluded: entry.nav ? !entry.nav.canStand(WEST_PLANTER.x, WEST_PLANTER.y) : false,
        plazaVisits: entry.plazaVisits,
        wellFrontVisits: entry.wellFrontVisits,
        nearWellFrames: entry.nearWellFrames,
        nearestWellFootY: entry.nearestWellFootY,
        closeWellFrontRoute: entry.route.some(p => p.x >= 780 && p.x <= 880 && p.y <= FRONT_VISUAL_CONTACT_MAX_Y),
        wellFrontWalkable: entry.nav?.canStand(WELL_FRONT_MID.x, WELL_FRONT_MID.y) ?? false,
        wellFrontEndpointWalkable: entry.nav?.canStand(WELL_FRONT_END.x, WELL_FRONT_END.y) ?? false,
        wellCenterExcluded: entry.nav ? !entry.nav.canStand(WELL_CENTER.x, WELL_CENTER.y) : false,
        wellRimExcluded: entry.nav ? !entry.nav.canStand(WELL_RIM.x, WELL_RIM.y) : false,
        noticeboardExcluded: entry.nav ? !entry.nav.canStand(NOTICEBOARD_POST.x, NOTICEBOARD_POST.y) : false,
        lowerGardenExcluded: entry.nav ? !entry.nav.canStand(LOWER_GARDEN.x, LOWER_GARDEN.y) : false,
        wellFrontStage: entry.position.x >= 720 && entry.position.y >= 590,
        wellForegroundRequired: entry.rearMode,
        rearMode: entry.rearMode,
        rearFrames: entry.rearFrames,
        wellOcclusionFrames: entry.wellOcclusionFrames,
        noticeOcclusionFrames: entry.noticeOcclusionFrames,
        wellDepthReady: !!entry.wellCutout && entry.wellCutout.opaquePixels > 120,
        noticeDepthReady: !!entry.noticeCutout && entry.noticeCutout.opaquePixels > 120,
        wellDepthTransparent: entry.wellCutout?.format === "image/png",
        noticeDepthTransparent: entry.noticeCutout?.format === "image/png",
        wellDepthEdgesClear: entry.wellCutout?.edgeTransparent === true,
        noticeDepthEdgesClear: entry.noticeCutout?.edgeTransparent === true,
        behindWell: entry.lastWellOccluded,
        behindNoticeboard: entry.lastNoticeOccluded,
        inspectingRightPost: entry.inspectPose,
        inspectingWellRoof: entry.inspectWell,
        passesBehindRightPost: entry.rearMode && !!entry.noticeCutout &&
            entry.route.some(p => Math.abs(p.x - RIGHT_POST_PASS.x) <= 9 &&
                Math.abs(p.y - RIGHT_POST_PASS.y) <= 15 &&
                overlapsFoliage(p, entry.noticeCutout)),
        crowdRearPassesRightPost: entry.extras.length > 0 && !!entry.noticeCutout &&
            (entry.rearMode ? entry.route : entry.rearRoute ?? []).some(p =>
                Math.abs(p.x - RIGHT_POST_PASS.x) <= 9 &&
                Math.abs(p.y - RIGHT_POST_PASS.y) <= 15 &&
                overlapsFoliage(p, entry.noticeCutout)),
        rightPostOcclusionFrames: entry.rightPostOcclusionFrames,
        stairMasonryBlocked: entry.nav ? !entry.nav.canStand(STAIR_MASONRY.x, STAIR_MASONRY.y) : false,
        foliageExcludesStairs: FOLIAGE.x + FOLIAGE.width <= 465,
        stairAreaOccluded: entry.position.x >= 475 && entry.lastOccluded,
        foregroundReady: !!entry.foliage && entry.foliage.opaquePixels > 100,
        foregroundFormat: entry.foliage?.format ?? null,
        foregroundPixels: entry.foliage?.opaquePixels ?? 0,
        depthVisible: entry.showDepth, depthFrames: entry.depthFrames,
        occludingNow: entry.lastOccluded,
        maskVisible: entry.showMask, violations: entry.maskViolations,
        coverageAudit: entry.coverageAudit,
        coverage: entry.nav?.coverage ?? null,
        coverageLegend: entry.coverageAudit
            ? { authoredGround: "teal", reviewedSolid: "red",
                classConflict: "magenta", candidateGround: "blue",
                notSeparatelyClassified: "amber" } : null
    };
}
export function disposeTownV2Nexus(sceneSelector) {
    const scene = document.querySelector(sceneSelector);
    const state = scene && live.get(scene);
    if (!state) return;
    state.disposed = true;
    cancelAnimationFrame(state.frame);
    state.toggle.removeEventListener("click",state.click);
    state.depthToggle.removeEventListener("click",state.depthClick);
    live.delete(scene);
}
