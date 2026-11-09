// Presentation-only anchors in the Wizard's 48x48 authored sprite coordinates.
// Origin is the 24,44 front-foot root; these are initial direction-specific
// placements and can be refined against individual Aseprite frames.
// The hand and crystal are distinct: spells leave the hand, not the staff.
const anchors = {
    E:  { hand: [13, -22], crystal: [16, -35] },
    SE: { hand: [11, -20], crystal: [14, -34] },
    S:  { hand: [8, -19], crystal: [5, -34] },
    SW: { hand: [-10, -20], crystal: [-13, -34] },
    W:  { hand: [-13, -22], crystal: [-16, -35] },
    NW: { hand: [-10, -23], crystal: [-13, -36] },
    N:  { hand: [-7, -23], crystal: [-10, -37] },
    NE: { hand: [10, -23], crystal: [13, -36] },
};

export function wizardAnchor(direction, kind, action = 'idle', frame = 0) {
    const anchor = anchors[direction] ?? anchors.S;
    const [x, y] = anchor[kind] ?? anchor.hand;
    // Until the individual sprite-frame coordinates are calibrated, do not
    // invent frame-dependent bobbing. That made the crystal and launch point
    // drift independently from the authored animation.
    return { x, y };
}

export function wizardAnchorWorld(player, wizard, kind, scale = 7 / 6) {
    const anchor = wizardAnchor(wizard.direction, kind, wizard.action, wizard.frame);
    // Wizard feet are at player.y + 12; authored root is 24,44.
    return { x: Math.round(player.x + anchor.x * scale),
        y: Math.round(player.y + 12 + anchor.y * scale) };
}
