import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {spellProfiles,evolutionLooks,resolveSpellLook} from './spell_profiles.mjs';
import {applyCastPose} from '../../motion/walk-reference-v1/cast_pose.mjs';
const catalog=readFileSync(new URL('../../../src/Wyrmforge.Domain/Spells/SpellCatalog.cs',import.meta.url),'utf8');
const actual=[...catalog.matchAll(/new\(SpellId\.(\w+),/g)].map(m=>m[1]);assert.deepEqual(Object.keys(spellProfiles).sort(),actual.sort());
const evolutions=readFileSync(new URL('../../../src/Wyrmforge.Domain/Spells/Evolutions/SpellEvolutionCatalog.cs',import.meta.url),'utf8');
const actualEvolutions=[...evolutions.matchAll(/new\(SpellEvolutionId\.(\w+), SpellId\.(\w+),/g)].map(m=>[m[1],m[2]]);
assert.equal(actualEvolutions.length,Object.keys(evolutionLooks).length);
for(const [id,spell] of actualEvolutions)assert.equal(evolutionLooks[id]?.[0],spell);
let maxLengthError=0,maxLegDelta=0,cases=0;
for(const state of ['cleaned','hurt','critical']){
 const data=JSON.parse(readFileSync(new URL(`../../motion/walk-reference-v1/mage-${state}-motion.json`,import.meta.url)));
 const before=JSON.stringify(data.frames);
 for(const spellId of actual)for(let rank=1;rank<=3;rank++)for(let i=0;i<32;i++)for(const seconds of [0,.07,.15,.3,.6,.7]){
  const look=resolveSpellLook({spellId,rank});assert.equal(look.releaseOffsetSeconds,0);
  const base=data.frames[i],pose=applyCastPose(base,data,{look,seconds});
  for(const [a,b] of data.bones){const length=f=>Math.hypot(...f[b].map((v,k)=>v-f[a][k]));maxLengthError=Math.max(maxLengthError,Math.abs(length(pose)-length(base)));}
  for(let j=0;j<11;j++)maxLegDelta=Math.max(maxLegDelta,Math.hypot(...pose[j].map((v,k)=>v-base[j][k])));
  assert(pose.flat().every(Number.isFinite));cases++;
 }
 assert.equal(JSON.stringify(data.frames),before,'Overlay must not mutate locomotion');
}
assert(maxLengthError<1e-8);assert.equal(maxLegDelta,0);
assert.throws(()=>resolveSpellLook({spellId:'FireBolt',evolutionId:'RiftSpear'}));
const report={spellIdentities:actual.length,evolutionIdentities:actualEvolutions.length,ranks:3,injuryStates:3,poseCases:cases,maxBoneLengthChangeMeters:maxLengthError,maxRootOrLegChangeMeters:maxLegDelta,releaseOffsetSeconds:0,sourceFramesUnmodified:true,scope:'Motion/effects art studies; gameplay not modified'};
writeFileSync(new URL('./validation.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(report);
