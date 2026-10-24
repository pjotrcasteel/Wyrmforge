// One painted character, rigid bones, analytical ground contact. No generated per-frame artwork.
export const WALK = Object.freeze({ frames: 16, fps: 12, stance: .62, sweep: 32, lift: 9, cell: 192,
    travelPerCycle: 32 / .62, facing: 'SE' });
const tau = 2 * Math.PI;
const wrap = t => ((t % 1) + 1) % 1;
const smooth = t => t * t * (3 - 2 * t);
export function footAt(phase, offset = 0, base = [101, 166]) {
    const t = wrap(phase + offset), planted = t < WALK.stance;
    const u = planted ? t / WALK.stance : (t - WALK.stance) / (1 - WALK.stance);
    const x = planted ? WALK.sweep / 2 - WALK.sweep * u : -WALK.sweep / 2 + WALK.sweep * smooth(u);
    const lift = planted ? 0 : WALK.lift * Math.sin(Math.PI * u) ** 2;
    return { point: [base[0] + x, base[1] - lift], planted, lift, phase: t,
        toeAngle: planted ? 0 : .20 * Math.sin(tau * u) };
}
export function solveKnee(hip, ankle, upper, lower) {
    const dx = ankle[0] - hip[0], dy = ankle[1] - hip[1], distance = Math.hypot(dx, dy);
    if (distance >= upper + lower || distance <= Math.abs(upper - lower)) throw new Error('Unreachable ankle');
    const a = (upper * upper - lower * lower + distance * distance) / (2 * distance);
    const h = Math.sqrt(Math.max(0, upper * upper - a * a));
    // Bend the knee toward the travel direction, never through the rear of the leg.
    return [hip[0] + dx * a / distance + dy * h / distance, hip[1] + dy * a / distance - dx * h / distance];
}
export const REST = Object.freeze({
    farHip: [84, 108], farKnee: [71, 140], farAnkle: [62, 167],
    nearHip: [99, 104], nearKnee: [115, 138], nearAnkle: [116, 165],
    farShoulder: [81, 42], farElbow: [64, 68], farWrist: [57, 96],
    nearShoulder: [120, 47], nearElbow: [120, 78], nearWrist: [135, 100],
});
const length = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export function poseAt(phase) {
    phase = wrap(phase);
    const bob = -.7 * Math.cos(phase * tau * 2), shift = p => [p[0], p[1] + bob];
    const near = footAt(phase), far = footAt(phase, .5, [85, 162]);
    const nearHip = shift([99, 108]), farHip = shift(REST.farHip);
    const nearKnee = solveKnee(nearHip, near.point, length(REST.nearHip, REST.nearKnee), length(REST.nearKnee, REST.nearAnkle));
    const farKnee = solveKnee(farHip, far.point, length(REST.farHip, REST.farKnee), length(REST.farKnee, REST.farAnkle));
    const arm = (side, angle) => {
        const shoulder = shift(REST[side + 'Shoulder']);
        const rotate = (p, o, a) => [o[0] + (p[0] - o[0]) * Math.cos(a) - (p[1] - o[1]) * Math.sin(a),
            o[1] + (p[0] - o[0]) * Math.sin(a) + (p[1] - o[1]) * Math.cos(a)];
        const elbow = rotate(shift(REST[side + 'Elbow']), shoulder, angle);
        const wristVector = [REST[side + 'Wrist'][0] - REST[side + 'Elbow'][0], REST[side + 'Wrist'][1] - REST[side + 'Elbow'][1]];
        const wrist = rotate([elbow[0] + wristVector[0], elbow[1] + wristVector[1]], elbow, angle * .65);
        return { shoulder, elbow, wrist };
    };
    return { phase, bob, near, far, nearHip, farHip, nearKnee, farKnee,
        nearArm: arm('near', .055 * Math.sin(phase * tau - .25)), farArm: arm('far', -.055 * Math.sin(phase * tau - .25)) };
}
