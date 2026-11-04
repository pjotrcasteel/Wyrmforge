#!/usr/bin/env node
// Integrity check for the *unapproved* six-by-six WyrmForge Wet Forest source-concept collection.
// No renderer imports and no approval promotion.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const base = join(projectRoot, 'user_handover_files/concepts/arena-v2/wet-forest/ground-materials/v1');
const manifest = JSON.parse(readFileSync(join(base, 'manifest.json'), 'utf8'));
const expectedFamilies = ['grass-moss', 'wet-mud', 'old-paving', 'trampled-earth', 'scorched-ground', 'marsh-wet-bank'];

assert.equal(manifest.schemaVersion, 1);
assert.equal(manifest.status, 'review-only-not-approved');
assert.deepEqual(manifest.families.map(f => f.id), expectedFamilies);
assert.equal(manifest.families.reduce((sum, f) => sum + f.variants.length, 0), 36);

// Verify physical image dimensions, not just a manifest claim and SHA-256.
// This intentionally does NOT certify seam continuity, material separation or owner approval.
function readWebpDimensions(data) {
    assert.ok(data.length >= 30, 'WebP is too short');
    assert.equal(data.toString('ascii', 0, 4), 'RIFF');
    assert.equal(data.toString('ascii', 8, 12), 'WEBP');
    assert.equal(data.readUInt32LE(4) + 8, data.length, 'Incorrect RIFF file length');

    for (let pos = 12; pos + 8 <= data.length;) {
        const kind = data.toString('ascii', pos, pos + 4);
        const size = data.readUInt32LE(pos + 4);
        const start = pos + 8;
        assert.ok(start + size <= data.length, 'Truncated WebP chunk');

        if (kind === 'VP8X' && size >= 10) {
            return [1 + data.readUIntLE(start + 4, 3), 1 + data.readUIntLE(start + 7, 3)];
        }

        if (kind === 'VP8 ' && size >= 10) {
            assert.deepEqual([...data.subarray(start + 3, start + 6)], [0x9d, 0x01, 0x2a], 'Invalid VP8 header');
            return [data.readUInt16LE(start + 6) & 0x3fff, data.readUInt16LE(start + 8) & 0x3fff];
        }

        if (kind === 'VP8L' && size >= 5) {
            assert.equal(data[start], 0x2f, 'Invalid VP8L header');
            return [
                1 + data[start + 1] + ((data[start + 2] & 0x3f) << 8),
                1 + (data[start + 2] >> 6) + (data[start + 3] << 2) + ((data[start + 4] & 15) << 10),
            ];
        }

        pos = start + size + (size & 1);
    }

    assert.fail('Missing WebP image dimensions');
}

const seen = new Set();
for (const family of manifest.families) {
    assert.equal(family.variants.length, 6, family.id);
    for (let i = 0; i < 6; i++) {
        const asset = family.variants[i];
        const expected = `${family.id}/variant-${String(i + 1).padStart(2, '0')}.webp`;
        assert.equal(asset.file, expected);
        assert.equal(asset.id, `${family.id}-${String(i + 1).padStart(2, '0')}`);
        assert.equal(asset.approval, 'unreviewed');
        assert.equal(asset.seamless, false);
        assert.equal(asset.lightNeutral, false);
        assert.ok(!seen.has(asset.file));
        seen.add(asset.file);
        assert.match(asset.sourcePngSha256, /^[a-f0-9]{64}$/);
        assert.ok(Array.isArray(asset.size) && asset.size.length === 2);
        assert.ok(asset.size.every(n => Number.isInteger(n) && n >= 128));
        const data = readFileSync(join(base, asset.file));
        assert.equal(data.toString('ascii', 0, 4), 'RIFF');
        assert.equal(data.toString('ascii', 8, 12), 'WEBP');
        assert.equal(createHash('sha256').update(data).digest('hex'), asset.sha256);
        assert.deepEqual(readWebpDimensions(data), asset.size, `${asset.file}: dimensions differ from manifest`);
    }
}
console.log('PASS: 6 families × 6 source-concept WebP images, with verified bytes, dimensions and checksums; no seamlessness or art approval implied.');
