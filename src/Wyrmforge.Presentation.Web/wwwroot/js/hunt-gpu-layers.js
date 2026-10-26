// Stable presentation resources derived from existing authoritative scene records.
export function huntLayerCapture(layer, player, dragonDeath = null) {
    let actor, id, size;
    if (layer.kind === 'masonry' && layer.prop) {
        const p = layer.prop;
        actor = { x: p.x * layer.width, y: p.y * layer.height, radius: p.radius };
        id = `prop:${p.id}`;
        size = Math.max(160, Math.min(768, (p.radius || 20) * 12));
    } else if (layer.kind === 'masonry' && layer.barrier) {
        const b = layer.barrier;
        actor = { x: (b.x + b.width / 2) * layer.width, y: layer.depth + 6 };
        id = `wall:${b.kind}:${b.x}:${b.y}:${b.width}:${b.height}`;
        size = Math.max(160, b.width * layer.width + 64, b.height * layer.height + 96);
    } else {
        actor = layer.enemy ?? layer.dragon ?? (layer.kind === 'dragonDeath' ? dragonDeath : player);
        if (!actor) return null;
        id = `${layer.kind}:${actor.entityId ?? actor.id ?? 'primary'}`;
        size = Math.max(160, Math.min(768, (actor.radius || 20) * 12));
    }
    return { id: 'hunt-' + id, x: actor.x - size / 2, y: actor.y - size * .75, size };
}
