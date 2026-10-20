import { createCloisterPlan, drawCloisterFloor } from './arena-cloister-art.js';
import { artReady, hasArtFrame, drawArtFrame } from './art-atlas.js';

// Original procedural environmental art. Collision remains owned by ArenaEnvironmentState (C#).
// These drawings are non-interactive scenery, generated once per seeded territory texture.
const landmarkKinds = {
    ash: ['pyre', 'forge', 'caravan'],
    ridge: ['watchtower', 'ossuary', 'banner'],
    valley: ['chapel', 'waystation', 'altar'],
    snow: ['cairnstack', 'icefall', 'sledge'],
};
const groundPalette = {
    ash: { low: '#130f12', earth: '#392824', high: '#5c3a30', road: '#5b483b', edge: '#b27b5c' },
    ridge: { low: '#11161b', earth: '#30363a', high: '#536064', road: '#55565a', edge: '#96a0a0' },
    valley: { low: '#0f191b', earth: '#293a33', high: '#476051', road: '#565047', edge: '#8c9379' },
    snow: { low: '#151c24', earth: '#34404c', high: '#5b6c7c', road: '#4a535c', edge: '#a9bccb' },
};
const schoolPalette = {
    fire: { dark: '#3e1717', glow: '#e7763e', pale: '#f9b266' },
    frost: { dark: '#183445', glow: '#88c4df', pale: '#d1ecf3' },
    storm: { dark: '#2b2828', glow: '#e0c665', pale: '#f8e6a1' },
    arcane: { dark: '#271a3e', glow: '#ae75df', pale: '#ecc4fa' },
};

function randomStream(seed) {
    let value = (seed | 0) ^ 0x51a2c3d7;
    return () => {
        value ^= value << 13;
        value ^= value >>> 17;
        value ^= value << 5;
        return (value >>> 0) / 4294967296;
    };
}

function clamp(value, low, high) { return Math.max(low, Math.min(high, value)); }

// Territory names come from C#. Frost lands are matched first: "Rimewall heights" is a snow ridge, not a Cinder one.
export function territoryBiome(name) {
    const text = (name ?? '').toLowerCase();
    if (/snow|rime|glacier|frost/.test(text)) return 'snow';
    return text.includes('caldera') ? 'ash' : text.includes('ridge') ? 'ridge' : 'valley';
}

export function createTerritoryStoryPlan(environment, width, height) {
    const random = randomStream(environment.seed);
    const biome = territoryBiome(environment.biome);
    const element = schoolPalette[environment.element] ? environment.element : 'arcane';
    const district = ['causeway', 'sanctuary', 'rift'].includes(environment.district) ? environment.district : 'causeway';
    const corruption = clamp(environment.corruption ?? ((environment.stage ?? 1) - 1) / 7, 0, 1);
    const districtShift = district === 'sanctuary' ? .11 : district === 'rift' ? -.095 : 0;
    const landmarks = [
        { kind: landmarkKinds[biome][district === 'rift' ? 2 : 0], x: width * (.31 + districtShift + random() * .035), y: height * .19,
            title: { ash: 'THE BLACK PYRE', ridge: 'THE LAST WATCH', valley: 'THE SUNKEN CHAPEL', snow: 'CAIRN OF NAMES' }[biome] },
        { kind: landmarkKinds[biome][district === 'sanctuary' ? 0 : 1], x: width * (.615 - districtShift + random() * .025),
            y: height * (.475 + random() * .03),
            title: { ash: 'RUINED FORGE', ridge: 'BONE SHRINE', valley: 'ABANDONED WAYSTATION', snow: 'THE STILL FALL' }[biome] },
        { kind: landmarkKinds[biome][district === 'rift' ? 1 : 2], x: width * (.29 - districtShift + random() * .04), y: height * .82,
            title: { ash: 'THE ASH CONVOY', ridge: 'FALLEN BANNERS', valley: 'FLOODED ALTAR', snow: 'THE LOST SLEDGE' }[biome] },
    ];
    const patches = [];
    for (let i = 0; i < 42; i++) {
        // Rough banks and biome deposits shape broad negative spaces but never imply a solid wall.
        const side = i % 2 === 0 ? 1 : -1;
        patches.push({
            x: width * (.5 + side * (.24 + random() * .22)),
            y: height * (.025 + random() * .95),
            rx: 23 + random() * Math.min(120, width * .115),
            ry: 16 + random() * 92,
            tilt: (random() - .5) * .7,
            tone: random(),
        });
    }
    const wounds = [];
    for (let i = 0; i < 8 + Math.round(corruption * 28); i++) {
        const side = i % 2 === 0 ? 1 : -1;
        wounds.push({
            x: width * (.5 + side * (.16 + random() * .3)),
            y: height * (.055 + random() * .89),
            radius: 11 + random() * 30 * (1 + corruption * 1.25),
            angle: random() * Math.PI * 2,
            branches: 2 + Math.floor(random() * 4),
        });
    }
    return { biome, element, district, corruption, habitat: environment.habitat ?? 'Outskirts', landmarks, patches, wounds,
        seed: environment.seed, width, height, cloister: createCloisterPlan(environment, width, height) };
}

function irregularShape(ctx, x, y, rx, ry, rotation, seed) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) {
        const angle = i * Math.PI / 5;
        const wobble = .82 + .19 * Math.sin(seed + i * 3.7);
        const px = Math.cos(angle) * rx * wobble;
        const py = Math.sin(angle) * ry * wobble;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.restore();
}

export function drawTerritoryGround(ctx, plan) {
    const { width, height, biome, seed } = plan;
    const colors = groundPalette[biome];
    for (const [i, patch] of plan.patches.entries()) {
        irregularShape(ctx, patch.x, patch.y, patch.rx, patch.ry, patch.tilt, seed + i * 7);
        ctx.fillStyle = patch.tone < .5 ? colors.low : colors.earth;
        ctx.globalAlpha = patch.tone < .5 ? .65 : .43;
        ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Forests open into real fighting ground on BOTH sides of the road.
    // Sites outside the forest keep their deliberately different built geography.
    if (['Outskirts', 'WetForest', 'FrozenRoad', 'SnowboundPines'].includes(plan.habitat))
        drawOpenForestRoad(ctx, plan);
    else drawDistrictFoundation(ctx, plan);
    drawElementalLandform(ctx, plan);
    drawTerritoryWounds(ctx, plan);
}

function drawOpenForestRoad(ctx, plan) {
    const { width: w, height: h, seed, biome } = plan;
    const random = randomStream(seed ^ 0x4e7b01);
    const palette = groundPalette[biome];
    const offset = (random() - .5) * w * .15;
    const phase = random() * Math.PI * 2;
    const bend = .027 + random() * .044;
    const center = y => w * .5 + offset + Math.sin(y / h * Math.PI * 2 + phase) * w * bend;
    const roadWidth = Math.min(185, w * (.12 + random() * .065));
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i <= 32; i++) {
        const y = i / 32 * h;
        const x = center(y) - roadWidth / 2;
        if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    for (let i = 32; i >= 0; i--) {
        const y = i / 32 * h;
        ctx.lineTo(center(y) + roadWidth / 2, y);
    }
    ctx.closePath();
    ctx.fillStyle = palette.road;
    ctx.globalAlpha = biome === 'snow' ? .32 : .45;
    ctx.fill();
    // Broken, intermittent paving: the road is a landmark, not the only walkable tile.
    for (let i = 0; i < 240; i++) {
        const y = random() * h;
        const x = center(y) + (random() - .5) * roadWidth * 1.25;
        const distance = Math.abs(x - center(y));
        if (distance > roadWidth * .51) continue;
        const size = 2 + Math.round(random() * 6);
        ctx.fillStyle = random() > .46 ? palette.high : palette.low;
        ctx.globalAlpha = .16 + random() * .2;
        ctx.fillRect(Math.round(x), Math.round(y), size * 2, size);
    }
    // Wet organic patches flank the route, but do not form impassable painted walls.
    for (let i = 0; i < 34; i++) {
        const y = random() * h;
        const side = random() < .5 ? -1 : 1;
        const x = center(y) + side * (roadWidth * (.65 + random() * 2.15));
        ctx.fillStyle = palette.low;
        ctx.globalAlpha = .16 + random() * .18;
        ctx.beginPath();
        ctx.ellipse(x, y, 12 + random() * 30, 5 + random() * 18, random() * 2, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

// Large-scale composition comes first: the player must recognize a DIFFERENT place when a new node loads.
// These are walkable floor materials, not collision or raised impassable walls.
function drawDistrictFoundation(ctx, plan) {
    if (plan.cloister) {
        drawCloisterFloor(ctx, plan.cloister);
        return;
    }
    const { width: w, height: h, district, biome, seed } = plan;
    const palette = groundPalette[biome];
    const random = randomStream(seed ^ 0x31fdae94);
    ctx.save();
    if (district === 'sanctuary') {
        // A ruined ceremonial city square fills the starting viewport with monumental ground architecture.
        ctx.translate(w * .5, h * .5);
        ctx.fillStyle = palette.high;
        ctx.globalAlpha = .29;
        ctx.beginPath();
        for (let i = 0; i < 9; i++) {
            const a = i * Math.PI / 4 + Math.PI / 8;
            const px = Math.cos(a) * Math.min(335, w * .37);
            const py = Math.sin(a) * 330;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = palette.edge;
        ctx.lineWidth = 2.2;
        for (const r of [125, 260]) {
            ctx.globalAlpha = r === 260 ? .19 : .26;
            ctx.beginPath(); ctx.ellipse(0, 0, Math.min(r, w * .35), r * .92, 0, .1, Math.PI * 1.9); ctx.stroke();
        }
        ctx.globalAlpha = .17;
        for (let i = 0; i < 8; i++) {
            const a = i * Math.PI / 4;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * 76, Math.sin(a) * 74);
            ctx.lineTo(Math.cos(a) * Math.min(310, w * .35), Math.sin(a) * 291);
            ctx.stroke();
        }
        // Eight huge star-shaped inlays: readable at gameplay scale, not tiny decorative marks.
        ctx.strokeStyle = '#a99c8a'; ctx.lineWidth = 1.7; ctx.globalAlpha = .27;
        ctx.beginPath();
        for (let i = 0; i <= 16; i++) {
            const a = i * Math.PI / 8 - Math.PI / 2;
            const r = i % 2 ? 55 : 103;
            if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
            else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.stroke();
    } else if (district === 'rift') {
        // Three enormous damage corridors with terraces and a battered stone crossing.
        // All surface markings are traversable and remain clearly distinct from actual solid gates.
        for (const [i, offset] of [-.28, .05, .35].entries()) {
            const x = w * (.5 + offset);
            ctx.beginPath();
            ctx.moveTo(x - 42, -15);
            for (let j = 0; j <= 16; j++) {
                const y = h * j / 16;
                ctx.lineTo(x - 30 + Math.sin(j * 1.2 + i) * (26 + i * 9), y);
            }
            for (let j = 16; j >= 0; j--) {
                const y = h * j / 16;
                ctx.lineTo(x + 31 + Math.sin(j * 1.2 + i) * (26 + i * 9), y);
            }
            ctx.closePath();
            ctx.fillStyle = palette.low; ctx.globalAlpha = .85; ctx.fill();
            ctx.strokeStyle = palette.edge; ctx.lineWidth = 5; ctx.globalAlpha = .5; ctx.stroke();
        }
        // Fallen cobblestone slabs form a prominent fractured crossing at the initial playfield.
        ctx.globalAlpha = .34;
        for (let i = 0; i < 10; i++) {
            const x = w * (.18 + i * .07);
            const y = h * .5 + Math.sin(i * .9) * 18;
            ctx.save(); ctx.translate(x, y); ctx.rotate((random() - .5) * .34);
            ctx.fillStyle = palette.high; ctx.fillRect(-12, -16, 20 + random() * 10, 25);
            ctx.strokeStyle = palette.edge; ctx.lineWidth = 1; ctx.strokeRect(-12, -16, 20, 25);
            ctx.restore();
        }
    } else {
        // Processional road: a broad, clear ancient highway with visible massive opposing shoulder banks.
        ctx.beginPath();
        ctx.moveTo(w * .36, -15);
        ctx.bezierCurveTo(w * .42, h * .32, w * .365, h * .7, w * .4, h + 15);
        ctx.lineTo(w * .6, h + 15);
        ctx.bezierCurveTo(w * .635, h * .7, w * .58, h * .32, w * .64, -15);
        ctx.closePath();
        ctx.fillStyle = palette.road; ctx.globalAlpha = .32; ctx.fill();
        ctx.strokeStyle = palette.edge; ctx.lineWidth = 2; ctx.globalAlpha = .22; ctx.stroke();
        // Eroded, missing paving stones. The old 7x36 bright square grid buried the player.
        for (let y = 34; y < h; y += 106) {
            const offset = Math.sin(y * .006) * w * .025;
            for (let lane = -2; lane <= 2; lane++) {
                if (random() < .5) continue;
                const x = w * .5 + offset + lane * Math.min(48, w * .06) + (random() - .5) * 15;
                const size = 16 + random() * 17;
                ctx.fillStyle = random() > .5 ? palette.high : palette.earth;
                ctx.globalAlpha = .16 + random() * .12;
                ctx.fillRect(x - size * .5, y + random() * 20, size, 8 + random() * 14);
                ctx.strokeStyle = palette.edge; ctx.globalAlpha = .18;
                ctx.strokeRect(x - size * .5, y, size, 12);
            }
        }
    }
    ctx.restore();
}

function drawElementalLandform(ctx, plan) {
    // Ordinary forest is real forest first; a Wyrm's geology overtakes it only nearby.
    if (['Outskirts', 'WetForest', 'FrozenRoad', 'SnowboundPines'].includes(plan.habitat) && plan.corruption < .65) return;
    // The monastery's masonry and physical history define the scene; no giant
    // glowing ritual geometry laid over its garden and central combat space.
    if (plan.cloister) return;
    const { width: w, height: h, element, corruption, district, seed } = plan;
    const pigment = schoolPalette[element];
    const random = randomStream(seed ^ 0x72b48a1);
    ctx.save();
    const centerX = w * (district === 'rift' ? .64 : district === 'sanctuary' ? .34 : .22);
    const centerY = h * .49;
    ctx.translate(centerX, centerY);
    ctx.globalAlpha = .32 + corruption * .11;
    if (element === 'fire') {
        // Massive exposed obsidian basin threaded by broad volcanic lava channels.
        ctx.fillStyle = '#211017';
        ctx.beginPath(); ctx.ellipse(0, 0, w * .26, h * .19, -.32, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#e36c35'; ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
            const x = (i - 1) * 62;
            ctx.beginPath(); ctx.moveTo(x - 80, -h * .19);
            ctx.bezierCurveTo(x + 60, -h * .08, x - 85, h * .085, x + 85, h * .18);
            ctx.lineWidth = 2.5 + (i % 2) * 2; ctx.stroke();
            ctx.strokeStyle = i % 2 ? '#d85b33' : '#ee9d55';
        }
        ctx.fillStyle = '#a93b28';
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.ellipse((random() - .5) * w * .42, (random() - .5) * h * .3, 7 + random() * 22, 4 + random() * 10, random(), 0, Math.PI * 2); ctx.fill();
        }
    } else if (element === 'frost') {
        // A pale frozen shelf made of visibly separate large floating plates.
        ctx.fillStyle = '#4c8491';
        ctx.beginPath(); ctx.ellipse(0, 0, w * .3, h * .2, .15, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#a0ced1';
        ctx.strokeStyle = '#e1f3ef'; ctx.lineWidth = 2;
        for (let i = 0; i < 9; i++) {
            const a = i * 2.399;
            const distance = Math.sqrt(i / 9);
            const x = Math.cos(a) * distance * w * .26;
            const y = Math.sin(a) * distance * h * .165;
            const size = 17 + random() * 40;
            ctx.beginPath();
            for (let side = 0; side <= 6; side++) {
                const angle = side * Math.PI / 3 + (i % 3) * .4;
                const px = x + Math.cos(angle) * size;
                const py = y + Math.sin(angle) * size * .82;
                if (side === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.globalAlpha = .12 + corruption * .17;
            ctx.fill(); ctx.globalAlpha = .36; ctx.stroke();
        }
    } else if (element === 'storm') {
        // Black fused impact field with dramatic lightning fractures crossing an entire district.
        ctx.fillStyle = '#1d2227';
        ctx.beginPath(); ctx.ellipse(0, 0, w * .3, h * .21, -.15, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#d9d39d'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (let i = 0; i < 7; i++) {
            const angle = i * Math.PI / 3.5;
            const length = Math.min(w * .38, 350) * (.75 + random() * .4);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * length * .4, Math.sin(angle) * length * .5);
            ctx.lineTo(Math.cos(angle + .18) * length * .7, Math.sin(angle + .18) * length * .86);
            ctx.lineTo(Math.cos(angle) * length, Math.sin(angle) * length * 1.35);
            ctx.lineWidth = i % 3 === 0 ? 3 : 1.5; ctx.globalAlpha = i % 2 ? .25 : .46; ctx.stroke();
        }
    } else {
        // Fractured arcane remnants: small local inscriptions, never giant rings around the player.
        ctx.strokeStyle = '#8d74aa'; ctx.lineWidth = 2; ctx.globalAlpha = .18 + corruption * .08;
        for (let ring = 0; ring < 2; ring++) {
            const r = 45 + ring * 48;
            ctx.beginPath(); ctx.ellipse(0, 0, r, r * 1.2, .28, ring * .2, Math.PI * (1.25 + ring * .2)); ctx.stroke();
        }
        ctx.strokeStyle = '#a990bf'; ctx.lineWidth = 1.5; ctx.globalAlpha = .18;
        for (let side = 0; side < 4; side++) {
            const a = side * Math.PI / 2;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * 55, Math.sin(a) * 65);
            ctx.lineTo(Math.cos(a + .25) * 102, Math.sin(a + .25) * 132);
            ctx.stroke();
        }
        ctx.fillStyle = pigment.dark; ctx.globalAlpha = .18;
        ctx.beginPath(); ctx.ellipse(0, 0, 65, 98, .28, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
}

function drawTerritoryWounds(ctx, plan) {
    // Ruined cloister marks belong to the actual gates, not decorative floor halos.
    if (plan.cloister) return;
    const pigment = schoolPalette[plan.element];
    for (const [i, wound] of plan.wounds.entries()) {
        ctx.save();
        ctx.translate(wound.x, wound.y);
        ctx.rotate(wound.angle);
        const size = wound.radius;
        ctx.fillStyle = pigment.dark;
        ctx.globalAlpha = .32 + plan.corruption * .24;
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 1.35, size * .68, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = .35 + plan.corruption * .42;
        ctx.lineWidth = 1.5 + plan.corruption * 1.2;
        ctx.strokeStyle = pigment.glow;
        if (plan.element === 'frost') {
            for (let ring = 0; ring < 2; ring++) {
                ctx.beginPath();
                for (let n = 0; n <= 6; n++) {
                    const a = n * Math.PI / 3;
                    const radius = size * (.48 + ring * .48);
                    if (n === 0) ctx.moveTo(Math.cos(a) * radius, Math.sin(a) * radius * .65);
                    else ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius * .65);
                }
                ctx.stroke();
            }
        } else if (plan.element === 'arcane') {
            ctx.setLineDash([size * .4, size * .18]);
            ctx.beginPath();
            ctx.ellipse(0, 0, size, size * .56, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(-size * .45, -size * .5);
            ctx.lineTo(0, size * .35);
            ctx.lineTo(size * .48, -size * .5);
            ctx.stroke();
        } else {
            for (let n = 0; n < wound.branches; n++) {
                const a = n * Math.PI * 2 / wound.branches;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(a) * size * .47, Math.sin(a) * size * .36);
                ctx.lineTo(Math.cos(a + .16 * (i % 2 ? 1 : -1)) * size * 1.1, Math.sin(a + .16) * size * .73);
                if (plan.element === 'storm') ctx.lineTo(Math.cos(a - .3) * size * 1.55, Math.sin(a - .3) * size * 1.1);
                ctx.stroke();
            }
        }
        ctx.restore();
    }
}

function stoneBlock(ctx, x, y, w, h, fill = '#525052') {
    ctx.fillStyle = 'rgba(0,0,0,.34)';
    ctx.fillRect(x + 5, y + 6, w, h);
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(213,194,168,.35)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);
}

function brokenArch(ctx, scale = 1) {
    ctx.scale(scale, scale);
    stoneBlock(ctx, -37, -44, 15, 78);
    stoneBlock(ctx, 23, -50, 15, 84);
    ctx.strokeStyle = '#7c7770';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(0, -42, 31, Math.PI * 1.02, Math.PI * 1.84);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(222,212,192,.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -42, 31, Math.PI * 1.02, Math.PI * 1.76);
    ctx.stroke();
}

function drawSite(ctx, site, plan) {
    const scale = clamp(plan.width / 1100, .85, 1.3);
    const pigment = schoolPalette[plan.element];
    const surface = groundPalette[plan.biome];
    if (artReady() && hasArtFrame('environment', `ruin.${site.kind}`)) {
        // Authored low-profile ruin sprite; the place is read from its silhouette, not a text label.
        const art = Math.max(1, Math.round(scale));
        drawArtFrame(ctx, 'environment', `ruin.${site.kind}`, Math.round(site.x), Math.round(site.y + 30), { scale: art });
        ctx.save();
        ctx.translate(site.x, site.y);
        ctx.strokeStyle = pigment.glow;
        ctx.globalAlpha = .22 + plan.corruption * .5;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-29, 40); ctx.lineTo(-9, 32); ctx.lineTo(17, 41); ctx.lineTo(42, 33);
        ctx.stroke();
        ctx.restore();
        return;
    }
    ctx.save();
    ctx.translate(site.x, site.y);
    ctx.scale(scale, scale);
    ctx.fillStyle = 'rgba(0,0,0,.44)';
    ctx.beginPath();
    ctx.ellipse(6, 27, 77, 35, -.18, 0, Math.PI * 2);
    ctx.fill();

    switch (site.kind) {
        case 'pyre':
            stoneBlock(ctx, -35, 3, 70, 23, '#554c49');
            for (const x of [-31, -12, 13, 34]) {
                ctx.strokeStyle = '#1b171b';
                ctx.lineWidth = 6;
                ctx.beginPath(); ctx.moveTo(x, 7); ctx.lineTo(x + 8, -53 + Math.abs(x) * .3); ctx.stroke();
            }
            ctx.strokeStyle = pigment.glow;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(-24, -23); ctx.lineTo(0, -40); ctx.lineTo(19, -20); ctx.stroke();
            break;
        case 'forge':
            stoneBlock(ctx, -44, -18, 88, 57, '#51413a');
            ctx.fillStyle = pigment.dark;
            ctx.fillRect(-24, -12, 48, 35);
            ctx.fillStyle = pigment.glow;
            ctx.globalAlpha = .7;
            ctx.beginPath(); ctx.ellipse(0, 19, 19, 5, 0, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
            stoneBlock(ctx, 28, -64, 18, 46, '#615653');
            break;
        case 'caravan':
            stoneBlock(ctx, -55, -14, 109, 35, '#55473e');
            ctx.strokeStyle = '#b3a08a';
            ctx.lineWidth = 4;
            for (const x of [-35, 32]) {
                ctx.beginPath(); ctx.arc(x, 25, 17, 0, Math.PI * 2); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(x - 11, 13); ctx.lineTo(x + 12, 36); ctx.stroke();
            }
            ctx.strokeStyle = '#3d2b26'; ctx.lineWidth = 8;
            ctx.beginPath(); ctx.moveTo(-50, -14); ctx.lineTo(-12, -48); ctx.lineTo(42, -17); ctx.stroke();
            break;
        case 'watchtower':
            stoneBlock(ctx, -38, -56, 75, 97, '#454b4f');
            stoneBlock(ctx, -47, -62, 27, 24, '#65666b');
            stoneBlock(ctx, 17, -72, 24, 31, '#60666b');
            ctx.fillStyle = '#0e151b';
            ctx.beginPath(); ctx.moveTo(-12, 40); ctx.lineTo(-12, -6); ctx.arc(0, -6, 12, Math.PI, 0); ctx.lineTo(12, 40); ctx.fill();
            break;
        case 'ossuary':
            for (const [x, y] of [[-33, -15], [8, -37], [32, 0]]) {
                stoneBlock(ctx, x, y, 18, 44, '#74716e');
                ctx.strokeStyle = '#1f2429'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(x + 9, y + 8); ctx.lineTo(x + 9, y + 30); ctx.moveTo(x + 3, y + 17); ctx.lineTo(x + 15, y + 17); ctx.stroke();
            }
            break;
        case 'banner':
            stoneBlock(ctx, -43, 14, 92, 22, '#4b4e4d');
            ctx.strokeStyle = '#99928c'; ctx.lineWidth = 6;
            ctx.beginPath(); ctx.moveTo(10, 12); ctx.lineTo(0, -68); ctx.stroke();
            ctx.fillStyle = '#593335';
            ctx.beginPath(); ctx.moveTo(2, -63); ctx.lineTo(47, -48); ctx.lineTo(33, -32); ctx.lineTo(39, -13); ctx.lineTo(7, -26); ctx.closePath(); ctx.fill();
            break;
        case 'chapel':
            brokenArch(ctx, 1.2);
            stoneBlock(ctx, -18, 15, 36, 18, '#5a6560');
            break;
        case 'waystation':
            stoneBlock(ctx, -44, -9, 18, 47, '#6a655c');
            stoneBlock(ctx, 24, -9, 18, 47, '#6a655c');
            ctx.strokeStyle = '#6d5643'; ctx.lineWidth = 8;
            ctx.beginPath(); ctx.moveTo(-49, -26); ctx.lineTo(-4, -51); ctx.lineTo(39, -23); ctx.stroke();
            ctx.fillStyle = '#3a3029'; ctx.fillRect(-27, 10, 45, 22);
            break;
        case 'cairnstack':
            for (const [x, tiers] of [[-36, 3], [0, 4], [34, 3]]) for (let k = 0; k < tiers; k++) {
                const w = 26 - k * 5;
                stoneBlock(ctx, x - w / 2, 18 - k * 12, w, 11, '#55606a');
                ctx.fillStyle = '#b9cbd9'; ctx.fillRect(x - w / 2, 18 - k * 12, w, 2);
            }
            break;
        case 'icefall':
            ctx.fillStyle = '#3d6a86';
            for (const [x, top] of [[-36, -22], [-14, -48], [8, -60], [30, -38], [48, -16]]) {
                ctx.beginPath(); ctx.moveTo(x - 9, 28); ctx.lineTo(x + 3, top); ctx.lineTo(x + 10, 28); ctx.closePath(); ctx.fill();
            }
            ctx.fillStyle = '#6c8090';
            ctx.beginPath(); ctx.ellipse(0, 30, 58, 9, 0, 0, Math.PI * 2); ctx.fill();
            break;
        case 'sledge':
            stoneBlock(ctx, -50, -6, 96, 24, '#4a3a2e');
            ctx.strokeStyle = '#6e6458'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(-56, 26); ctx.lineTo(50, 18); ctx.lineTo(62, 4); ctx.stroke();
            ctx.fillStyle = '#5f7282';
            ctx.beginPath(); ctx.ellipse(-24, 24, 30, 7, 0, 0, Math.PI * 2); ctx.fill();
            break;
        case 'altar':
            stoneBlock(ctx, -45, -12, 90, 46, '#4b5a55');
            ctx.strokeStyle = '#8dbcb3'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.ellipse(0, 10, 23, 11, 0, 0, Math.PI * 2); ctx.stroke();
            for (const x of [-57, 48]) stoneBlock(ctx, x, -32, 12, 65, '#54645e');
            break;
    }

    // Damage connects each abandoned site to the node's real elemental attunement.
    ctx.strokeStyle = pigment.glow;
    ctx.globalAlpha = .28 + plan.corruption * .55;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-29, 36);
    ctx.lineTo(-9, 26);
    ctx.lineTo(17, 36);
    ctx.lineTo(42, 27);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.font = 'bold 10px system-ui';
    ctx.textAlign = 'center';
    ctx.fillStyle = surface.edge;
    ctx.shadowColor = '#090c10';
    ctx.shadowBlur = 5;
    ctx.fillText(site.title, 0, 59);
    ctx.restore();
}

export function drawTerritoryLandmarks(ctx, plan) {
    if (plan.cloister) return; // Three purpose-built floor landmarks live in drawCloisterFloor.
    for (const site of plan.landmarks) drawSite(ctx, site, plan);
}

// Light, deterministic movement in the world without allocating new textures per frame.
export function drawTerritoryMotes(ctx, environment, worldWidth, worldHeight, seconds) {
    if (!environment) return;
    const palette = schoolPalette[environment.element] ?? schoolPalette.arcane;
    const random = randomStream(environment.seed ^ 0x47a6f915);
    const corruption = clamp(((environment.stage ?? 1) - 1) / 7, 0, 1);
    ctx.save();
    ctx.globalAlpha = .22 + corruption * .3;
    ctx.fillStyle = palette.pale;
    for (let i = 0; i < 64; i++) {
        const originX = random() * worldWidth;
        const originY = random() * worldHeight;
        const size = .75 + random() * 1.6;
        const speed = 2 + random() * 8;
        const x = (originX + Math.sin(seconds * .28 + i) * 6 + worldWidth) % worldWidth;
        const y = (originY - seconds * speed % worldHeight + worldHeight) % worldHeight;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}
