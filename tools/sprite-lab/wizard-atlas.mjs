#!/usr/bin/env node
// Thin wizard-specific compatibility adapter for the shared actor atlas producer.
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {packActorAtlas} from './actor-atlas.mjs';
export {DIRECTION_ROWS} from './actor-atlas.mjs';
const CLIPS=['idle','walk','cast','hurt','death'];
const PASSES=['albedo','normal','roughness','height','caster','emission'];
const SCHOOLS=['fire','frost','storm','arcane','necromancer','summoner'];

export async function packWizardAtlas({source,output,school,clips=CLIPS,passes=['albedo']}) {
    if(!SCHOOLS.includes(school))throw Error('Invalid school');
    return packActorAtlas({source,output,actorId:'player-wizard',variant:school,clips,passes,
        requiredClips:CLIPS,requiredPasses:PASSES});
}

function parseArgs(argv){
    const opts={};
    for(let i=0;i<argv.length;i++){
        const field=argv[i];
        if(!['--source','--output','--school','--clips','--passes'].includes(field)||!argv[i+1])
            throw Error('Invalid argument: '+field);
        opts[field.slice(2)]=argv[++i];
    }
    for(const field of ['source','output','school'])if(!opts[field])throw Error('Missing --'+field);
    return {source:resolve(opts.source),output:resolve(opts.output),school:opts.school,
        clips:opts.clips?.split(',')??CLIPS,passes:opts.passes?.split(',')??['albedo']};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)
    packWizardAtlas(parseArgs(process.argv.slice(2))).then(x=>console.log(x.directory))
        .catch(error=>{console.error(error.message);process.exitCode=1;});
