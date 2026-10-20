#!/usr/bin/env node
// Interactive smoke test: loads the walkthrough (not capture mode), walks with W into a wall to
// prove collision, switches modes, and screenshots the desktop and phone UI.
//   node scripts/smoke.mjs --spec <house.json> --out <dir>
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { startServer } from '../serve.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const spec = resolve(arg('spec')); const out = resolve(arg('out', '.')); mkdirSync(out, { recursive: true });
const { server, url } = await startServer({ specDir: dirname(spec) });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader'] });
const errors = [];
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => errors.push(e.message));
const u = `${url}/index.html?spec=/spec/${basename(spec)}&view=${arg('view', 'entry-01')}`;
await page.goto(u); await page.waitForFunction(() => window.studio, null, { timeout: 120000 }); await page.waitForTimeout(1500);
const start = await page.evaluate(() => window.studio.camera());
await page.keyboard.down('KeyW'); await page.waitForTimeout(Number(arg('walk-ms', 9000))); await page.keyboard.up('KeyW');
const end = await page.evaluate(() => window.studio.camera());
// collision: a point 4 cm from the hall's north wall face (centreline y=3.9, face 3.96) must be pushed to >= 3.96 + 0.22
const pushed = await page.evaluate(() => window.studio.collide(7.2, 4.0));
const wallOk = pushed[1] >= 4.17;
// a point inside the open doorway to bedroom 2 (x 8.29-9.11) must pass through untouched
const door = await page.evaluate(() => window.studio.collide(8.7, 3.9));
const doorOk = Math.abs(door[1] - 3.9) < 0.01;
await page.screenshot({ path: join(out, 'ui-desktop-walk.png') });
await page.click('button[data-mode="dollhouse"]'); await page.waitForTimeout(1200); await page.screenshot({ path: join(out, 'ui-desktop-dollhouse.png') });
await page.click('button[data-mode="plan"]'); await page.waitForTimeout(1200); await page.screenshot({ path: join(out, 'ui-desktop-plan.png') });
await page.click('#room-list button[data-view="kitchen-01"]'); await page.waitForTimeout(1500);
const jumped = await page.evaluate(() => ({ mode: window.studio.mode(), cam: window.studio.camera() }));
const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
phone.on('pageerror', (e) => errors.push('phone: ' + e.message));
await phone.goto(`${url}/index.html?spec=/spec/${basename(spec)}&view=living-01`); await phone.waitForFunction(() => window.studio, null, { timeout: 120000 }); await phone.waitForTimeout(1500);
await phone.tap('#room-list button[data-view="kitchen-01"]', { timeout: 120000 }); await phone.waitForTimeout(1500);
await phone.screenshot({ path: join(out, 'ui-phone.png') });
const phoneCam = await phone.evaluate(() => window.studio.camera());
await browser.close(); server.close();
const moved = Math.hypot(end.position[0] - start.position[0], end.position[2] - start.position[2]);
const result = { collision_wall: { pushed_to: pushed, ok: wallOk }, collision_doorway: { at: door, ok: doorOk }, start, end, moved_m: +moved.toFixed(2), stayed_in_room: end.room, jumped, phone_after_tap: phoneCam, errors };
console.log(JSON.stringify(result, null, 1));
process.exit(errors.length || !wallOk || !doorOk ? 1 : 0);
