#!/usr/bin/env node

/**
 * Build script for XCancel Redirect extension
 * Creates distributable packages for each browser
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.join(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const CORE_DIR = path.join(ROOT_DIR, 'core');

const BROWSERS = ['chrome', 'firefox', 'edge'];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyFile(src, dest) {
  fs.copyFileSync(src, dest);
  console.log(`  Copied: ${path.basename(src)}`);
}

function copyDir(src, dest) {
  ensureDir(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFile(srcPath, destPath);
    }
  }
}

function syncCoreToExtension(browserDir) {
  const coreFile = path.join(CORE_DIR, 'redirect.js');
  const destFile = path.join(browserDir, 'redirect.js');

  if (fs.existsSync(coreFile)) {
    copyFile(coreFile, destFile);
  }
}

function createZip(sourceDir, outputPath) {
  try {
    execSync(`cd "${sourceDir}" && zip -r "${outputPath}" .`, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`Failed to create zip: ${error.message}`);
    return false;
  }
}

function buildBrowser(browser) {
  console.log(`\nBuilding ${browser} extension...`);

  const browserDir = path.join(ROOT_DIR, browser);
  const distBrowserDir = path.join(DIST_DIR, browser);

  if (!fs.existsSync(browserDir)) {
    console.error(`  Error: ${browser} directory not found`);
    return false;
  }

  // Clean and create dist directory
  if (fs.existsSync(distBrowserDir)) {
    fs.rmSync(distBrowserDir, { recursive: true });
  }
  ensureDir(distBrowserDir);

  // Copy all files from browser directory
  copyDir(browserDir, distBrowserDir);

  // Sync core redirect.js (for browsers that load the script directly).
  // Chrome/Edge don't need it — they redirect via rules.json.
  if (browser === 'firefox' || browser === 'safari') {
    syncCoreToExtension(distBrowserDir);
  }

  // Create zip file
  const zipPath = path.join(DIST_DIR, `xcancel-redirect-${browser}.zip`);
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  console.log(`  Creating ${browser} package...`);
  if (!createZip(distBrowserDir, zipPath)) {
    return false;
  }

  console.log(`  Done: dist/xcancel-redirect-${browser}.zip`);
  return true;
}

function main() {
  console.log('XCancel Redirect Extension Build');
  console.log('=================================');

  // Ensure icons exist before packaging (manifests reference them).
  console.log('\nGenerating icons...');
  execSync('node scripts/generate-icons.js', { cwd: ROOT_DIR, stdio: 'inherit' });

  // Create dist directory
  ensureDir(DIST_DIR);

  // Build the browsers named on the command line, or all of them by default.
  const requested = process.argv.slice(2);
  const unknown = requested.filter((b) => !BROWSERS.includes(b));
  if (unknown.length) {
    console.error(`Unknown browser(s): ${unknown.join(', ')}`);
    console.error(`Valid options: ${BROWSERS.join(', ')}`);
    process.exit(1);
  }
  const buildList = requested.length ? requested : BROWSERS;

  // Build each browser
  const results = {};
  for (const browser of buildList) {
    results[browser] = buildBrowser(browser);
  }

  // Summary
  console.log('\n=================================');
  console.log('Build Summary:');
  for (const [browser, success] of Object.entries(results)) {
    console.log(`  ${browser}: ${success ? 'SUCCESS' : 'FAILED'}`);
  }

  console.log('\nNote: Safari requires Xcode to build. See safari/README.md for instructions.');

  // Fail the process if any requested browser failed to build.
  if (Object.values(results).some((success) => !success)) {
    process.exit(1);
  }
}

main();
