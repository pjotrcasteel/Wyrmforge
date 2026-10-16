import { createTerritoryStoryPlan, drawTerritoryGround, drawTerritoryLandmarks, drawTerritoryMotes } from './arena-territory-art.js';
import { drawCloisterWall, drawCloisterMist, drawCloisterReflections, drawCloisterElevation, createCloisterElevationLayers } from './arena-cloister-art.js';
import { artReady, artGeneration, artTilePattern, drawArtFrame } from './art-atlas.js';
import { createTerritoryWallLayers, drawTerritoryWall, drawOpenedGateRubble } from './arena-territory-walls.js';

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
    const story = createTerritoryStoryPlan(environment, width, height);
    // Remove the old randomly rotated monoliths from the monastery entirely.
    // They read as arbitrary spires, sit on traversable floor and undermine
    // its coherent historic layout. Other terrain biomes keep their debris.
    const remains = [];
    if (!story.cloister) for (let index = 0; index < 10; index++) {
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
    return { biome, element, proximity, bend, trailWidth, rubble, remains, scars, stage: environment.stage, landmark: environment.landmark, habitat: environment.habitat,
        story };
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
    const tile = artReady() ? artTilePattern(ctx, `tile.${plan.biome}`) : null;
    if (tile) {
        // Hand-authored seamless ground texture; the old gradient stays as a mood wash on top.
        ctx.fillStyle = tile;
        ctx.fillRect(0, 0, width, height);
        ctx.globalAlpha = .38;
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        ctx.globalAlpha = 1;
    }
    drawTerritoryGround(ctx, plan.story);
    if (tile) drawGroundDecals(ctx, plan, width, height);

    // No shared road overlay: the canonical encounter district now owns the entire
    // large-scale ground composition through its deterministic territory story plan.
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
    for (const [index, piece] of plan.remains.entries()) {
        if (artReady() && drawArtFrame(ctx, 'environment', index % 3 === 0 ? 'ruin.slab' : 'ruin.rubble',
            Math.round(piece.x), Math.round(piece.y), { flipX: index % 2 === 1 })) continue;
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
    drawTerritoryLandmarks(ctx, plan.story);
    if (artReady() && !plan.story.cloister) drawForestEdges(ctx, plan, width, height);
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
    // A restrained habitat wash tells forest from flood from scorch at a glance; the full tile pass comes later.
    const tint = habitatTint(plan.habitat);
    if (tint) {
        ctx.fillStyle = tint;
        ctx.fillRect(0, 0, width, height);
    }
    // Edge fog produces depth without obscuring attack telegraphs or the player's immediate surroundings.
    const vignette = ctx.createRadialGradient(width * .5, height * .49, Math.min(width, height) * .2,
        width * .5, height * .49, Math.max(width, height) * .7);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, plan.story.cloister ? 'rgba(1,3,7,.37)' : 'rgba(1,3,7,.56)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
}

const habitatTints = {
    WetForest: 'rgba(34,96,58,.11)',
    OpenField: 'rgba(170,132,62,.08)',
    DesertedVillage: 'rgba(66,60,54,.12)',
    MonasteryGrounds: 'rgba(160,150,128,.07)',
    FloodedCloister: 'rgba(36,82,124,.13)',
    ScorchedApproach: 'rgba(156,54,22,.12)',
    Lair: 'rgba(124,30,14,.13)',
};

export function habitatTint(habitat) {
    return habitatTints[habitat] ?? null;
}

function terrainTexture(environment, width, height) {
    // Art generation is part of the key: the bake refreshes once the atlases finish loading.
    const key = [environment.seed, environment.biome, environment.element, environment.district, environment.habitat, environment.stage, width, height, artGeneration()].join(':');
    if (textures.has(key)) return textures.get(key);
    const image = document.createElement('canvas');
    image.width = Math.max(1, Math.round(width));
    image.height = Math.max(1, Math.round(height));
    const plan = createTerrainPlan(environment, image.width, image.height);
    drawTerrain(image.getContext('2d'), plan, image.width, image.height);
    // Keep at most two world textures on mobile; a whole territory is larger than one viewport.
    if (textures.size >= 2) textures.delete(textures.keys().next().value);
    const texture = { image, cloister: plan.story.cloister, plan };
    textures.set(key, texture);
    return texture;
}

const decalSets = {
    valley: ['decal.tuft.a', 'decal.tuft.b', 'decal.tuft.a', 'decal.fern', 'decal.stones', 'decal.puddle', 'decal.mushrooms', 'decal.tuft.b'],
    ash: ['decal.tuft.ash', 'decal.ember', 'decal.stones', 'decal.tuft.ash', 'decal.stones', 'decal.bones'],
    ridge: ['decal.stones', 'decal.tuft.b', 'decal.stones', 'decal.puddle', 'decal.tuft.a', 'decal.stones', 'decal.bones'],
};

// Flat ground detail only (grass, stones, puddles). Nothing upright lands on the fighting floor.
export function createDecalPlan(plan, width, height) {
    const random = seededRandom((plan.story.seed ?? 1) ^ 0x2c9e11);
    const set = decalSets[plan.biome] ?? decalSets.valley;
    const count = Math.min(300, Math.ceil(width * height / 8200));
    const decals = [];
    for (let i = 0; i < count; i++)
        decals.push({ name: set[Math.floor(random() * set.length)], x: Math.round(random() * width), y: Math.round(random() * height), flip: random() < .5 });
    return decals;
}

function drawGroundDecals(ctx, plan, width, height) {
    if (plan.story.cloister) return;
    for (const decal of createDecalPlan(plan, width, height))
        drawArtFrame(ctx, 'environment', decal.name, decal.x, decal.y, { flipX: decal.flip });
}

const edgeSets = {
    valley: ['prop.pine.a', 'prop.pine.b', 'prop.pine.c', 'prop.bush.a', 'prop.pine.a', 'prop.bush.b'],
    ash: ['prop.deadtree.a', 'prop.bush.ash', 'prop.deadtree.b', 'prop.rock.a', 'prop.bush.ash'],
    ridge: ['prop.pine.b', 'prop.deadtree.a', 'prop.rock.a', 'prop.pine.c', 'prop.deadtree.b'],
};

// Forest and scrub frame the outer world band (outside the normal combat lanes) so territory
// edges read as a place rather than a rectangle. Sorted by foot line within the bake.
export function createForestEdgePlan(plan, width, height) {
    const random = seededRandom((plan.story.seed ?? 1) ^ 0x5f17a3);
    const set = edgeSets[plan.biome] ?? edgeSets.valley;
    const props = [];
    for (const side of [0, 1]) for (let y = 8; y < height + 30; y += 22 + random() * 18) {
        const inset = random() * 26 - 10;
        props.push({ name: set[Math.floor(random() * set.length)], x: Math.round(side ? width - inset : inset), y: Math.round(y), flip: random() < .5 });
    }
    return props.sort((a, b) => a.y - b.y);
}

function drawForestEdges(ctx, plan, width, height) {
    for (const prop of createForestEdgePlan(plan, width, height))
        drawArtFrame(ctx, 'environment', prop.name, prop.x, prop.y, { flipX: prop.flip });
}

// Read the already-cached environment plan, without rerolling its procedural art.
export function drawArenaCloisterReflections(ctx, environment, width, height, lights, seconds = 0, reducedMotion = false) {
    if (!environment) return 0;
    return drawCloisterReflections(ctx, terrainTexture(environment, width, height).cloister, lights, seconds, reducedMotion);
}


// Cache owns the cloister's fixed plan; these lightweight wall items sort with
// actor foot positions in world space rather than being pasted over the viewport.
export function getArenaCloisterElevations(environment, width, height, seconds = 0) {
    if (!environment) return [];
    const texture = terrainTexture(environment, width, height);
    const cloister = texture.cloister;
    if (!cloister) return createTerritoryWallLayers(environment, texture.plan, width, height, seconds);
    return createCloisterElevationLayers(cloister, environment.barriers, width, height);
}

export function drawArenaCloisterElevation(ctx, layer) {
    if (layer.style === 'territory') return drawTerritoryWall(ctx, layer);
    return drawCloisterElevation(ctx, layer.barrier, layer.width, layer.height);
}

export function drawArenaEnvironment(ctx, environment, width, height, elapsedSeconds = 0) {
    if (!environment) return false;
    const texture = terrainTexture(environment, width, height);
    ctx.drawImage(texture.image, 0, 0, width, height);
    const cloister = texture.cloister;
    // With the atlas loaded, closed territory walls are depth-sorted layers (getArenaCloisterElevations).
    const spriteWalls = !cloister && artReady();
    for (const barrier of environment.barriers ?? []) {
        if (spriteWalls) {
            if (barrier.open && barrier.kind === 'gate') drawOpenedGateRubble(ctx, barrier, width, height);
            continue;
        }
        if (!cloister || !drawCloisterWall(ctx, barrier, width, height))
            drawTerritoryBarrier(ctx, barrier, environment.element, width, height, elapsedSeconds);
    }
    for (const supply of environment.supplies ?? []) drawSupply(ctx, supply, width, height, elapsedSeconds);
    drawTerritoryMotes(ctx, environment, width, height, elapsedSeconds);
    drawCloisterMist(ctx, cloister, elapsedSeconds);
    return true;
}

function drawSupply(ctx, supply, width, height, elapsed) {
    const x = supply.x * width;
    const y = supply.y * height;
    const opened = supply.open;
    const experience = supply.kind === 'experience';
    const color = experience ? '#b7a0f1' : '#b2d4aa';
    if (artReady()) {
        // Sealed reliquaries (real C# blockers) and their opened states as authored sprites.
        const name = `cache.${experience ? 'experience' : 'health'}.${opened ? 'open' : 'sealed'}`;
        const bob = opened ? Math.round(Math.sin(elapsed * 3) * 1) : 0;
        if (drawArtFrame(ctx, 'environment', name, Math.round(x), Math.round(y) + bob)) return;
    }
    ctx.save();
    ctx.translate(x, y);
    if (opened && !experience) {
        drawOpenHealingCache(ctx);
        ctx.fillStyle = '#cfdfc0';
        ctx.font = 'bold 9px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('HEAL', 0, 45);
        ctx.restore();
        return;
    }
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

function drawOpenHealingCache(ctx) {
    // A recognizable broken stone basin and pale medicinal growth, not another XP crystal.
    ctx.fillStyle = 'rgba(2,6,8,.48)';
    ctx.beginPath();
    ctx.ellipse(3, 12, 27, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#4b5a50';
    ctx.beginPath();
    ctx.moveTo(-23, -7);
    ctx.lineTo(21, -7);
    ctx.lineTo(17, 12);
    ctx.lineTo(-18, 12);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#96a492';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-21, -7);
    ctx.lineTo(20, -7);
    ctx.stroke();

    ctx.fillStyle = '#23382e';
    ctx.fillRect(-17, -7, 34, 7);
    ctx.fillStyle = '#9bb69b';
    ctx.fillRect(-13, -6, 24, 3);
    // Two herb stems; asymmetry preserves a hand-built, earthly silhouette.
    for (const leaf of [{ x: -10, y: -11, shift: -1 }, { x: 9, y: -13, shift: 1 }]) {
        ctx.strokeStyle = '#8da98a';
        ctx.beginPath();
        ctx.moveTo(leaf.x, -5);
        ctx.lineTo(leaf.x + leaf.shift * 3, leaf.y);
        ctx.stroke();
        ctx.fillStyle = '#c7d6b0';
        ctx.fillRect(leaf.x + leaf.shift * 4, leaf.y - 3, 5, 3);
    }
    ctx.strokeStyle = '#29372f';
    ctx.beginPath();
    ctx.moveTo(-4, 3);
    ctx.lineTo(-1, 8);
    ctx.lineTo(4, 12);
    ctx.stroke();
}

export function drawArenaExit(ctx, exit, elapsedSeconds = 0) {
    if (!exit) return;
    const { x, y } = exit;
    const pulse = Math.sin(elapsedSeconds * 3) * .08;
    if (artReady() && drawArtFrame(ctx, 'environment', 'exit.waystone', Math.round(x), Math.round(y))) {
        // The waystone's portal breathes; the arrow guide (drawExitGuide) keeps the direction readable.
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(161,106,208,${.16 + pulse})`;
        ctx.beginPath();
        ctx.ellipse(x, y - 8, 22 * (1 + pulse), 30, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return;
    }
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

function drawTerritoryBarrier(ctx, barrier, element, worldWidth, worldHeight, elapsed) {
    if (barrier.open) {
        if (barrier.kind !== 'gate') return;
        // The shattered gate leaves a persistent visual trace of the unlocked passage.
        const x = barrier.x * worldWidth;
        const y = barrier.y * worldHeight;
        const breadth = barrier.width * worldWidth;
        ctx.save();
        ctx.strokeStyle = 'rgba(173,139,102,.38)';
        ctx.lineWidth = 2;
        ctx.setLineDash([7, 8]);
        ctx.beginPath();
        ctx.moveTo(x + 10, y + 5);
        ctx.lineTo(x + breadth - 10, y + 5);
        ctx.stroke();
        ctx.restore();
        return;
    }
    const x = barrier.x * worldWidth;
    const y = barrier.y * worldHeight;
    const breadth = barrier.width * worldWidth;
    const depth = barrier.height * worldHeight;
    const pigment = {
        fire: ['#544039', '#bc5b3c'],
        frost: ['#35454e', '#92c7d8'],
        storm: ['#494840', '#b8ad6b'],
        arcane: ['#403546', '#9e74c4'],
    }[element] ?? ['#453d46', '#9e74c4'];

    ctx.save();
    // Thick masonry follows the exact rectangle used by C# circle-vs-AABB collision.
    ctx.fillStyle = 'rgba(4,6,8,.44)';
    ctx.fillRect(x + 6, y + 10, breadth, depth + 7);
    ctx.fillStyle = pigment[0];
    ctx.fillRect(x, y, breadth, depth);
    ctx.strokeStyle = 'rgba(195,180,157,.36)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, Math.max(1, breadth - 2), Math.max(1, depth - 2));
    for (let p = 0; p < breadth; p += 31) {
        ctx.beginPath();
        ctx.moveTo(x + p, y + (p % 3) * 3);
        ctx.lineTo(x + p + 7, y + depth * .57);
        ctx.lineTo(x + p + 3, y + depth);
        ctx.stroke();
    }
    if (barrier.kind === 'gate') {
        const pulse = .6 + .25 * Math.sin(elapsed * 3);
        ctx.strokeStyle = pigment[1];
        ctx.globalAlpha = pulse;
        ctx.lineWidth = 3;
        for (const shift of [-1, 0, 1]) {
            const markX = x + breadth / 2 + shift * 18;
            ctx.beginPath();
            ctx.moveTo(markX - 6, y + 5);
            ctx.lineTo(markX + 6, y + depth * .48);
            ctx.lineTo(markX - 6, y + depth - 5);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#f0ddba';
        ctx.font = 'bold 11px system-ui';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#0b0a11';
        ctx.shadowBlur = 5;
        ctx.fillText('SEALED', x + breadth / 2, y + depth / 2 - 25);
    }
    ctx.restore();
}
