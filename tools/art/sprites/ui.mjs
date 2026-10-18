// UI pixel icons (16x16) and the hub backdrop scene.
import { Bitmap, mix, rng, hex } from '../lib/painter.mjs';

const OUT = '#0c0a10';

function icon(draw) {
    const b = new Bitmap(16, 16);
    draw(b);
    b.outline(OUT);
    return b;
}

export function icons() {
    return {
        'icon.arcane': icon(b => { b.poly([[8, 1], [13, 8], [8, 15], [3, 8]], '#7a52c4'); b.poly([[8, 1], [3, 8], [8, 8]], '#b98cff'); b.ellipse(8, 8, 2, 2, '#f1dcff'); }),
        'icon.fire': icon(b => { b.poly([[8, 1], [12, 7], [13, 11], [10, 15], [6, 15], [3, 11], [5, 6], [7, 8]], '#d4502a'); b.poly([[8, 6], [10, 10], [9, 14], [7, 14], [6, 11]], '#ffb347'); b.set(8, 12, '#fff1c0'); }),
        'icon.frost': icon(b => { for (const [x0, y0, x1, y1] of [[8, 1, 8, 15], [2, 4, 14, 12], [2, 12, 14, 4]]) b.line(x0, y0, x1, y1, '#9fdcf0', 2); b.ellipse(8, 8, 2, 2, '#effbff'); }),
        'icon.storm': icon(b => { b.poly([[10, 1], [4, 9], [8, 9], [6, 15], [12, 6], [8, 6]], '#f2e06a'); b.line(9, 2, 6, 7, '#fff8c8'); }),
        'icon.heart': icon(b => { b.ellipse(5, 6, 3.5, 3.5, '#b8343c'); b.ellipse(11, 6, 3.5, 3.5, '#b8343c'); b.poly([[1.5, 7], [14.5, 7], [8, 14]], '#b8343c'); b.rect(4, 4, 2, 2, '#f08a8a'); }),
        'icon.shield': icon(b => { b.poly([[2, 2], [14, 2], [14, 8], [8, 15], [2, 8]], '#5e738b'); b.poly([[2, 2], [8, 2], [8, 15], [2, 8]], '#8ba3bb'); b.line(8, 4, 8, 12, '#c8c6b8'); }),
        'icon.skull': icon(b => { b.ellipse(8, 7, 6, 5.5, '#d6cfb9'); b.rect(5, 11, 6, 3, '#d6cfb9'); b.rect(4, 6, 3, 3, '#1c1714'); b.rect(9, 6, 3, 3, '#1c1714'); b.set(8, 10, '#1c1714'); b.set(6, 13, '#8a826e'); b.set(9, 13, '#8a826e'); }),
        'icon.crystal': icon(b => { b.poly([[8, 1], [13, 7], [8, 15], [3, 7]], '#a878e0'); b.poly([[8, 1], [3, 7], [8, 9]], '#e4caff'); b.poly([[8, 15], [13, 7], [8, 9]], '#5a3a8e'); }),
        'icon.map': icon(b => { b.poly([[1, 3], [6, 1], [10, 3], [15, 1], [15, 13], [10, 15], [6, 13], [1, 15]], '#b8a27a'); b.line(6, 1, 6, 13, '#7d6a4c'); b.line(10, 3, 10, 15, '#7d6a4c'); b.line(3, 11, 8, 7, '#7a3a2e'); b.line(8, 7, 13, 5, '#7a3a2e'); b.set(13, 5, '#c43a2a'); }),
        'icon.anvil': icon(b => { b.poly([[1, 4], [14, 4], [14, 7], [11, 8], [10, 11], [6, 11], [5, 8], [3, 7]], '#6f767b'); b.rect(1, 4, 13, 1, '#b8c0c2'); b.rect(4, 12, 8, 3, '#3e4346'); b.set(8, 2, '#ff9a4a'); b.set(10, 1, '#ffd27a'); }),
        'icon.book': icon(b => { b.rect(2, 2, 12, 12, '#5c3a2c'); b.rect(3, 3, 10, 10, '#7a4b38'); b.rect(12, 2, 2, 12, '#d6cfb9'); b.poly([[8, 5], [10, 8], [8, 11], [6, 8]], '#c9a85a'); }),
        'icon.flask': icon(b => { b.rect(6, 1, 4, 1, '#b8c0c2'); b.rect(6, 2, 4, 4, '#9fb4c6'); b.poly([[6, 6], [10, 6], [14, 13], [12, 15], [4, 15], [2, 13]], '#9fb4c6'); b.poly([[4, 10], [12, 10], [14, 13], [12, 15], [4, 15], [2, 13]], '#5aa8d8'); b.poly([[8, 10], [12, 10], [14, 13], [12, 15], [8, 15]], '#e0702e'); b.set(6, 12, '#effbff'); b.set(11, 12, '#ffd27a'); b.set(7, 4, '#effbff'); }),
        'icon.crown': icon(b => { b.poly([[1, 5], [5, 9], [8, 3], [11, 9], [15, 5], [13, 13], [3, 13]], '#d8b45a'); b.rect(3, 12, 10, 1, '#8e6a26'); b.set(8, 8, '#c43a2a'); b.set(5, 11, '#5aa8d8'); b.set(11, 11, '#5aa8d8'); }),
        'icon.sword': icon(b => { b.line(3, 13, 12, 4, '#c9cfd2', 2); b.line(12, 3, 14, 1, '#eef2f2'); b.line(3, 9, 7, 13, '#8e6a26', 2); b.rect(1, 13, 3, 2, '#5c3a2c'); }),
        'icon.wyrm': icon(b => { b.poly([[2, 3], [7, 6], [14, 6], [12, 10], [8, 14], [4, 10], [5, 7]], '#7a3326'); b.poly([[2, 3], [7, 6], [5, 7]], '#d6c4a2'); b.set(10, 8, '#ffd27a'); b.line(9, 12, 12, 13, '#d6c4a2'); }),
        'icon.chest': icon(b => { b.rect(2, 6, 12, 8, '#6b4a2c'); b.poly([[2, 6], [4, 2], [12, 2], [14, 6]], '#8a6038'); b.rect(2, 8, 12, 1, '#3a2716'); b.rect(7, 7, 2, 3, '#d8b45a'); }),
        'icon.campfire': icon(b => { b.line(3, 14, 13, 11, '#5c3a2c', 2); b.line(3, 11, 13, 14, '#4a2e22', 2); b.poly([[8, 2], [11, 8], [10, 12], [6, 12], [5, 8]], '#e0702e'); b.poly([[8, 6], [9, 10], [7, 10]], '#ffd27a'); }),
        'icon.lock': icon(b => { b.rect(3, 7, 10, 8, '#7d848a'); b.rect(3, 7, 10, 1, '#b8c0c2'); b.line(5, 7, 5, 3, '#9aa2a8', 2); b.line(11, 7, 11, 3, '#9aa2a8', 2); b.line(5, 2, 11, 2, '#9aa2a8', 2); b.rect(7, 10, 2, 3, '#1c1d22'); }),
        'icon.star': icon(b => { b.poly([[8, 1], [10, 6], [15, 6], [11, 9], [13, 15], [8, 11], [3, 15], [5, 9], [1, 6], [6, 6]], '#d8b45a'); b.poly([[8, 1], [6, 6], [8, 8]], '#fff2c0'); }),
        'icon.rune': icon(b => { b.rect(2, 2, 12, 12, '#2b2e2e'); b.rect(2, 2, 12, 1, '#5a5f5c'); b.line(8, 4, 8, 12, '#c48aff'); b.line(5, 6, 11, 9, '#c48aff'); b.line(5, 9, 8, 12, '#c48aff'); b.set(8, 7, '#ffffff'); }),
        'icon.hourglass': icon(b => { b.rect(3, 1, 10, 2, '#8e6a26'); b.rect(3, 13, 10, 2, '#8e6a26'); b.poly([[4, 3], [12, 3], [8, 8]], '#9fb4c6'); b.poly([[8, 8], [12, 13], [4, 13]], '#9fb4c6'); b.poly([[6, 11], [10, 11], [11, 13], [5, 13]], '#d8b45a'); }),
        'icon.gate': icon(b => { b.rect(2, 3, 3, 12, '#5a625c'); b.rect(11, 3, 3, 12, '#5a625c'); b.poly([[2, 4], [8, 0], [14, 4]], '#6b736b'); b.rect(5, 5, 6, 10, '#1a1420'); b.ellipse(8, 10, 2.5, 4, '#a878e0'); }),
        'icon.arrow': icon(b => { b.line(2, 14, 12, 4, '#c9cfd2', 2); b.poly([[14, 2], [14, 8], [8, 2]], '#eef2f2'); b.line(2, 11, 5, 14, '#8a6038', 2); }),
        'icon.wing': icon(b => { b.poly([[1, 13], [6, 4], [14, 1], [12, 6], [15, 7], [11, 10], [13, 12], [6, 14]], '#5c3a50'); b.line(6, 4, 4, 13, '#8e6080'); b.line(14, 1, 7, 12, '#8e6080'); b.line(15, 7, 8, 13, '#8e6080'); }),
        'icon.fang': icon(b => { b.poly([[3, 1], [13, 1], [12, 5], [9, 15], [7, 15], [4, 5]], '#e2dac2'); b.poly([[3, 1], [8, 1], [8, 15], [7, 15], [4, 5]], '#f8f2de'); b.rect(3, 1, 10, 2, '#a89e86'); }),
        'icon.wave': icon(b => { for (const [y, c] of [[4, '#9fdcf0'], [8, '#5aa8d8'], [12, '#3a6e9a']]) for (let x = 1; x < 15; x++) b.rect(x, y + Math.round(Math.sin(x * .9) * 1.4), 1, 2, c); }),
        'icon.cycle': icon(b => { for (let a = .5; a < 5.6; a += .12) b.rect(Math.round(8 + Math.cos(a) * 5.5), Math.round(8 + Math.sin(a) * 5.5), 2, 2, '#b98cff'); b.poly([[13, 1], [15, 6], [10, 5]], '#e4caff'); }),
        'icon.mage': icon(b => { b.ellipse(8, 5, 4, 4, '#576c84'); b.poly([[7, 0], [9, 0], [10, 3]], '#576c84'); b.ellipse(8, 6, 2, 2, '#1a202b'); b.poly([[4, 9], [12, 9], [13, 15], [3, 15]], '#485b73'); b.rect(4, 8, 8, 2, '#c8c6b8'); b.line(13, 2, 13, 15, '#766552'); }),
    };
}

// 480x270 hub backdrop. The city wall holds; its wards are failing, rain falls, the forest waits.
export function hubBackdrop() {
    const W = 480, H = 270, b = new Bitmap(W, H), r = rng(2026);
    const bay = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
    const sky = ['#07090d', '#0a0e14', '#0d131a', '#111921', '#152029', '#1a2731'];
    for (let y = 0; y < 170; y++) for (let x = 0; x < W; x++) {
        const t = y / 170 + (bay[y & 3][x & 3] / 16 - .5) * .12;
        b.set(x, y, sky[Math.max(0, Math.min(5, Math.floor(t * 6)))]);
    }
    // Moon glow muffled by cloud.
    for (let y = 10; y < 90; y++) for (let x = 40; x < 160; x++) {
        const d = Math.hypot(x - 98, (y - 44) * 1.2);
        if (d < 46 && ((x + y) & 1 || d < 30)) b.set(x, y, mix(b.get(x, y), '#3a4a5a', Math.max(0, .55 - d / 90)));
    }
    b.ellipse(98, 44, 9, 9, '#8f9fae'); b.ellipse(96, 42, 7, 7, '#b4c1cb');
    // Heavy cloud bands.
    for (let i = 0; i < 26; i++) {
        const x = r() * W, y = 18 + r() * 80, w = 30 + r() * 70, h = 4 + r() * 7;
        b.ellipse(x, y, w, h, i % 3 ? '#0e141b' : '#141c25');
        b.line(x - w * .6, y - h + 1, x + w * .4, y - h + 1, '#1f2a35');
    }
    // Distant mountains.
    let m = 120;
    for (let x = 0; x < W; x++) {
        m += (r() - .5) * 3 + Math.sin(x / 37) * .6; m = Math.max(96, Math.min(140, m));
        b.rect(x, Math.round(m), 1, 170 - Math.round(m), '#121a22');
        if (r() < .3) b.set(x, Math.round(m), '#1e2a35');
    }
    // Far tree line.
    for (let x = -4; x < W + 4; x += 3 + Math.floor(r() * 3)) {
        const h = 10 + r() * 16, base = 168;
        b.poly([[x, base - h], [x + 4, base], [x - 4, base]], '#0d1714');
    }
    b.rect(0, 166, W, 104, '#0b1210');
    // The protected city wall: squat round towers, flat crenellations, no spires.
    const wallTop = 124, wallBottom = 196, left = 150, right = 470;
    b.rect(left, wallTop, right - left, wallBottom - wallTop, '#2a3034');
    for (let y = wallTop + 4; y < wallBottom; y += 7) {
        b.rect(left, y, right - left, 1, '#1d2226');
        for (let x = left + ((y / 7) % 2 ? 0 : 6); x < right; x += 12) b.rect(x, y - 6, 1, 6, '#1d2226');
    }
    for (let x = left; x < right; x += 10) b.rect(x, wallTop - 6, 6, 6, '#2a3034');
    b.rect(left, wallTop, right - left, 1, '#4a545a');
    for (const tx of [176, 318, 452]) {
        b.rect(tx - 14, wallTop - 22, 28, wallBottom - wallTop + 22, '#30373b');
        b.rect(tx - 14, wallTop - 22, 6, wallBottom - wallTop + 22, '#3a4247');
        b.rect(tx + 8, wallTop - 22, 6, wallBottom - wallTop + 22, '#252b2f');
        for (let x = tx - 14; x < tx + 14; x += 8) b.rect(x, wallTop - 28, 5, 6, '#30373b');
        b.rect(tx - 2, wallTop - 10, 4, 7, '#d8a24a'); b.set(tx - 1, wallTop - 9, '#ffe2a0'); // lit arrow slit
    }
    // Gate: lantern-lit arch.
    const gx = 248;
    b.rect(gx - 20, wallTop + 10, 40, wallBottom - wallTop - 10, '#1a1714');
    b.ellipse(gx, wallTop + 12, 20, 12, '#1a1714');
    b.rect(gx - 16, wallTop + 14, 32, wallBottom - wallTop - 14, '#3a2a1a');
    for (let x = gx - 14; x < gx + 16; x += 6) b.rect(x, wallTop + 14, 2, wallBottom - wallTop - 14, '#20160e');
    for (const lx of [gx - 26, gx + 24]) { b.rect(lx, wallTop + 18, 3, 5, '#ffc46a'); b.ellipse(lx + 1, wallTop + 20, 8, 8, [255, 180, 90, 40]); }
    // Failing rune wards along the wall: some steady, some guttering.
    const runes = [[200, 150, 1], [226, 168, .3], [288, 146, .9], [356, 160, .2], [392, 142, .8], [424, 172, .45]];
    for (const [x, y, s] of runes) {
        const glow = mix('#2a3034', s > .6 ? '#c48aff' : '#7fd3e6', s);
        b.rect(x - 3, y - 4, 7, 9, '#22272a');
        b.line(x, y - 3, x, y + 3, glow); b.line(x - 2, y - 1, x + 2, y + 1, glow);
        if (s > .6) { b.ellipse(x, y, 7, 8, [196, 138, 255, 26]); b.set(x, y, '#ffffff'); }
        else b.line(x + 1, y + 4, x + 3, y + 10, mix('#2a3034', '#7fd3e6', .3)); // crack where the ward fails
    }
    // Wet road from the gate toward the viewer and the forest.
    b.poly([[gx - 16, wallBottom], [gx + 16, wallBottom], [gx + 120, H], [gx - 140, H]], '#1a1d1c');
    for (let i = 0; i < 40; i++) {
        const t = r(), x = gx + (r() - .5) * (32 + t * 240), y = wallBottom + t * (H - wallBottom);
        b.rect(Math.round(x), Math.round(y), 2 + Math.round(t * 4), 1, '#252a29');
    }
    for (let i = 0; i < 9; i++) { // puddles reflect the lanterns
        const t = .2 + r() * .8, x = gx + (r() - .5) * (40 + t * 180), y = wallBottom + t * (H - wallBottom);
        b.ellipse(x, y, 6 + t * 10, 1.5 + t * 2, '#121a20'); b.line(x - 3, y, x + 3, y, r() < .5 ? '#6b5a3a' : '#3a4a5a');
    }
    // Foreground forest masses framing left and right.
    const bigPine = (x, base, h, tone) => {
        b.rect(x - 2, base - 10, 4, 12, '#14100d');
        for (let t = 0; t < 7; t++) { const y0 = base - h + t * (h - 10) / 7, w = 5 + t * 4; b.poly([[x, y0], [x + w, y0 + 16], [x - w, y0 + 16]], t % 2 ? tone : mix(tone, '#000000', .25)); }
    };
    for (let i = 0; i < 9; i++) bigPine(10 + i * 16 + r() * 8, 250 + r() * 20, 90 + r() * 60, '#0f1d18');
    for (let i = 0; i < 3; i++) bigPine(452 + i * 12, 262, 110 + r() * 30, '#0e1a16');
    for (let x = 0; x < W; x++) { const y = 236 + Math.sin(x / 13) * 4 + r() * 3; if (x < 170 || x > 420) b.rect(x, Math.round(y), 1, H - Math.round(y), '#0a110e'); }
    // The hooded mage on the road, back to us, staff in hand, heading out to hunt.
    const mx = 232, my = 232;
    b.poly([[mx - 5, my - 6], [mx + 5, my - 6], [mx + 7, my + 12], [mx - 7, my + 12]], '#485b73');
    b.poly([[mx + 2, my - 6], [mx + 5, my - 6], [mx + 7, my + 12], [mx + 3, my + 12]], '#3a4b60');
    b.rect(mx - 6, my - 7, 12, 3, '#c8c6b8');
    b.ellipse(mx, my - 11, 4.5, 5, '#576c84'); b.poly([[mx - 1, my - 15], [mx + 1, my - 19], [mx + 3, my - 14]], '#576c84');
    b.line(mx + 8, my - 22, mx + 9, my + 13, '#766552'); b.rect(mx + 7, my - 24, 3, 3, '#b4afa0'); b.set(mx + 8, my - 23, '#9fe6ff');
    b.rect(mx - 5, my + 12, 3, 2, '#161b24'); b.rect(mx + 2, my + 12, 3, 2, '#161b24');
    b.ellipse(mx, my + 14, 9, 2, [0, 0, 0, 120]);
    // Static rain streaks (animated rain is layered in CSS).
    for (let i = 0; i < 520; i++) {
        const x = r() * W, y = r() * H, l = 3 + r() * 5;
        b.line(x, y, x - 1, y + l, [150, 175, 195, 40 + Math.floor(r() * 40)]);
    }
    // Ground mist.
    for (let y = 190; y < 240; y++) for (let x = 0; x < W; x++) if (((x * 7 + y * 13) % 11) === 0) b.set(x, y, [120, 140, 150, 18]);
    return b;
}

export const ICON_SCALE_HINT = 2;
export { hex };
