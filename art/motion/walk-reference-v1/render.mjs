const color = { left: '#8da9b9', right: '#bd9781', body: '#b7b6a5', edge: '#202a29', floor: '#172322', line: '#304341' };

export function drawView(ctx, data, phase, options) {
    const { x, y, width, height, yaw = 45, pitch = 25, travel = true, contacts = true, cycles = 0, label = 'Game camera' } = options;
    const index = Math.min(data.frames.length - 1, Math.floor(phase * data.frames.length));
    const frame = data.frames[index];
    const names = data.jointNames;
    const joint = Object.fromEntries(names.map((n, i) => [n, frame[i]]));
    const root = joint.root;
    const angle = yaw * Math.PI / 180;
    const tilt = pitch * Math.PI / 180;
    const scale = height * .37;
    const offset = data.stride.map(v => v * cycles);
    const camera = [root[0] + offset[0], 0, root[2] + offset[2]];
    const project = (p, ground = false) => {
        const dx = p[0] + (ground ? 0 : offset[0]) - camera[0], dz = p[2] + (ground ? 0 : offset[2]) - camera[2];
        const depth = -dx * Math.sin(angle) + dz * Math.cos(angle);
        return [x + width * .5 + (dx * Math.cos(angle) + dz * Math.sin(angle)) * scale,
            y + height * .84 - p[1] * Math.cos(tilt) * scale + depth * Math.sin(tilt) * scale, depth];
    };
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, width, height); ctx.clip();
    ctx.fillStyle = color.floor; ctx.fillRect(x, y, width, height);
    ctx.lineWidth = 1; ctx.strokeStyle = color.line;
    // Moving capture: grid lives in world coordinates while the camera follows the pelvis.
    // In-place inspection: grid follows the horizontal root and therefore stays still.
    const groundCenter = travel ? [Math.floor(camera[0] * 4) / 4, Math.floor(camera[2] * 4) / 4] : [camera[0], camera[2]];
    for (let i = -8; i <= 8; i++) {
        for (const points of [
            [[groundCenter[0] + i * .25, 0, groundCenter[1] - 2], [groundCenter[0] + i * .25, 0, groundCenter[1] + 3]],
            [[groundCenter[0] - 2, 0, groundCenter[1] + i * .25], [groundCenter[0] + 2, 0, groundCenter[1] + i * .25]]
        ]) {
            const a = project(points[0], true), b = project(points[1], true);
            ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        }
    }
    if (contacts) for (const [side, contactIndex] of [['l', 0], ['r', 1]]) {
        const toe = joint[side + 'toes'];
        const p = project([toe[0], 0, toe[2]]);
        ctx.beginPath(); ctx.ellipse(p[0], p[1], scale * .055, scale * .022, 0, 0, Math.PI * 2);
        ctx.fillStyle = data.contacts[index][contactIndex] ? '#d6bf68' : '#415957'; ctx.fill();
    }
    const geometry = [];
    const chain = (a, b, radius, fill) => {
        const p = project(joint[a]), q = project(joint[b]);
        geometry.push({ depth: (p[2] + q[2]) / 2, draw() {
            ctx.lineCap = 'round'; ctx.strokeStyle = color.edge; ctx.lineWidth = radius * scale + 3;
            ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
            ctx.strokeStyle = fill; ctx.lineWidth = radius * scale;
            ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
        } });
    };
    for (const [side, fill] of [['l', color.left], ['r', color.right]]) {
        chain(side + 'hipjoint', side + 'femur', .105, fill);
        chain(side + 'femur', side + 'tibia', .08, fill);
        chain(side + 'tibia', side + 'foot', .075, fill);
        chain(side + 'foot', side + 'toes', .07, fill);
        chain(side + 'clavicle', side + 'humerus', .075, fill);
        chain(side + 'humerus', side + 'radius', .06, fill);
        chain(side + 'radius', side + 'hand', .06, fill);
    }
    const torso = ['lclavicle', 'rclavicle', 'rhipjoint', 'lhipjoint'].map(n => project(joint[n]));
    geometry.push({ depth: torso.reduce((sum, p) => sum + p[2], 0) / 4, draw() {
        ctx.beginPath(); torso.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
        ctx.fillStyle = color.body; ctx.fill(); ctx.strokeStyle = color.edge; ctx.lineWidth = 2; ctx.stroke();
    } });
    chain('thorax', 'upperneck', .075, color.body);
    const head = [...joint.head]; head[1] -= .06;
    const hp = project(head);
    geometry.push({ depth: hp[2], draw() {
        ctx.beginPath(); ctx.ellipse(hp[0], hp[1], scale * .075, scale * .105, 0, 0, Math.PI * 2);
        ctx.fillStyle = color.body; ctx.fill(); ctx.strokeStyle = color.edge; ctx.lineWidth = 2; ctx.stroke();
    } });
    geometry.sort((a, b) => a.depth - b.depth);
    for (const item of geometry) item.draw();
    ctx.restore();
    ctx.save();
    ctx.fillStyle = '#d7ddcc'; ctx.font = '15px sans-serif'; ctx.fillText(label, x + 14, y + 24);
    ctx.fillStyle = '#8baba5'; ctx.font = '11px sans-serif'; ctx.fillText('Blue: left · rust: right · gold: contact estimate', x + 14, y + height - 12);
    ctx.restore();
    return index;
}
