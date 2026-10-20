import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const root = process.cwd();
const source = path => readFileSync(join(root, path), 'utf8');

test('roaming NPCs are attached to the actual nighttime Refuge and do not interfere with town input', () => {
    const scene = source('src/Wyrmforge.Presentation.Web/Features/Forge/CanonicalTownView.razor');
    const css = source('src/Wyrmforge.Presentation.Web/wwwroot/css/town-canonical.css');
    assert.match(scene, /<div class="refuge-town-crowd" aria-hidden="true">/);
    assert.match(scene, /@foreach \(var person in crowd\.Citizens\)/);
    assert.match(scene, /style="@CitizenStyle\(person\)"/);
    assert.match(css, /\.refuge-town-crowd\s*\{[^}]*pointer-events:none/s);
    assert.match(css, /\.refuge-town-citizen\s*\{[^}]*pointer-events:none/s);
    assert.match(css, /\.refuge-town-spot \{z-index:3\}/);
    assert.match(css, /prefers-reduced-motion:reduce/);
    assert.match(scene, /@implements IDisposable/);
    assert.match(scene, /crowdStop\.Cancel\(\)/);
    assert.ok(scene.includes('art/town/night-active.webp?v=140'), 'Do not replace the approved night art');
});

test('citizen decisions live in a seeded C# street graph, not random JS movement or image overlays', () => {
    const simulation = source('src/Wyrmforge.Application/World/TownCrowd.cs');
    assert.match(simulation, /public sealed class TownCrowd/);
    assert.match(simulation, /private static readonly Waypoint\[\] Streets/);
    assert.match(simulation, /private void ChooseNextStop\(TownCitizen citizen\)/);
    assert.match(simulation, /citizen\.DestinationNode = choices\[NextInt\(choices\.Length\)\]/);
    assert.match(simulation, /Math\.Clamp\(elapsed\.TotalSeconds, 0d, \.1d\)/);
    assert.doesNotMatch(simulation, /Random\.Shared|DateTime|RandomNumberGenerator/);
});
