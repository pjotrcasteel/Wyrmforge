import {applyCastPose} from './cast_pose.mjs';
const color = { left: '#8da9b9', right: '#bd9781', body: '#b7b6a5', edge: '#202a29', floor: '#172322', line: '#304341' };

export function drawView(ctx, data, phase, options) {
    const { x, y, width, height, yaw = 45, pitch = 25, travel = true, contacts = true, cycles = 0, label = 'Game camera', sprite = false } = options;
    if (data.injury) phase = ((phase + data.injury.phaseWarpAmplitude * Math.sin(2 * Math.PI * (phase - .515625))) % 1 + 1) % 1;
    const index = Math.min(data.frames.length - 1, Math.floor(phase * data.frames.length));
    const frame = applyCastPose(data.frames[index], data, options.cast);
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
    if (options.onProjectedJoints) options.onProjectedJoints(Object.fromEntries(Object.entries(joint).map(([n,p])=>[n,project(p)])));
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, width, height); ctx.clip();
    if (!sprite) {
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
    }
    if (contacts && !sprite) for (const [side, contactIndex] of [['l', 0], ['r', 1]]) {
        const toe = joint[side + 'toes'];
        const p = project([toe[0], 0, toe[2]]);
        ctx.beginPath(); ctx.ellipse(p[0], p[1], scale * .055, scale * .022, 0, 0, Math.PI * 2);
        ctx.fillStyle = data.contacts[index][contactIndex] ? '#d6bf68' : '#415957'; ctx.fill();
    }
    const geometry = [];
    const mage = Boolean(data.mage);
    const polygon = (points, fill, depthOffset = 0) => {
        const projected = points.map(p => project(p));
        geometry.push({depth: projected.reduce((sum,p)=>sum+p[2],0)/projected.length + depthOffset, draw() {
            ctx.beginPath(); projected.forEach((p,i)=>i ? ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();
            ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=color.edge;ctx.lineWidth=2;ctx.stroke();
        }});
    };
    if (mage) {
        // Open-front cloak: fixed body attachments, short rear hem keeps boots visible.
        const l=joint.lclavicle,r=joint.rclavicle,lh=joint.lhipjoint,rh=joint.rhipjoint;
        polygon([[l[0]+.07,l[1]+.02,l[2]-.05],[r[0]-.07,r[1]+.02,r[2]-.05],
                 [rh[0]-.12,rh[1]-.40,rh[2]-.13],[lh[0]+.12,lh[1]-.40,lh[2]-.13]],'#354b5c',-.08);
        polygon([[l[0]+.05,l[1],l[2]+.025],[l[0]-.08,l[1]-.04,l[2]+.07],
                 [lh[0]-.035,lh[1]-.32,lh[2]+.10],[lh[0]+.10,lh[1]-.32,lh[2]+.04]],'#516778',.03);
        polygon([[r[0]-.05,r[1],r[2]+.025],[r[0]+.08,r[1]-.04,r[2]+.07],
                 [rh[0]+.035,rh[1]-.32,rh[2]+.10],[rh[0]-.10,rh[1]-.32,rh[2]+.04]],'#42596a',.03);
        const grip=joint.rhand,base=grip.map((v,i)=>v+data.mage.staffBaseOffset[i]),tip=grip.map((v,i)=>v+data.mage.staffTipOffset[i]);
        const bend=[grip[0]-.025,grip[1]+.68,grip[2]+.01];
        const projected=[base,grip,bend,tip].map(p=>project(p));
        geometry.push({depth:project(grip)[2]+.02,draw(){
            ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=scale*.033;ctx.strokeStyle='#241b16';
            ctx.beginPath();projected.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.stroke();
            ctx.lineWidth=scale*.018;ctx.strokeStyle='#887054';ctx.stroke();
            const t=projected[3];ctx.fillStyle='#d6a553';ctx.beginPath();ctx.arc(t[0],t[1],scale*.027,0,Math.PI*2);ctx.fill();
        }});
    }
    const chain = (a, b, radius, fill) => {
        const p = project(joint[a]), q = project(joint[b]);
        geometry.push({ depth: (p[2] + q[2]) / 2, draw() {
            ctx.lineCap = 'round'; ctx.strokeStyle = color.edge; ctx.lineWidth = radius * scale + 3;
            ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
            ctx.strokeStyle = fill; ctx.lineWidth = radius * scale;
            ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
        } });
    };
    for (const [side, fill] of [['l', mage ? '#516778' : color.left], ['r', mage ? '#42596a' : color.right]]) {
        chain(side + 'hipjoint', side + 'femur', .105, fill);
        chain(side + 'femur', side + 'tibia', .08, mage ? '#4a3b30' : fill);
        chain(side + 'tibia', side + 'foot', .075, mage ? '#4a3b30' : fill);
        chain(side + 'foot', side + 'toes', .07, mage ? '#4a3b30' : fill);
        chain(side + 'clavicle', side + 'humerus', .075, fill);
        chain(side + 'humerus', side + 'radius', .06, fill);
        chain(side + 'radius', side + 'hand', .06, fill);
    }
    const torso = ['lclavicle', 'rclavicle', 'rhipjoint', 'lhipjoint'].map(n => project(joint[n]));
    geometry.push({ depth: torso.reduce((sum, p) => sum + p[2], 0) / 4, draw() {
        ctx.beginPath(); torso.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
        ctx.fillStyle = mage ? '#343a3b' : color.body; ctx.fill(); ctx.strokeStyle = color.edge; ctx.lineWidth = 2; ctx.stroke();
    } });
    chain('thorax', mage ? 'lowerneck' : 'upperneck', mage ? .13 : .075, mage ? '#bab9a4' : color.body);
    const head = [...joint.head]; head[1] -= mage ? .025 : .06;
    const hp = project(head);
    geometry.push({ depth: hp[2], draw() {
        ctx.beginPath(); ctx.ellipse(hp[0], hp[1], scale * .075, scale * .105, 0, 0, Math.PI * 2);
        ctx.fillStyle = mage ? '#42596a' : color.body; ctx.fill(); ctx.strokeStyle = color.edge; ctx.lineWidth = 2; ctx.stroke();
        if(mage && Math.cos(angle) > -.02){
            // Hood opening follows world-facing +Z and disappears from rear views.
            const face=project([head[0],head[1]-.01,head[2]+.065]);
            ctx.fillStyle='#202b30';ctx.beginPath();ctx.ellipse(face[0],face[1],scale*(.008+.035*Math.max(0,Math.cos(angle))),scale*.061,0,0,Math.PI*2);ctx.fill();
        }
    } });
    geometry.sort((a, b) => a.depth - b.depth);
    for (const item of geometry) item.draw();
    ctx.restore();
    if (sprite) return index;
    ctx.save();
    ctx.fillStyle = '#d7ddcc'; ctx.font = '15px sans-serif'; ctx.fillText(label, x + 14, y + 24);
    ctx.fillStyle = '#8baba5'; ctx.font = '11px sans-serif'; ctx.fillText(mage ? 'Mage blocking · carried staff · fixed right-hand grip' : 'Blue: left · rust: right · gold: contact estimate', x + 14, y + height - 12);
    ctx.restore();
    return index;
}
