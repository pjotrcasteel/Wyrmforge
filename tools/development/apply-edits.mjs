import { readFileSync, writeFileSync } from 'node:fs';

const path = process.argv[2];
const edits = JSON.parse(readFileSync(process.argv[3], 'utf8'));
let text = readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
let missing = 0;
for (const [from, to] of edits) {
    if (!text.includes(from)) { console.log('MISSING: ' + from.slice(0, 90)); missing++; continue; }
    text = text.replace(from, to);
}
writeFileSync(path, text);
console.log(`applied ${edits.length - missing}/${edits.length}`);
