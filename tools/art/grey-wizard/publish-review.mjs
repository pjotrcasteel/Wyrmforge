// Copy this bounded source study to an explicit developer-only existing lab route.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
const from=join(root,'art/source/characters/grey-wizard/gothic-south-v003');
const to=join(root,'src/Wyrmforge.Presentation.Web/wwwroot/art/review/grey-wizard-gothic-v003');
mkdirSync(to,{recursive:true});
for(const n of ['manifest.json','animation-profile.json','idle.png','walk.png','scale-calibration.json'])writeFileSync(join(to,n),readFileSync(join(from,n)));
console.log(to);
