#!/usr/bin/env node
// Manual release gate, NOT a game renderer and intentionally NOT part of CI
// until owner-approved animation sources exist.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { validateFireballArtManifest } from './authoring-contract.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const manifestPath = resolve(root, 'art/source/spells/fireball/manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

try {
    const result = validateFireballArtManifest(manifest, file => existsSync(resolve(root, file)));
    console.log(`Fireball art approved and complete: ${result.validatedRoles} source roles; ${result.combinations} combinations.`);
} catch (error) {
    console.error('Fireball art is NOT ready for production:', error.message);
    console.error('Original in-game artwork and the universal lighting PR remain untouched.');
    process.exitCode = 1;
}
