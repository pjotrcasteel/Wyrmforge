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
    }
}
console.log('PASS: 6 families × 6 full-resolution source-concept WebP images, with exact checksums; no art approval implied.');
