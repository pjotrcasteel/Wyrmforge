// Captures real running-game screenshots for visual review.
// Usage: node tools/art/capture-screens.mjs <outDir> [baseUrl]
// Requires playwright-core resolvable (NODE_PATH) and CHROME_PATH pointing at a Chromium build.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_CORE ?? 'playwright-core');

const outDir = process.argv[2] ?? 'artifacts/screens';
const baseUrl = process.argv[3] ?? 'http://127.0.0.1:4173/';
const only = process.env.VIEWPORTS?.split(',');
mkdirSync(outDir, { recursive: true });

const viewports = [
    { name: 'iphone', width: 390, height: 844, mobile: true },
    { name: 'desktop', width: 1440, height: 900, mobile: false },
].filter(viewport => !only || only.includes(viewport.name));

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
const failures = [];
for (const viewport of viewports) {
    const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: viewport.mobile ? 2 : 1,
        isMobile: viewport.mobile, hasTouch: viewport.mobile,
    });
    const page = await context.newPage();
    page.on('pageerror', error => failures.push(`${viewport.name}: ${error.message}`));
    page.on('console', message => { if (message.type() === 'error') failures.push(`${viewport.name} console: ${message.text()}`); });
    const shot = async name => page.screenshot({ path: join(outDir, `${viewport.name}-${name}.png`) });

    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.locator('#wyrmforge-ignition').waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(600);
    await shot('01-hub-first-time');
    await page.getByRole('button', { name: 'BEGIN FIRST HUNT' }).click();
    await page.waitForTimeout(700);
    await shot('02-hunt-entry');
    const primary = page.locator('.primary-arcane');
    if (await primary.count()) { await primary.first().click(); await page.waitForTimeout(400); }
    await page.locator('button.route-node.available').first().click();
    await page.waitForTimeout(300);
    await shot('02b-route-selected');
    await page.getByRole('button', { name: /^Enter (rare )?trail$/ }).click();
    await page.locator('canvas.game-canvas').waitFor();
    await page.waitForTimeout(1500);
    await shot('03-combat-start');
    // Walk using real keyboard input into the authoritative C# simulation.
    for (const [key, label] of [['w', 'north'], ['d', 'east'], ['s', 'south'], ['a', 'west']]) {
        await page.keyboard.down(key);
        await page.waitForTimeout(900);
        await shot(`04-walk-${label}`);
        await page.keyboard.up(key);
    }
    await page.waitForTimeout(4000);
    await shot('05-combat-later');
    for (let index = 0; index < 30; index++) {
        if (await page.locator('.level-up-overlay, .levelup, [class*=level-up]').count()) break;
        const key = ['a', 'w', 'd', 's'][index % 4];
        await page.keyboard.down(key);
        await page.waitForTimeout(450);
        await page.keyboard.up(key);
    }
    await page.waitForTimeout(400);
    await shot('06-choice-or-combat');
    await context.close();
}
await browser.close();
if (failures.length) console.log('PAGE ERRORS:\n' + failures.join('\n'));
console.log('captured to', outDir);
