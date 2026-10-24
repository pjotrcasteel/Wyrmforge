import test from 'node:test';
import assert from 'node:assert/strict';
import {
    fireballSequencePhase, drawFireballSequenceFrame, syncFireballSequencePreview,
} from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/fireball-preview.js';

function fakeCanvas() {
    let fills = 0, strokes = 0;
    const ctx = {
        save() {}, restore() {}, scale() {}, translate() {}, clearRect() {},
        beginPath() {}, moveTo() {}, lineTo() {},
        fillRect() { fills++; }, stroke() { strokes++; },
    };
    return {
        width: 320, height: 160, dataset: {}, getContext: () => ctx,
        get fills() { return fills; }, get strokes() { return strokes; },
    };
}
const recipe = mutationMask => ({
    version: 1, level: 3, mutationMask, coreShape: mutationMask & 1 ? 'meteor' : 'flame',
    detonation: Boolean(mutationMask & 2), scorchedEarth: Boolean(mutationMask & 4),
    cacheKey: `fireball-v1-l3-m${mutationMask.toString(16)}`,
});

test('illustrative sequence has deterministic cast, travel, impact and aftermath boundaries', () => {
    assert.deepEqual([0, .2, .55, .73, 1].map(time => fireballSequencePhase(time).name),
        ['Cast', 'Travel', 'Impact', 'Aftermath', 'Aftermath']);
    assert.equal(fireballSequencePhase(-1).name, 'Cast');
    assert.equal(fireballSequencePhase(Infinity).name, 'Cast');
});

test('each frame uses the shared Fireball morphology without generating combat events', () => {
    const canvas = fakeCanvas();
    const recipeForHunt = recipe(7);
    for (const [at, expected] of [[.1, 'Cast'], [.3, 'Travel'], [.6, 'Impact'], [.9, 'Aftermath']]) {
        assert.equal(drawFireballSequenceFrame(canvas, recipeForHunt, at), expected);
        assert.equal(canvas.dataset.phase, expected);
    }
    assert.ok(canvas.fills > 0 && canvas.strokes > 0);
    syncFireballSequencePreview(canvas, recipeForHunt);
    assert.equal(canvas.dataset.phase, 'Ready');
});

test('afterlife visuals require Scorched Earth even inside the illustrative preview', () => {
    const plain = fakeCanvas(), scorched = fakeCanvas();
    drawFireballSequenceFrame(plain, recipe(3), .9);
    drawFireballSequenceFrame(scorched, recipe(7), .9);
    assert.equal(plain.strokes, 0);
    assert.ok(scorched.strokes > 0);
});

test('Nexus compositor respects reduced motion without changing the visual recipe', () => {
    const canvas = fakeCanvas();
    assert.doesNotThrow(() => drawFireballSequenceFrame(canvas, recipe(11), .62, true));
    assert.equal(canvas.dataset.phase, 'Impact');
});
