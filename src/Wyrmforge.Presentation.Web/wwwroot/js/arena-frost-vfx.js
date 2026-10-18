// Frost roster VFX. Fire pressures the hunter; Frost boxes the hunter in, so its marks read as *terrain* and *lanes*:
// straight glacial lines, slick black ground, splinters that bloom where a shard stops, and rime gathering on a chilled
// hunter. C# owns every timing and hit test; this module draws exactly the sizes the snapshot reports. Attacks keep the
// shared red danger edge (one rule across realms); black ice is a footing hazard, not a hit, so it has a cold edge instead.

const LANE = { edge: 'rgba(226, 84, 74, 0.9)', fill: 'rgba(150, 214, 240, 0.12)', charge: 'rgba(200, 240, 255, 0.4)' };
const SKITTER = { edge: 'rgba(226, 84, 74, 0.85)', fill: 'rgba(170, 220, 240, 0.14)', charge: 'rgba(220, 246, 255, 0.4)' };
const BLOOM = { edge: 'rgba(226, 84, 74, 0.9)', fill: 'rgba(140, 210, 240, 0.12)', charge: 'rgba(200, 240, 255, 0.36)' };
const FANG = { edge: 'rgba(226, 84, 74, 0.95)', fill: 'rgba(230, 240, 248, 0.14)', charge: 'rgba(240, 250, 255, 0.45)' };
const AVALANCHE = { edge: 'rgba(226, 84, 74, 0.9)', fill: 'rgba(120, 180, 215, 0.12)', charge: 'rgba(190, 230, 250, 0.34)' };
const GLAZE = { edge: 'rgba(170, 226, 255, 0.85)', fill: 'rgba(40, 70, 96, 0.22)', charge: 'rgba(120, 190, 230, 0.3)' };
// Must match ShardcasterBehaviorState.BloomRadius: the dashed ring at the end of a lane is the bloom that will follow.
// Must match CairnSentinelBehaviorState.BraceHalfAngleRadians: the drawn front arc is exactly where the brace and the wave reach.
// Must match MirrorWispBehaviorState.CutHalfAngleRadians: the Shiver Cut arc is exactly the wedge C# tests.
export const FROST = { bloomRadius: 40, chillMaxStacks: 5, braceHalfAngle: Math.PI / 3, cutHalfAngle: 0.87 };
// The Cantor's hymn and reknit are support rites, not hits: a cold blue edge, never the red danger edge.
const RITE = { edge: 'rgba(170, 226, 255, 0.8)', fill: 'rgba(150, 210, 240, 0.08)', charge: 'rgba(200, 238, 255, 0.22)' };
const STILLNESS = { edge: 'rgba(226, 84, 74, 0.9)', fill: 'rgba(200, 230, 245, 0.1)', charge: 'rgba(225, 245, 255, 0.32)' };
const SHIVER = { edge: 'rgba(226, 84, 74, 0.95)', fill: 'rgba(225, 245, 255, 0.14)', charge: 'rgba(245, 252, 255, 0.45)' };

const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));

export function isFrostTelegraph(kind) {
    return kind === 'skitter' || kind === 'ice-lance' || kind === 'black-ice' || kind === 'flank-pounce' || kind === 'avalanche'
        || kind === 'rime-hymn' || kind === 'reknit' || kind === 'stillness' || kind === 'glass-step'
        || kind === 'shiver-cut' || kind === 'shiver-slash';
}

export function drawFrostTelegraph(ctx, enemy, telegraph) {
    if (telegraph.kind === 'skitter') drawLane(ctx, enemy, telegraph, SKITTER, false);
    else if (telegraph.kind === 'ice-lance') drawLane(ctx, enemy, telegraph, LANE, true);
    else if (telegraph.kind === 'black-ice') drawGlazeMark(ctx, telegraph);
    else if (telegraph.kind === 'flank-pounce') drawLane(ctx, enemy, telegraph, FANG, false);
    else if (telegraph.kind === 'avalanche') drawAvalancheFront(ctx, enemy, telegraph);
    else if (telegraph.kind === 'rime-hymn') drawRiteCircle(ctx, telegraph, RITE, false);
    else if (telegraph.kind === 'stillness') drawRiteCircle(ctx, telegraph, STILLNESS, true);
    else if (telegraph.kind === 'reknit') drawReknit(ctx, enemy, telegraph);
    else if (telegraph.kind === 'glass-step') drawGlassStep(ctx, telegraph);
    else if (telegraph.kind === 'shiver-cut' || telegraph.kind === 'shiver-slash') drawShiverCut(ctx, enemy, telegraph);
}

// A Cantor chant: a ring of slowly gathering verse-marks. The hymn (support) closes inward in cold blue; the Stillness
// Verse (a hit) fills in from the centre under the shared red edge. Either can be broken by a burst or a shove.
function drawRiteCircle(ctx, telegraph, colors, hostile) {
    const r = Math.max(4, Number(telegraph.radius) || 0);
    const p = clamp01(telegraph.progress);
    const x = telegraph.targetX, y = telegraph.targetY;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = colors.fill;
    ctx.fill();
    if (!hostile) ctx.setLineDash([2, 6]);
    ctx.strokeStyle = colors.edge;
    ctx.lineWidth = hostile ? 1.5 : 1.25;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    if (hostile) ctx.arc(x, y, r * p, 0, Math.PI * 2);
    else { ctx.arc(x, y, r, 0, Math.PI * 2); ctx.arc(x, y, r * (1 - p * 0.85), 0, Math.PI * 2, true); }
    ctx.fillStyle = colors.charge;
    ctx.fill();
    // Six verse runes ride the rim and light up one by one as the chant completes.
    for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 3;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = i < Math.round(p * 6) ? 'rgba(240, 252, 255, 0.95)' : 'rgba(150, 200, 225, 0.35)';
        ctx.fill();
    }
    ctx.restore();
}

// Reknit: a pale thread from the Cantor's lantern to the husk it is pulling back together, and a ring tightening on the
// husk itself. Kill the Cantor or stand on the husk's ground - the thread tells you which one it is mending.
function drawReknit(ctx, enemy, telegraph) {
    const r = Math.max(4, Number(telegraph.radius) || 0);
    const p = clamp01(telegraph.progress);
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.lineDashOffset = -p * 32;
    ctx.beginPath();
    ctx.moveTo(enemy.x, enemy.y - (Number(enemy.radius) || 0));
    ctx.lineTo(telegraph.targetX, telegraph.targetY);
    ctx.strokeStyle = RITE.edge;
    ctx.lineWidth = 1.25;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(telegraph.targetX, telegraph.targetY, r * (1.6 - 0.6 * p), 0, Math.PI * 2);
    ctx.strokeStyle = RITE.edge;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(telegraph.targetX, telegraph.targetY, r * p, 0, Math.PI * 2);
    ctx.fillStyle = RITE.charge;
    ctx.fill();
    ctx.restore();
}

// Glass Step: the place the Wisp will step out of, shimmering like a mirror catching light. A diamond, not a circle, so it
// cannot be mistaken for a blast.
function drawGlassStep(ctx, telegraph) {
    const r = Math.max(4, Number(telegraph.radius) || 0);
    const p = clamp01(telegraph.progress);
    const x = telegraph.targetX, y = telegraph.targetY;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.7, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r * 0.7, y);
    ctx.closePath();
    ctx.fillStyle = `rgba(225, 245, 255, ${0.1 + 0.3 * p})`;
    ctx.fill();
    ctx.strokeStyle = 'rgba(235, 250, 255, 0.85)';
    ctx.lineWidth = 1.25;
    ctx.stroke();
    ctx.beginPath();
    const glint = -r * 0.6 + r * 1.2 * p;
    ctx.moveTo(x - r * 0.35, y + glint + r * 0.2);
    ctx.lineTo(x + r * 0.35, y + glint - r * 0.2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.stroke();
    ctx.restore();
}

// Shiver Cut: the exact wedge the glass blade sweeps, filling during the windup; the release flashes the whole arc.
function drawShiverCut(ctx, enemy, telegraph) {
    const r = Math.max(4, Number(telegraph.radius) || 0);
    const angle = Math.atan2(telegraph.targetY - enemy.y, telegraph.targetX - enemy.x);
    const half = FROST.cutHalfAngle;
    const slash = telegraph.kind === 'shiver-slash';
    const p = slash ? 1 : clamp01(telegraph.progress);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(enemy.x, enemy.y);
    ctx.arc(enemy.x, enemy.y, r, angle - half, angle + half);
    ctx.closePath();
    ctx.fillStyle = slash ? 'rgba(245, 252, 255, 0.55)' : SHIVER.fill;
    ctx.fill();
    ctx.strokeStyle = SHIVER.edge;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    if (!slash) {
        ctx.beginPath();
        ctx.moveTo(enemy.x, enemy.y);
        ctx.arc(enemy.x, enemy.y, r, angle - half, angle - half + half * 2 * p);
        ctx.closePath();
        ctx.fillStyle = SHIVER.charge;
        ctx.fill();
    }
    ctx.restore();
}

// The Sentinel's Frost Brace: its whole front arc out to the wave's reach, filling as the stamp nears. The two flanks stay
// unmarked on purpose - that is where the hunter belongs.
function drawAvalancheFront(ctx, enemy, telegraph) {
    const r = Math.max(4, Number(telegraph.radius) || 0);
    const angle = Math.atan2(telegraph.targetY - enemy.y, telegraph.targetX - enemy.x);
    const half = FROST.braceHalfAngle;
    const p = clamp01(telegraph.progress);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(enemy.x, enemy.y);
    ctx.arc(enemy.x, enemy.y, r, angle - half, angle + half);
    ctx.closePath();
    ctx.fillStyle = AVALANCHE.fill;
    ctx.fill();
    ctx.strokeStyle = AVALANCHE.edge;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(enemy.x, enemy.y);
    ctx.arc(enemy.x, enemy.y, r * p, angle - half, angle + half);
    ctx.closePath();
    ctx.fillStyle = AVALANCHE.charge;
    ctx.fill();
    ctx.restore();
}

// The Avalanche Step in motion: a rolling band of snow and shock across the front arc; only this edge hurts.
export function drawAvalancheWave(ctx, wave) {
    const r = Math.max(1, Number(wave.radius) || 0);
    const half = Number(wave.halfAngle) || FROST.braceHalfAngle;
    const angle = Number(wave.angle) || 0;
    const fade = 1 - clamp01((Number(wave.progress) || 0) - 0.85) / 0.15;
    ctx.save();
    ctx.beginPath();
    ctx.arc(wave.x, wave.y, r, angle - half, angle + half);
    ctx.strokeStyle = `rgba(215, 240, 255, ${0.85 * fade})`;
    ctx.lineWidth = Math.max(2, Number(wave.thickness) || 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(wave.x, wave.y, Math.max(1, r - 6), angle - half, angle + half);
    ctx.strokeStyle = `rgba(120, 180, 215, ${0.5 * fade})`;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
}

// Snowblind Feint: a soft drifting cloud where the Whitefang was. Drawn over the actors, so it hides what is inside it.
export function drawSnowCloud(ctx, cloud, seconds = 0) {
    const r = Math.max(4, Number(cloud.radius) || 0);
    const life = clamp01(cloud.life);
    const t = Number(seconds) || 0;
    ctx.save();
    ctx.globalAlpha = Math.min(1, life * 2.5) * 0.85;
    for (let i = 0; i < 6; i++) {
        const a = i * (Math.PI * 2 / 6) + t * 0.3;
        const d = r * (0.35 + 0.1 * Math.sin(t * 0.8 + i));
        ctx.beginPath();
        ctx.arc(cloud.x + Math.cos(a) * d, cloud.y + Math.sin(a) * d * 0.7, r * 0.55, 0, Math.PI * 2);
        ctx.fillStyle = i % 2 ? 'rgba(232, 242, 250, 0.55)' : 'rgba(200, 220, 236, 0.5)';
        ctx.fill();
    }
    ctx.restore();
}

// A ruler-straight lane from the caster to its end. Ice lances also preview the splinter bloom at the lane's end:
// leaving the line is not enough if you step into where it stops.
function drawLane(ctx, enemy, telegraph, colors, bloomAtEnd) {
    const dx = telegraph.targetX - enemy.x;
    const dy = telegraph.targetY - enemy.y;
    const length = Math.hypot(dx, dy);
    if (length < 1) return;
    const half = Math.max(3, Number(telegraph.radius) || 0);
    const progress = clamp01(telegraph.progress);
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(Math.atan2(dy, dx));
    ctx.fillStyle = colors.fill;
    ctx.fillRect(0, -half, length, half * 2);
    ctx.fillStyle = colors.charge;
    ctx.fillRect(0, -half, length * progress, half * 2);
    ctx.strokeStyle = colors.edge;
    ctx.lineWidth = 1.25;
    ctx.strokeRect(0, -half, length, half * 2);
    // Frost tick marks along the lane: a cold, measured line rather than the hound's red arrow.
    ctx.strokeStyle = 'rgba(235, 250, 255, 0.55)';
    ctx.lineWidth = 1;
    for (let d = 18; d < length - 6; d += 26) {
        ctx.beginPath();
        ctx.moveTo(d, -half);
        ctx.lineTo(d + 4, 0);
        ctx.lineTo(d, half);
        ctx.stroke();
    }
    if (bloomAtEnd) {
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(length, 0, FROST.bloomRadius, 0, Math.PI * 2);
        ctx.strokeStyle = BLOOM.edge;
        ctx.lineWidth = 1.25;
        ctx.stroke();
        ctx.setLineDash([]);
    }
    ctx.restore();
}

function drawGlazeMark(ctx, telegraph) {
    const r = Math.max(4, Number(telegraph.radius) || 0);
    const p = clamp01(telegraph.progress);
    ctx.save();
    ctx.beginPath();
    ctx.arc(telegraph.targetX, telegraph.targetY, r, 0, Math.PI * 2);
    ctx.fillStyle = GLAZE.fill;
    ctx.fill();
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = GLAZE.edge;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);
    // Frost creeps in from the rim, the opposite of a blast's inner disc: the ground is freezing over.
    ctx.beginPath();
    ctx.arc(telegraph.targetX, telegraph.targetY, r, 0, Math.PI * 2);
    ctx.arc(telegraph.targetX, telegraph.targetY, r * (1 - p), 0, Math.PI * 2, true);
    ctx.fillStyle = GLAZE.charge;
    ctx.fill();
    ctx.restore();
}

// Slick black ice: dark glassy ground with a pale frost rim and long glints. It thaws by shrinking its shine, not its size,
// so the hazard area never lies.
export function drawBlackIce(ctx, patch, seconds = 0) {
    const r = Math.max(4, Number(patch.radius) || 0);
    const life = clamp01(patch.life);
    const fade = Math.min(1, life * 4);
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.65 * fade;
    ctx.beginPath();
    ctx.ellipse(patch.x, patch.y, r, r * 0.92, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(14, 26, 38, 0.72)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(190, 232, 250, 0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(patch.x, patch.y, r * 0.78, r * 0.7, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(38, 72, 98, 0.45)';
    ctx.fill();
    const glint = (Number(seconds) || 0) * 0.6 % 1;
    ctx.strokeStyle = `rgba(230, 248, 255, ${0.25 + 0.45 * life})`;
    ctx.lineWidth = 1.5;
    for (const [offset, length] of [[-0.35, 0.5], [0.05, 0.7], [0.4, 0.35]]) {
        const y = patch.y + r * offset;
        const x = patch.x - r * 0.5 + r * 0.25 * glint;
        ctx.beginPath();
        ctx.moveTo(x, y + r * 0.12);
        ctx.lineTo(x + r * length, y - r * 0.12);
        ctx.stroke();
    }
    ctx.restore();
}

// Splinter bloom: a marked ring whose crystals grow toward the burst, then a starburst of shards that fades.
export function drawSplinterBloom(ctx, bloom) {
    const r = Math.max(4, Number(bloom.radius) || 0);
    ctx.save();
    if (!bloom.burst) {
        const p = clamp01(bloom.charge);
        ctx.beginPath();
        ctx.arc(bloom.x, bloom.y, r, 0, Math.PI * 2);
        ctx.fillStyle = BLOOM.fill;
        ctx.fill();
        ctx.strokeStyle = BLOOM.edge;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(bloom.x, bloom.y, r * p, 0, Math.PI * 2);
        ctx.fillStyle = BLOOM.charge;
        ctx.fill();
        drawCrystals(ctx, bloom.x, bloom.y, 6 + 10 * p, 'rgba(225, 248, 255, 0.95)');
    } else {
        const f = clamp01(bloom.fade);
        drawCrystals(ctx, bloom.x, bloom.y, r * (0.5 + 0.6 * f), `rgba(225, 248, 255, ${1 - f})`);
        ctx.beginPath();
        ctx.arc(bloom.x, bloom.y, r * (0.8 + 0.3 * f), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(200, 240, 255, ${0.8 * (1 - f)})`;
        ctx.lineWidth = 3 * (1 - f) + 1;
        ctx.stroke();
    }
    ctx.restore();
}

function drawCrystals(ctx, x, y, length, color) {
    ctx.fillStyle = color;
    for (let i = 0; i < 7; i++) {
        const angle = i * (Math.PI * 2 / 7) + 0.3;
        const tip = length * (i % 2 ? 0.7 : 1);
        const nx = Math.cos(angle), ny = Math.sin(angle);
        ctx.beginPath();
        ctx.moveTo(x - ny * 2.5, y + nx * 2.5);
        ctx.lineTo(x + nx * tip, y + ny * tip);
        ctx.lineTo(x + ny * 2.5, y - nx * 2.5);
        ctx.closePath();
        ctx.fill();
    }
}

// The lance in flight: a long jagged shard with a fading frost streak back toward the caster.
export function drawIceLance(ctx, lance) {
    const trail = Math.min(70, Math.hypot(lance.x - lance.originX, lance.y - lance.originY));
    ctx.save();
    ctx.translate(lance.x, lance.y);
    ctx.rotate(Number(lance.angle) || 0);
    const gradient = typeof ctx.createLinearGradient === 'function' ? ctx.createLinearGradient(-trail, 0, 0, 0) : null;
    if (gradient && typeof gradient.addColorStop === 'function') {
        gradient.addColorStop(0, 'rgba(180, 230, 255, 0)');
        gradient.addColorStop(1, 'rgba(210, 244, 255, 0.6)');
        ctx.fillStyle = gradient;
    } else ctx.fillStyle = 'rgba(210, 244, 255, 0.4)';
    ctx.fillRect(-trail, -2.5, trail, 5);
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(0, -4.5);
    ctx.lineTo(-14, -2);
    ctx.lineTo(-18, 0);
    ctx.lineTo(-14, 2);
    ctx.lineTo(0, 4.5);
    ctx.closePath();
    ctx.fillStyle = 'rgba(176, 226, 248, 0.95)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(245, 253, 255, 0.95)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
}

// Rime on the hunter: a frost ring at the feet with one crystal per Chill stack, so the slow is readable at a glance.
export function drawPlayerChill(ctx, player, seconds = 0) {
    const stacks = Math.max(0, Math.min(FROST.chillMaxStacks, Number(player?.chill) || 0));
    if (stacks === 0) return;
    const intensity = stacks / FROST.chillMaxStacks;
    const r = (Number(player.radius) || 14) + 6;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(player.x, player.y + r * 0.35, r, r * 0.45, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(150, 214, 245, ${0.1 + 0.18 * intensity})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(215, 245, 255, ${0.45 + 0.4 * intensity})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    const turn = (Number(seconds) || 0) * 0.4;
    ctx.fillStyle = 'rgba(235, 252, 255, 0.95)';
    for (let i = 0; i < stacks; i++) {
        const angle = turn + i * (Math.PI * 2 / FROST.chillMaxStacks);
        const cx = player.x + Math.cos(angle) * r;
        const cy = player.y + r * 0.35 + Math.sin(angle) * r * 0.45;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 6);
        ctx.lineTo(cx + 2.5, cy);
        ctx.lineTo(cx, cy + 2);
        ctx.lineTo(cx - 2.5, cy);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();
}

// A rime husk: the frozen shell a fallen Frostling leaves, a Cantor's reknit target until it crumbles.
export function drawRimeHusk(ctx, husk) {
    const life = clamp01(husk.life);
    ctx.save();
    ctx.globalAlpha = 0.3 + 0.7 * Math.min(1, life * 3);
    ctx.beginPath();
    ctx.ellipse(husk.x, husk.y + 2, 9, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(30, 52, 70, 0.55)';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(husk.x - 7, husk.y + 2);
    ctx.lineTo(husk.x - 4, husk.y - 5);
    ctx.lineTo(husk.x, husk.y - 2);
    ctx.lineTo(husk.x + 3, husk.y - 7);
    ctx.lineTo(husk.x + 7, husk.y + 2);
    ctx.closePath();
    ctx.fillStyle = 'rgba(190, 225, 242, 0.85)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(70, 120, 150, 0.9)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
}

// Rime armour from a Cantor's hymn: a crust of pale facets around the body that thins as it is chipped away.
export function drawRimeArmor(ctx, enemy) {
    const crust = clamp01(enemy.rimeArmor);
    if (crust <= 0) return;
    const r = (Number(enemy.radius) || 10) + 3;
    ctx.save();
    ctx.globalAlpha = Number.isFinite(enemy.opacity) ? enemy.opacity : 1;
    ctx.strokeStyle = `rgba(215, 242, 255, ${0.45 + 0.45 * crust})`;
    ctx.lineWidth = 1 + 2 * crust;
    const facets = Math.max(3, Math.round(8 * crust));
    ctx.beginPath();
    for (let i = 0; i <= facets; i++) {
        const a = Math.PI + i * Math.PI / facets;
        const rr = r + (i % 2 ? 2 : 0);
        const px = enemy.x + Math.cos(a) * rr, py = enemy.y + Math.sin(a) * rr * 1.1;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
}
