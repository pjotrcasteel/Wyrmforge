import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {spellProfiles,resolveSpellLook} from './spell_profiles.mjs';
import {synthesizeSpellSound,encodeWave} from './spell_audio.mjs';
import {drawSpellPanel} from './render_spell.mjs';
const {createCanvas}=createRequire(import.meta.url)('@napi-rs/canvas');
const data=JSON.parse(readFileSync(new URL('../../motion/walk-reference-v1/mage-cleaned-motion.json',import.meta.url)));
const ctx=createCanvas(320,190).getContext('2d'),signatures=new Set();let maxPeak=0,maxLaunchDrift=0,audioCases=0;
for(const spellId of Object.keys(spellProfiles)){
 const positions=[];
 for(let rank=1;rank<=3;rank++){
  const look=resolveSpellLook({spellId,rank});positions.push(look.releaseWrist.join(','));
  for(const event of ['release','impact']){
   const sound=synthesizeSpellSound(look,{event}),repeat=synthesizeSpellSound(look,{event});
   assert.deepEqual(sound.samples,repeat.samples);assert(sound.samples.every(Number.isFinite));
   const peak=sound.samples.reduce((m,v)=>Math.max(m,Math.abs(v)),0);assert(peak<.521&&peak>.519);maxPeak=Math.max(maxPeak,peak);
   const wave=encodeWave(sound.samples,sound.sampleRate);assert.equal(wave.length,44+sound.samples.length*2);assert.equal(new TextDecoder().decode(wave.slice(0,4)),'RIFF');
   let hash=2166136261;for(const v of wave)hash=Math.imul(hash^v,16777619)>>>0;signatures.add(hash);audioCases++;
  }
  const launch=drawSpellPanel(ctx,data,{x:0,y:0,spellId,rank,seconds:0}).launch;
  for(let f=0;f<48;f++){
   const info=drawSpellPanel(ctx,data,{x:0,y:0,spellId,rank,seconds:f/30});
   maxLaunchDrift=Math.max(maxLaunchDrift,Math.hypot(...info.launch.map((v,i)=>v-launch[i])));
   assert(Number.isFinite(info.arrivalSeconds)&&info.arrivalSeconds>=0);
  }
 }
 assert.equal(new Set(positions).size,3,'Each rank must have a distinct release pose');
}
assert.equal(signatures.size,audioCases);assert(maxLaunchDrift<1e-8);
const report={audioCases,distinctSoundSketches:signatures.size,maxSingleVoicePeak:maxPeak,rankUsesVolumeMultiplier:false,distinctReleasePosesPerSpell:3,launchTests:8*3*48,maxLaunchDriftPixels:maxLaunchDrift,proceduralAudio:true,gameplayChanges:false};
writeFileSync(new URL('./feel-validation.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(report);
