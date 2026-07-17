#!/usr/bin/env node

/**
 * Refresh the committed copies of core/redirect.js used by the browsers that
 * load the script directly (Firefox, Safari).
 *
 * core/redirect.js is the single source of truth. These copies exist so that
 * "Load unpacked" (Firefox) and the Safari web-extension converter can read the
 * source tree directly without a build step. Run `npm run sync` after changing
 * core/redirect.js so the copies never drift.
 *
 * Pass `--check` (npm run verify) to fail with a non-zero exit code if any copy
 * has drifted, instead of rewriting it. Useful in CI and as a pre-build guard.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const CORE_FILE = path.join(ROOT_DIR, 'core', 'redirect.js');

// Browser source dirs that load redirect.js directly.
const TARGETS = [
  path.join(ROOT_DIR, 'firefox', 'redirect.js'),
  path.join(ROOT_DIR, 'safari', 'Shared (Extension)', 'redirect.js'),
];

function main() {
  const checkOnly = process.argv.includes('--check');
  const core = fs.readFileSync(CORE_FILE);

  if (checkOnly) {
    const drifted = TARGETS.filter(
      (target) => !fs.existsSync(target) || !fs.readFileSync(target).equals(core),
    );
    if (drifted.length) {
      console.error('core/redirect.js is out of sync with:');
      for (const target of drifted) {
        console.error(`  - ${path.relative(ROOT_DIR, target)}`);
      }
      console.error('Run `npm run sync` to fix.');
      process.exit(1);
    }
    console.log('core/redirect.js is in sync with Firefox and Safari.');
    return;
  }

  for (const target of TARGETS) {
    fs.writeFileSync(target, core);
    console.log(`  Synced -> ${path.relative(ROOT_DIR, target)}`);
  }
  console.log('core/redirect.js synced to Firefox and Safari.');
}

main();
