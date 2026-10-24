import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/character-reset.js', import.meta.url), 'utf8');
const { resetCharacter } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
function storage(entries) {
    const values = new Map(entries.map(key => [key, 'saved']));
    return { get length() { return values.size; }, key:i => [...values.keys()][i], removeItem:key => values.delete(key), values };
}
test('debug reset removes all game namespaces including unknown future saves in both stores', () => {
    const keys = ['wyrmforge.firstHunt.v1','wyrmforge.arcaneBuild.v1','wyrmforge.characterSchool.v1','wyrmforge.player-name.v1',
        'wyrmforge_player_name','wyrmforge.huntMaterials.v1','wyrmforge.world.v1','wyrmforge.chronicles.v1',
        'wyrmforge.future-feature.v99','wyrmforge.audio.enabled.v1','wyrmforge.playtest.pendingReceipt.v1'];
    const local = storage(keys), session = storage(['wyrmforge.debug.v1','wyrmforge-session']);
    resetCharacter(local, session);
    assert.equal(local.length, 0);
    assert.equal(session.length, 0);
    resetCharacter(local, session);
    assert.equal(local.length, 0);
});
test('reset leaves other GitHub Pages games and similarly named unrelated keys intact', () => {
    const local = storage(['wyrmforge.arcaneBuild.v1','planetforge.save','forge.settings','wyrmforged.other','unrelated']);
    const session = storage(['wyrmforge.playtest.v1','planetforge.session']);
    resetCharacter(local, session);
    assert.deepEqual([...local.values.keys()], ['planetforge.save','forge.settings','wyrmforged.other','unrelated']);
    assert.deepEqual([...session.values.keys()], ['planetforge.session']);
});
