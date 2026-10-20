#!/usr/bin/env node
// End-to-end demo: plan image -> (spec) -> validate -> 3D captures -> packaged site.
//   node scripts/run-demo.mjs [--out <dir>]     (default: spatial-studio/demo)
// The demo spec is FICTIONAL. Its "builder's plan" (sample-plan.png) is drawn from the spec so the
// pipeline can run with no client material; in a real job the Bot reads the builder's plan and
// writes the spec (skills/build-spatial, references/plan-to-spec.md).
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const core = dirname(dirname(fileURLToPath(import.meta.url)));
const demo = resolve(process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : join(core, '..', '..', 'demo'));
const spec = join(demo, 'sample-house.json');
const run = (label, args) => { console.log(`\n== ${label}`); execFileSync(process.execPath, args, { cwd: core, stdio: 'inherit' }); };

run('1/4 draw the (fictional) builder plan', ['plan-svg.mjs', '--spec', spec, '--out', join(demo, 'sample-plan.svg'), '--png', join(demo, 'sample-plan.png')]);
run('2/4 validate the spec against the plan', ['validate-spec.mjs', spec, '--json', join(demo, 'validation.json')]);
run('3/4 capture every viewpoint + dollhouse + plan', ['capture.mjs', '--spec', spec, '--out', join(demo, 'captures')]);
run('4/4 package the site', ['build-site.mjs', '--spec', spec, '--out', join(demo, 'site'), '--zip']);
console.log(`\ndone: ${demo}`);
