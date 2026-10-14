// Original procedural environmental art. Collision remains owned by ArenaEnvironmentState (C#).
// These drawings are non-interactive scenery, generated once per seeded territory texture.
const landmarkKinds = {
    ash: ['pyre', 'forge', 'caravan'],
    ridge: ['watchtower', 'ossuary', 'banner'],
    valley: ['chapel', 'waystation', 'altar'],
};
const groundPalette = {
    ash: { low: '#130f12', earth: '#392824', high: '#5c3a30', road: '#5b483b', edge: '#b27b5c' },
    ridge: { low: '#11161b', earth: '#30363a', high: '#536064', road: '#55565a', edge: '#96a0a0' },
    valley: { low: '#0f191b', earth: '#293a33', high: '#476051', road: '#565047', edge: '#8c9379' },
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

export function createTerritoryStoryPlan(environment, width, height) {
    const random = randomStream(environment.seed);
    const name = (environment.biome ?? '').toLowerCase();
    const biome = name.includes('caldera') ? 'ash' : name.includes('ridge') ? 'ridge' : 'valley';
    const element = schoolPalette[environment.element] ? environment.element : 'arcane';
    const district = ['causeway', 'sanctuary', 'rift'].includes(environment.district) ? environment.district : 'causeway';
    const corruption = clamp(((environment.stage ?? 1) - 1) / 7, 0, 1);
    const districtShift = district === 'sanctuary' ? .11 : district === 'rift' ? -.095 : 0;
    const landmarks = [
        { kind: landmarkKinds[biome][district === 'rift' ? 2 : 0], x: width * (.31 + districtShift + random() * .035), y: height * .19,
            title: { ash: 'THE BLACK PYRE', ridge: 'THE LAST WATCH', valley: 'THE SUNKEN CHAPEL' }[biome] },
        { kind: landmarkKinds[biome][district === 'sanctuary' ? 0 : 1], x: width * (.615 - districtShift + random() * .025),
            y: height * (.475 + random() * .03),
            title: { ash: 'RUINED FORGE', ridge: 'BONE SHRINE', valley: 'ABANDONED WAYSTATION' }[biome] },
        { kind: landmarkKinds[biome][district === 'rift' ? 1 : 2], x: width * (.29 - districtShift + random() * .04), y: height * .82,
            title: { ash: 'THE ASH CONVOY', ridge: 'FALLEN BANNERS', valley: 'FLOODED ALTAR' }[biome] },
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
    return { biome, element, district, corruption, landmarks, patches, wounds, seed: environment.seed, width, height };
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

    // Each district has a different large-scale footprint. There is no one shared road template.
    drawDistrictFoundation(ctx, plan);
    drawElementalLandform(ctx, plan);
    drawTerritoryWounds(ctx, plan);
}

function drawTerritoryWounds(ctx, plan) {
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
