import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
    allFireballRecipes, requiredFireballRoles, validateFireballArtManifest,
    inspectFireballLineage, FIREBALL_MATERIAL_CHANNELS, FIREBALL_MUTATIONS,
} from '../../tools/art/fireball/authoring-contract.mjs';

const manifest = JSON.parse(readFileSync(
    new URL('../../art/source/spells/fireball/manifest.json', import.meta.url), 'utf8'));
const mechanicalEnum = readFileSync(
    new URL('../../src/Wyrmforge.Domain/Progression/Signature/FireballCoreState.cs', import.meta.url), 'utf8');
const source = (role) => ({
    sheet: `art/source/spells/fireball/${role}/source.aseprite`, frames: 8,
    anchor: [48, 48], worldSize: 32, reviewStatus: 'approved',
    channels: Object.fromEntries(FIREBALL_MATERIAL_CHANNELS.map(c =>
        [c, `art/source/spells/fireball/${role}/${c}.png`])),
});

test('art-role mask bits match C# FireballMutationId, never a second playable catalog', () => {
    const mechanicalValues = {
        meteorHeart: ['MeteorHeart', 1], detonation: ['Detonation', 2],
        scorchedEarth: ['ScorchedEarth', 3], cinderNeedle: ['CinderNeedle', 4],
    };
    for (const [name, [domainName, id]] of Object.entries(mechanicalValues)) {
        assert.match(mechanicalEnum, new RegExp(`\\b${domainName}\\s*=\\s*${id}\\b`));
        const expectedMask = 1 << (id - 1);
        assert.equal(FIREBALL_MUTATIONS[name], expectedMask,
            `${name} must follow the C# enum instead of authoring a new gameplay ID`);
    }
});

test('all 16 masks require deterministic roles, with no invented extra spell', () => {
    const recipes = allFireballRecipes();
    assert.equal(recipes.length, 16);
    assert.deepEqual(recipes.map(x => x.mask), Array.from({length: 16}, (_, i) => i));
    assert.deepEqual(requiredFireballRoles(0).flight, ['core-original']);
    assert.deepEqual(requiredFireballRoles(1).flight, ['core-meteor']);
    assert.deepEqual(requiredFireballRoles(8).flight, ['core-needle']);
    assert.deepEqual(requiredFireballRoles(9).flight, ['core-meteor-needle']);
    assert.deepEqual(requiredFireballRoles(7).impact,
        ['impact-original', 'impact-detonation-fragments']);
    assert.deepEqual(requiredFireballRoles(7).aftermath, ['material-char-and-flame']);
    assert.deepEqual(requiredFireballRoles(3).aftermath, []);
    assert.throws(() => requiredFireballRoles(16), RangeError);
});

test('production validation REJECTS current unapproved source manifest', () => {
    assert.equal(manifest.status, 'awaiting-authored-source');
    assert.throws(() => validateFireballArtManifest(manifest, () => true), /owner visual approval/);
});

test('production gate requires all authored roles with real five-channel assets', () => {
    const all = allFireballRecipes();
    const roles = [...new Set(all.flatMap(x => Object.values(x.required).flat()))];
    const approved = {...manifest, status:'owner-approved',
        assets: Object.fromEntries(roles.map(r => [r,source(r)]))};
    assert.deepEqual(validateFireballArtManifest(approved, () => true),
        {validatedRoles: roles.length, combinations: 16});
    delete approved.assets['core-meteor-needle'].channels.normal;
    assert.throws(() => validateFireballArtManifest(approved, () => true), /normal/);
    approved.assets['core-meteor-needle']=source('core-meteor-needle');
    assert.throws(() => validateFireballArtManifest(approved, p => !p.endsWith('/cutout.png')), /cutout/);
    approved.assets['core-meteor-needle'].reviewStatus='unreviewed';
    assert.throws(() => validateFireballArtManifest(approved, () => true), /not owner-reviewed/);
});

test('cast and physical source ownership use actual C# events, no virtual hazards', () => {
    const snapshot = {castMotion:{spell:1, fireballMutationMask:7},
        projectiles:[{spell:1,fireballSourceId:1,fireballMutationMask:7}],
        elementalImpacts:[{spell:1,fireballSourceId:2,fireballMutationMask:3,splashRadius:46}],
        burningGrounds:[{fireballSourceId:2,fireballMutationMask:3,radius:68,remainingSeconds:1}]};
    const result = inspectFireballLineage(snapshot);
    assert.equal(result.cast.sourceId,null);
    assert.equal(result.flight[0].sourceId,1);
    assert.equal(result.impact[0].actualSplashRadius,46);
    assert.equal(result.aftermath[0].sourceId,2);
    assert.equal(result.aftermath.length,1);
    assert.deepEqual(inspectFireballLineage({}), {cast:null,flight:[],impact:[],aftermath:[]});
});

test('reject an impossible mutation switch on the same physical projectile', () => {
    assert.throws(() => inspectFireballLineage({projectiles:[
        {spell:1,fireballSourceId:1,fireballMutationMask:7}],
        elementalImpacts:[{spell:1,fireballSourceId:1,fireballMutationMask:1}]}),
        /conflicting mutation/);
    assert.throws(() => inspectFireballLineage({burningGrounds:[
        {fireballSourceId:4,fireballMutationMask:4,radius:68,remainingSeconds:0}]}),
        /Expired/);
    assert.throws(() => inspectFireballLineage({projectiles:[
        {spell:1,fireballSourceId:0,fireballMutationMask:7}]}),
        /no source identity/);
});
