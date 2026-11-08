// The renderer is shared, but the C# Frame contract differs by host:
// Enemy/Wyrm Labs: 9 arguments. Production Hunt: 10 (reduced-motion flag).
// Only the production shell explicitly enables the Hunt entry gate. Do not
// send its extra argument to labs: Blazor JSInvokable rejects extra arguments,
// stopping the encounter before player and enemies ever spawn.
export function arenaFrameArguments(delta, width, height, movement, aim, focusPropId,
    stickSnap, reducedMotion, huntEntryLoading) {
    const args = [delta, width, height, movement.x, movement.y, aim.x, aim.y, focusPropId, stickSnap];
    if (huntEntryLoading) args.push(reducedMotion);
    return args;
}
