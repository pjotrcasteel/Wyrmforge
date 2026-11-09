// Art-backed Ancient Waygate. C# controls whether the exit is unlocked.
// Sprite is cached once; animation uses only lightweight canvas primitives.
const TAU = Math.PI * 2;
let sprite = null;
if (typeof Image !== 'undefined') {
    sprite = new Image();
    sprite.decoding = 'async';
    sprite.src = new URL('../art/ancient-waygate.svg', import.meta.url).href;
}
export function drawAncientWaygate(ctx, exit, elapsedSeconds = 0, locked = false) {
    if (!exit) return;
    const t = Number.isFinite(elapsedSeconds) ? elapsedSeconds : 0;
    ctx.save();
    ctx.translate(Math.round(exit.x), Math.round(exit.y));
    ctx.fillStyle = 'rgba(2,5,5,.55)';
    ctx.beginPath();
    ctx.ellipse(0, 31, 64, 15, 0, 0, TAU);
    ctx.fill();
    // The opening is physically empty while sealed. Only a completed hunt
    // reveals the ember-gold passage. No purple light is baked into the stone.
    if (!locked) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(-29, 30);
        ctx.lineTo(-29, -52);
        ctx.quadraticCurveTo(-29, -93, 0, -93);
        ctx.quadraticCurveTo(29, -93, 29, -52);
        ctx.lineTo(29, 30);
        ctx.closePath();
        ctx.clip();
        ctx.fillStyle = '#23170d';
        ctx.fillRect(-30, -95, 60, 130);
        for (let i = 0; i < 7; i++) {
            const phase = t * .65 + i * .9;
            ctx.strokeStyle = i % 2 ? 'rgba(251,176,77,.46)' : 'rgba(255,220,139,.38)';
            ctx.lineWidth = i % 3 === 0 ? 4 : 2;
            ctx.beginPath();
            ctx.ellipse(Math.sin(phase) * 5, -25 + Math.cos(phase * .7) * 4,
                8 + i * 4, 16 + i * 7, phase * .08, 0, TAU);
            ctx.stroke();
        }
        ctx.restore();
    }
    if (sprite?.complete && sprite.naturalWidth > 0) {
        ctx.drawImage(sprite, -80, -140, 160, 180);
    } else {
        // Minimal fallback until the authored sprite finishes loading.
        ctx.strokeStyle = '#55594f';
        ctx.lineWidth = 23;
        ctx.beginPath();
        ctx.moveTo(-40, 30);
        ctx.lineTo(-40, -53);
        ctx.quadraticCurveTo(-40, -110, 0, -110);
        ctx.quadraticCurveTo(40, -110, 40, -53);
        ctx.lineTo(40, 30);
        ctx.stroke();
    }
    if (!locked) {
        // Subtle threshold, not an expensive dynamic light source.
        ctx.fillStyle = 'rgba(244,166,72,.4)';
        ctx.fillRect(-25, 29, 50, 3);
    }
    ctx.restore();
}
