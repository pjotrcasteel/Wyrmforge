// Town Scene V2 / Nexus stair correction: independent ground and foliage masks.
// Navigation comes ONLY from the rasterized mask, never night-navigation.json.
// V1 remains completely unmodified outside the explicit ?townV2=1 test.
const WIDTH = 1672;
const HEIGHT = 941;
const FOOT_RADIUS = 8;
const CELL = 6;
const START = { x: 440, y: 401 };
const FINISH = { x: 575, y: 492 };
// Screenshot-grounded: painted foliage is LEFT of the stair, not over its treads.
// The old (497..547, 411..465) cutout inadvertently replayed STAIR pixels over NPCs.
const FOLIAGE = { x: 418, y: 412, width: 42, height: 29, depthY: 438 };
const STAIR_MASONRY = { x: 530, y: 432 };
const STAIR_TREAD = { x: 500, y: 440 };
const PLANT_BASE = { x: 445, y: 443 };
const live = new Map();

const pixelIndex = (x, y) => ((Math.round(y) * WIDTH + Math.round(x)) * 4);
function buildNavigation(source) {
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
    for (let p = 0; p < pixels.length; p += 4) {
        if (pixels[p] <= 230) continue;
        img.data[p] = 42; img.data[p + 1] = 224;
        img.data[p + 2] = 194; img.data[p + 3] = 74;
    }
    overlayCtx.putImageData(img, 0, 0);
    return { canStand, overlay };
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
function draw(w) {
    const ctx = w.canvas.getContext("2d");
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    if (w.showMask) ctx.drawImage(w.nav.overlay, 0, 0);
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(251,211,127,.85)";
    ctx.setLineDash([6,5]); ctx.beginPath();
    w.route.forEach((p,i) => i ? ctx.lineTo(p.x,p.y) : ctx.moveTo(p.x,p.y));
    ctx.stroke();ctx.setLineDash([]);
    // One simple V2 test citizen. Never composite stair stone as if it were leaves.
    ctx.translate(w.position.x, w.position.y);
    ctx.fillStyle = "#061622aa";ctx.beginPath();ctx.ellipse(0,2,9,4,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle = "#d5ac73";ctx.fillRect(-5,-21,10,19);
    ctx.fillStyle = "#52677e";ctx.fillRect(-6,-17,12,11);
    ctx.fillStyle = "#edcfad";ctx.fillRect(-4,-29,8,9);
    ctx.strokeStyle = "#fcdd8d";ctx.lineWidth = 1.5;
    ctx.strokeRect(-7,-31,14,31);
    ctx.restore();
    w.lastOccluded = overlapsFoliage(w.position, w.foliage);
    if (w.lastOccluded && w.showDepth) {
        ctx.drawImage(w.foliage.image, w.foliage.x, w.foliage.y);
        w.depthFrames++;
    }
}
function animate(w, now) {
    if (w.disposed) return;
    const dt = Math.min(.05, Math.max(0, (now - w.lastTime) / 1000));
    w.lastTime = now;
    if (w.pause > 0) w.pause -= dt;
    else {
        let remaining = 35 * dt;
        while (remaining > 0 && w.targetIndex >= 0 && w.targetIndex < w.route.length) {
            const target = w.route[w.targetIndex];
            const dx = target.x - w.position.x, dy = target.y - w.position.y;
            const distance = Math.hypot(dx,dy);
            if (distance <= remaining + .001) {
                w.position = { ...target };
                remaining -= distance;
                w.targetIndex += w.direction;
            } else {
                w.position = {
                    x: w.position.x + dx / distance * remaining,
                    y: w.position.y + dy / distance * remaining
                };
                remaining = 0;
            }
        }
        if (w.targetIndex < 0 || w.targetIndex >= w.route.length) {
            w.direction = -w.direction;
            w.targetIndex = Math.max(0, Math.min(w.route.length - 1, w.targetIndex + w.direction * 2));
            w.pause = .6;
        }
    }
    draw(w);
    if (now - w.lastStatus > 300) {
        w.lastStatus = now;
        const safe = w.nav.canStand(w.position.x,w.position.y);
        w.status.textContent = "V2 · 1 NPC · " + (safe ? "ON MASK" : "OUTSIDE MASK") +
            " · DEPTH " + (w.showDepth ? "ON" : "OFF") +
            " · " + Math.round(w.position.x) + "," + Math.round(w.position.y);
        if (!safe) w.maskViolations++;
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
    const state = {
        canvas, toggle, depthToggle, status, disposed: false, frame: 0,
        nav: null, foliage: null, route: [], position: { ...START }, targetIndex: 1,
        direction: 1, pause: .5, lastTime: performance.now(),
        lastStatus: 0, showMask: true, showDepth: true, lastOccluded: false,
        depthFrames: 0, maskViolations: 0
    };
    live.set(scene, state);
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
        const walkUrl = new URL("art/town/nexus-v2-walk-mask.svg?v=0.0.160", document.baseURI);
        const depthUrl = new URL("art/town/nexus-v2-foliage-mask.svg?v=0.0.160", document.baseURI);
        const [walkMask, depthMask] = await Promise.all([
            loadMask(walkUrl.href), loadMask(depthUrl.href)
        ]);
        if (state.disposed) return;
        state.nav = buildNavigation(walkMask);
        if (![START, FINISH, STAIR_TREAD].every(p => state.nav.canStand(p.x,p.y)))
            throw new Error("Town V2 landing, treads and exit must fit the foot-safe mask.");
        if (state.nav.canStand(STAIR_MASONRY.x, STAIR_MASONRY.y))
            throw new Error("Town V2 staircase side masonry must be blocked.");
        if (state.nav.canStand(PLANT_BASE.x, PLANT_BASE.y))
            throw new Error("Town V2 stair-side garden roots must be blocked.");
        state.foliage = await buildFoliage(scene, depthMask);
        if (state.disposed) return;
        // One uninterrupted stair-center route. No invented detour into foliage
        // and no old "behind shrub" waypoint that sat directly on painted steps.
        state.route = planRoute(state.nav, START, FINISH);
        state.position = { ...state.route[0] };
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
        npcCount: 1, routeLength: entry.route.length,
        position: { ...entry.position }, safe: entry.nav?.canStand(entry.position.x,entry.position.y),
        shrubBlocked: entry.nav ? !entry.nav.canStand(PLANT_BASE.x, PLANT_BASE.y) : false,
        stairTreadsWalkable: entry.nav?.canStand(STAIR_TREAD.x, STAIR_TREAD.y) ?? false,
        stairMasonryBlocked: entry.nav ? !entry.nav.canStand(STAIR_MASONRY.x, STAIR_MASONRY.y) : false,
        foliageExcludesStairs: FOLIAGE.x + FOLIAGE.width <= 465,
        stairAreaOccluded: entry.position.x >= 475 && entry.lastOccluded,
        foregroundReady: !!entry.foliage && entry.foliage.opaquePixels > 100,
        foregroundFormat: entry.foliage?.format ?? null,
        foregroundPixels: entry.foliage?.opaquePixels ?? 0,
        depthVisible: entry.showDepth, depthFrames: entry.depthFrames,
        occludingNow: entry.lastOccluded,
        maskVisible: entry.showMask, violations: entry.maskViolations
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
