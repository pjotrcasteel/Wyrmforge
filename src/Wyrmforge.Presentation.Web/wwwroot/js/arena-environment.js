// The world is projected from canonical C# terrain state. Drawing never changes simulation outcomes.
const textures = new Map();

function seededRandom(seed) {
    let value = (seed | 0) || 1;
    return () => {
        value ^= value << 13;
        value ^= value >>> 17;
        value ^= value << 5;
        return (value >>> 0) / 4294967296;
    };
}

export function createTerrainPlan(environment, width, height) {
    const random = seededRandom(environment.seed);
    const biome = environment.biome.includes('caldera') ? 'ash' : environment.biome.includes('ridge') ? 'ridge' : 'valley';
    const bend = (random() - .5) * Math.min(width * .22, 80);
    const trailWidth = Math.max(55, Math.min(width, height) * .24);
    const rubble = [];
    for (let index = 0; index < Math.min(260, Math.ceil(width * height / 900)); index++) {
        rubble.push({ x: random() * width, y: random() * height, size: .5 + random() * 2.4, tone: random() });
    }
    const remains = [];
    for (let index = 0; index < 10; index++) {
        const side = index % 2 === 0 ? 1 : -1;
        remains.push({ x: Math.max(9, Math.min(width - 9, width * .5 + side * (trailWidth * .68 + random() * width * .16))),
            y: 20 + random() * Math.max(1, height - 40), size: 7 + random() * 11, rotation: random() * Math.PI });
    }
    const proximity = Math.max(0, Math.min(1, (environment.stage - 1) / 7));
    const element = ['fire', 'frost', 'storm', 'arcane'].includes(environment.element) ? environment.element : 'arcane';
    const scars = [];
    for (let index = 0; index < 3 + Math.floor(proximity * 20); index++) {
        // Irregular, sparsely placed burn/frost/charge/rift deposits build toward the lair.
        // Leave the central fighting ground clearer than the ruined approach and outer terrain.
        const side = index % 2 === 0 ? -1 : 1;
        scars.push({ x: width * .5 + side * (width * (.18 + random() * .27)),
            y: height * (.08 + random() * .84),
            length: (9 + random() * 31) * (.65 + proximity * 1.2),
            angle: random() * Math.PI * 2 });
    }
    return { biome, element, proximity, bend, trailWidth, rubble, remains, scars, stage: environment.stage, landmark: environment.landmark };
}

function drawTerrain(ctx, plan, width, height) {
    const ash = plan.biome === 'ash';
    const ridge = plan.biome === 'ridge';
    const colors = ash ? ['#2a1b19', '#342721', '#121317'] : ridge ? ['#1d2028', '#292e30', '#11161b'] : ['#152326', '#242e27', '#10191c'];
    const gradient = ctx.createLinearGradient(0, 0, width * .3, height);
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(.6, colors[1]);
    gradient.addColorStop(1, colors[2]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // The ancient road curves beyond both edges, implying an unseen world beyond the immediate encounter.
    ctx.beginPath();
    ctx.moveTo(width * .5 - plan.trailWidth * .75 - plan.bend, -25);
    ctx.bezierCurveTo(width * .33, height * .3, width * .68, height * .65, width * .5 - plan.trailWidth * .65 + plan.bend, height + 25);
    ctx.lineTo(width * .5 + plan.trailWidth * .65 + plan.bend, height + 25);
    ctx.bezierCurveTo(width * .75, height * .65, width * .42, height * .3, width * .5 + plan.trailWidth * .75 - plan.bend, -25);
    ctx.closePath();
    ctx.fillStyle = ash ? 'rgba(97,66,47,.18)' : ridge ? 'rgba(103,107,98,.12)' : 'rgba(126,108,79,.11)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(165,145,111,.13)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Ominous cliff shadows and a broken outer horizon; no bright rectangular grid.
    for (const side of [-1, 1]) {
        ctx.beginPath();
        const origin = side === -1 ? 0 : width;
        ctx.moveTo(origin, 0);
        for (let index = 0; index <= 9; index++) {
            const y = height * index / 9;
            const intrusion = (12 + 11 * Math.sin(index * 1.7 + plan.bend * .08)) * (index % 2 ? 1.3 : 1);
            ctx.lineTo(origin - side * Math.max(0, intrusion), y);
        }
        ctx.lineTo(origin, height);
        ctx.closePath();
        ctx.fillStyle = 'rgba(4,7,10,.23)';
        ctx.fill();
    }

    for (const piece of plan.rubble) {
        ctx.fillStyle = piece.tone < .22 ? 'rgba(164,133,108,.15)' : piece.tone < .5 ? 'rgba(8,11,16,.22)' : 'rgba(154,135,108,.07)';
        ctx.fillRect(piece.x, piece.y, piece.size, piece.size * .6);
    }

    // Elemental scars communicate both the trail school and proximity to the Wyrm's source.
    const scarColor = { fire: '#b55336', frost: '#90c7d9', storm: '#c4b469', arcane: '#ae7dd7' }[plan.element];
    ctx.save();
    ctx.strokeStyle = scarColor;
    ctx.lineWidth = 1.3 + plan.proximity;
    ctx.globalAlpha = .14 + plan.proximity * .33;
    for (const scar of plan.scars) {
        ctx.save();
        ctx.translate(scar.x, scar.y);
        ctx.rotate(scar.angle);
        ctx.beginPath();
        ctx.moveTo(0, -scar.length * .5);
        ctx.lineTo(-scar.length * .14, -scar.length * .1);
        ctx.lineTo(scar.length * .19, scar.length * .12);
        ctx.lineTo(-scar.length * .08, scar.length * .5);
        ctx.stroke();
        if (plan.element === 'frost') {
            ctx.beginPath();
            ctx.moveTo(-scar.length * .31, 0);
            ctx.lineTo(scar.length * .19, scar.length * .12);
            ctx.lineTo(scar.length * .36, -scar.length * .23);
            ctx.stroke();
        } else if (plan.element === 'fire') {
            ctx.fillStyle = '#61241c';
            ctx.beginPath();
            ctx.ellipse(0, 0, scar.length * .12, scar.length * .18, 0, 0, Math.PI * 2);
            ctx.fill();
        } else if (plan.element === 'storm') {
            ctx.beginPath();
            ctx.moveTo(-scar.length * .25, scar.length * .23);
            ctx.lineTo(scar.length * .25, -scar.length * .13);
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.arc(0, 0, scar.length * .24, Math.PI * .2, Math.PI * 1.4);
            ctx.stroke();
        }
        ctx.restore();
    }
    ctx.restore();

    // Fallen monoliths, blasted masonry and long shadows are non-colliding scenery for this slice.
    for (const piece of plan.remains) {
        ctx.save();
        ctx.translate(piece.x, piece.y);
        ctx.rotate(piece.rotation);
        ctx.fillStyle = 'rgba(0,0,0,.29)';
        ctx.fillRect(-piece.size * .3 + 4, 6, piece.size * .68, piece.size * 1.4);
        ctx.fillStyle = ash ? '#4f3531' : ridge ? '#41484d' : '#3c4842';
        ctx.fillRect(-piece.size * .3, -piece.size * .65, piece.size * .6, piece.size * 1.2);
        ctx.strokeStyle = 'rgba(202,166,130,.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-piece.size * .28, -piece.size * .55);
        ctx.lineTo(piece.size * .3, piece.size * .28);
        ctx.stroke();
        ctx.restore();
    }
    if (plan.stage >= 5) {
        ctx.strokeStyle = ash ? 'rgba(247,81,43,.3)' : ridge ? 'rgba(195,163,93,.23)' : 'rgba(128,178,153,.19)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(width * .3, height * .1);
        ctx.lineTo(width * .4, height * .17);
        ctx.lineTo(width * .35, height * .22);
        ctx.lineTo(width * .55, height * .29);
        ctx.stroke();
    }
    // Edge fog produces depth without obscuring attack telegraphs or the player's immediate surroundings.
    const vignette = ctx.createRadialGradient(width * .5, height * .49, Math.min(width, height) * .2,
        width * .5, height * .49, Math.max(width, height) * .7);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(1,3,7,.56)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
}

function terrainTexture(environment, width, height) {
    const key = [environment.seed, environment.biome, environment.element, environment.stage, width, height].join(':');
    if (textures.has(key)) return textures.get(key);
    const image = document.createElement('canvas');
    image.width = Math.max(1, Math.round(width));
    image.height = Math.max(1, Math.round(height));
    drawTerrain(image.getContext('2d'), createTerrainPlan(environment, image.width, image.height), image.width, image.height);
    // Keep at most two world textures on mobile; a whole territory is larger than one viewport.
    if (textures.size >= 2) textures.delete(textures.keys().next().value);
    textures.set(key, image);
    return image;
}

export function drawArenaEnvironment(ctx, environment, width, height, elapsedSeconds = 0) {
    if (!environment) return false;
    ctx.drawImage(terrainTexture(environment, width, height), 0, 0, width, height);
    for (const supply of environment.supplies ?? []) drawSupply(ctx, supply, width, height, elapsedSeconds);
    return true;
}

function drawSupply(ctx, supply, width, height, elapsed) {
    const x = supply.x * width;
    const y = supply.y * height;
    const opened = supply.open;
    const experience = supply.kind === 'experience';
    const color = experience ? '#b7a0f1' : '#b2d4aa';
    ctx.save();
    ctx.translate(x, y);
    // Closed cache alcoves are an actual C# movement restriction, not scenery masquerading as cover.
    ctx.fillStyle = opened ? 'rgba(5,8,12,.54)' : 'rgba(8,7,12,.83)';
    ctx.strokeStyle = opened ? color : '#706067';
    ctx.lineWidth = opened ? 2 : 3;
    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (!opened) {
        for (let offset = -1; offset <= 1; offset++) {
            ctx.beginPath();
            ctx.moveTo(-19, offset * 8);
            ctx.lineTo(19, offset * 8);
            ctx.stroke();
        }
    }
    ctx.fillStyle = color;
    if (opened) {
        const scale = 1 + .06 * Math.sin(elapsed * 4);
        ctx.scale(scale, scale);
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.lineTo(10, 0);
        ctx.lineTo(0, 12);
        ctx.lineTo(-10, 0);
        ctx.closePath();
        ctx.fill();
    } else {
        ctx.font = 'bold 19px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✦', 0, 0);
    }
    ctx.font = 'bold 9px system-ui';
    ctx.fillStyle = '#f4e5d5';
    ctx.textAlign = 'center';
    ctx.fillText(opened ? experience ? '+3 XP' : 'HEAL' : 'SEALED', 0, 47);
    ctx.restore();
}

export function drawArenaExit(ctx, exit, elapsedSeconds = 0) {
    if (!exit) return;
    const { x, y } = exit;
    const pulse = Math.sin(elapsedSeconds * 3) * .08;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(5,3,12,.82)';
    ctx.strokeStyle = '#c7ac7f';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-36, 32);
    ctx.lineTo(-36, -21);
    ctx.quadraticCurveTo(-36, -50, 0, -57);
    ctx.quadraticCurveTo(36, -50, 36, -21);
    ctx.lineTo(36, 32);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(161,106,208,.32)';
    ctx.beginPath();
    ctx.ellipse(0, 3, 25 * (1 + pulse), 34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(221,183,255,.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-12, -8);
    ctx.lineTo(0, -20);
    ctx.lineTo(12, -8);
    ctx.stroke();
    ctx.fillStyle = '#f3d7ac';
    ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('NEXT TRAIL ↑', 0, 54);
    ctx.restore();
}
