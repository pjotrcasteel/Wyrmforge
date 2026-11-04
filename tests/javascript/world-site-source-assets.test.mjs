import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const root = new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/art/terrain/wf32/p1i/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('source-manifest.json', root), 'utf8'));

test('AR4-A2 native WF32 asset manifest preserves original art provenance and full-site dimensions', () => {
    assert.equal(manifest.schema, 'wf32-ar4a-p1i-source.v1');
    assert.equal(manifest.artSourceBlobSha, 'abb7eba117547fc36e14aec3c52119e3ea9bdfec');
    assert.equal(manifest.sourceFunction, 'worldSoftPixel');
    assert.equal(manifest.sourceSeed, 1387);
    assert.equal(manifest.nativeCellPixels, 32);
    assert.deepEqual(manifest.fullWorldPixels, { width: 1024, height: 1568 });
    assert.deepEqual(Object.keys(manifest.materialFamilies).sort(), ['grass', 'mud', 'soil']);
});

for (const [material, windows] of Object.entries(manifest.materialFamilies)) {
    test(`AR4-A2 ${material}: original source bands are real PNGs with exact SHA, 32px alignment and continuous world origin`, () => {
        assert.equal(windows.length, 2);
        assert.deepEqual(windows.map(window => [window.originY, window.height]), [[0, 800], [800, 768]]);
        for (const window of windows) {
            const png = readFileSync(new URL(window.path, root));
            assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
            assert.equal(png.readUInt32BE(16), window.width);
            assert.equal(png.readUInt32BE(20), window.height);
            assert.equal(window.originX % 32, 0);
            assert.equal(window.originY % 32, 0);
            assert.equal(window.width % 32, 0);
            assert.equal(window.height % 32, 0);
            const gitBlob = createHash('sha1').update(`blob ${png.length}\0`).update(png).digest('hex');
            assert.equal(gitBlob, window.gitBlobSha, 'original source bytes changed unexpectedly');
        }
    });
}
