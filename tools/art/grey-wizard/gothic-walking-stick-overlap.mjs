// Correct v008's underpaint extent: the shaft is in open air above the lower cape.
import {project as old,poses,idle,transform,sourceContacts} from './gothic-walking-stick-repair.mjs';
export {poses,idle,transform,sourceContacts};
export const project={...old,id:'grey-wizard-fire-southeast-walking-stick-v009',outputDirectory:'gothic-southeast-v009-overlap',
 underpaint:[{name:'robe-under-staff',polygon:[[58,96],[64,96],[65,122],[59,127],[56,112]],owner:'staff',sampleOffset:[7,0]}],
 status:'revised staff/cape overlap; source visual review, not production acceptance'};
