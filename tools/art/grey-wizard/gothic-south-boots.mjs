// Keep actual painted boot silhouettes; do not dilate them with hidden seam bleed.
import {project as old,poses,idle,transform,sourceContacts} from './gothic-south-stick.mjs';
export {poses,idle,transform,sourceContacts};
export const project={...old,id:'grey-wizard-fire-south-boot-cleanup-v011',outputDirectory:'gothic-south-v011-boots',
 noBleedLayers:['boot-left','boot-right'],
 masks:old.masks.map(m=>m.name==='boot-left'?{name:m.name,polygon:[[20,114],[32,114],[33,126],[29,131],[26,133],[16,133],[16,128],[20,123]]}:m),
 clearPixels:[[29,126],[29,127],[28,128],[30,125],[31,125],[30,126],[31,126],[30,127],[31,127]],
 status:'south walking-stick boot-edge cleanup; source review only'};
