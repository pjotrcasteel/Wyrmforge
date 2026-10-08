import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const id = process.env.WYRMFORGE_D1_DATABASE_ID;
if (!id || !/^[0-9a-f-]{36}$/i.test(id)) throw Error('Set WYRMFORGE_D1_DATABASE_ID to your real Cloudflare D1 UUID.');
const origin = process.env.WYRMFORGE_PUBLIC_ORIGIN ?? 'https://pjotrcasteel.github.io';
const config = {
    $schema: 'node_modules/wrangler/config-schema.json',
    name: 'wyrmforge-feedback-collector',
    main: 'src/index.js',
    compatibility_date: '2026-09-01',
    observability: { enabled: false },
    vars: { PUBLIC_ORIGIN: origin },
    d1_databases: [{ binding: 'DB', database_name: 'wyrmforge-feedback', database_id: id, migrations_dir: 'migrations' }],
    triggers: { crons: ['0 3 * * *'] }
};
writeFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '..', 'wrangler.json'), JSON.stringify(config, null, 2) + '\n');
