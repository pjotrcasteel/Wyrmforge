// Presentation identities are keyed by spell, so one school can own many spells.
export const spellProfiles = {
 ArcaneOrb:{school:'Arcane',gesture:'compress',shape:'orb',color:'#ba92ed',highlight:'#ead8ff',recoilDegrees:3,releaseWrist:[-.06,-.13,.30],ranks:['Bound core','Piercing wake','Heavy phase core']},
 FireBolt:{school:'Fire',gesture:'thrust',shape:'flame',color:'#e86d32',highlight:'#ffe0a1',recoilDegrees:8,releaseWrist:[-.02,-.12,.40],ranks:['Hot coal','Compressed flame','Blast impact']},
 FrostShard:{school:'Frost',gesture:'cut',shape:'shard',color:'#8ad2df',highlight:'#e8fcff',recoilDegrees:4,releaseWrist:[-.03,-.08,.41],ranks:['Sharp sliver','Dense crystal','Freezing fracture']},
 ChainLightning:{school:'Storm',gesture:'conduct',shape:'chain',color:'#d9cd69',highlight:'#fff8d5',recoilDegrees:6,releaseWrist:[-.02,.09,.30],ranks:['Two-target arc','Longer chain','Forked discharge']},
 CinderNeedle:{school:'Fire',gesture:'flick',shape:'needle',color:'#e7914c',highlight:'#ffdaa0',recoilDegrees:2,releaseWrist:[-.05,-.15,.32],ranks:['Ember needle','Searing filament','Dense burning core']},
 IceLance:{school:'Frost',gesture:'spear',shape:'lance',color:'#74abbf',highlight:'#d0f3fa',recoilDegrees:7,releaseWrist:[-.02,-.20,.43],ranks:['Ice spear','Weighted spear','Deep frozen core']},
 BallLightning:{school:'Storm',gesture:'pulse',shape:'ball',color:'#c4bf74',highlight:'#fff7c6',recoilDegrees:5,releaseWrist:[-.10,-.05,.29],ranks:['Volatile knot','Coiled discharge','Dense storm knot']},
 AetherDart:{school:'Arcane',gesture:'mark',shape:'dart',color:'#a99cda',highlight:'#eee7ff',recoilDegrees:2,releaseWrist:[-.02,-.13,.36],ranks:['Phase dart','Etched wake','Resonant mark']},
};
export const evolutionLooks = {
 RiftSpear:['ArcaneOrb','phase-spear'],StarSwarm:['ArcaneOrb','three-stars'],VoidConstellation:['ArcaneOrb','void-stars'],
 MeteorHeart:['FireBolt','heavy-meteor'],PhoenixVolley:['FireBolt','ember-fan'],Wyrmfire:['FireBolt','wyrm-embers'],
 Shatterglass:['FrostShard','glass-nova'],WinterBloom:['FrostShard','three-crystals'],GlacialRequiem:['FrostShard','wyrm-winter'],
 TempestWeb:['ChainLightning','wide-web'],Thunderhead:['ChainLightning','heavy-discharge'],TempestAscendant:['ChainLightning','wyrm-storm'],
 WildfireNeedles:['CinderNeedle','split-burning'],Ashstorm:['CinderNeedle','piercing-stream'],EmberTempest:['CinderNeedle','four-embers'],
 PermafrostSpear:['IceLance','piercing-ice'],Hailbreaker:['IceLance','heavy-fracture'],CrystalDivide:['IceLance','three-spears'],
 StormCore:['BallLightning','living-web'],Overcharge:['BallLightning','compressed-storm'],ThunderCrown:['BallLightning','rapid-crown'],
 PhaseBarrage:['AetherDart','three-darts'],Markstorm:['AetherDart','rapid-marks'],MirrorChoir:['AetherDart','paired-darts'],
};
// Rank changes alter pose and recovery character, not combat timing.
const gestureMotion = {
 compress:{settle:5.5,sweep:0,offsets:[[0,0,0],[.04,.025,.035],[-.05,.055,-.035]],sound:'resonant'},
 thrust:{settle:8,sweep:.035,offsets:[[0,0,0],[-.02,.025,.015],[-.055,.04,.025]],sound:'combustion'},
 cut:{settle:12,sweep:.12,offsets:[[0,0,0],[.025,.02,.01],[-.025,.06,.005]],sound:'crystal'},
 conduct:{settle:15,sweep:.025,offsets:[[0,0,0],[.035,.03,-.01],[.07,.055,-.035]],sound:'discharge'},
 flick:{settle:20,sweep:.045,offsets:[[0,0,0],[.01,.015,.015],[.02,.025,.02]],sound:'ember'},
 spear:{settle:6.5,sweep:.015,offsets:[[0,0,0],[-.025,.015,.015],[-.045,.025,.025]],sound:'ice-weight'},
 pulse:{settle:9,sweep:.035,offsets:[[0,0,0],[.02,.025,-.015],[-.035,.05,-.035]],sound:'coil'},
 mark:{settle:16,sweep:.08,offsets:[[0,0,0],[.025,.015,0],[-.025,.03,.015]],sound:'phase'},
};
export function resolveSpellLook({spellId,rank=1,evolutionId=null}) {
 const base=spellProfiles[spellId];if(!base)throw Error(`No visual identity for ${spellId}`);
 if(!Number.isInteger(rank)||rank<1||rank>3)throw Error('Rank must be 1, 2 or 3');
 const evolution=evolutionId?evolutionLooks[evolutionId]:null;
 if(evolutionId&&(!evolution||evolution[0]!==spellId))throw Error(`Evolution ${evolutionId} does not belong to ${spellId}`);
 const motion=gestureMotion[base.gesture];
 return {...base,releaseWrist:base.releaseWrist.map((v,i)=>v+motion.offsets[rank-1][i]),settleRate:motion.settle,sweep:motion.sweep,soundIdentity:motion.sound,spellId,rank,weight:1+(rank-1)*.22,rankSignature:base.ranks[rank-1],evolutionSignature:evolution?.[1]??null,releaseOffsetSeconds:0};
}
