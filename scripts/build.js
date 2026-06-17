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

function ensureIcons() {
  const iconSizes = [16, 48, 128];
  const missing = BROWSERS.some(browser =>
    iconSizes.some(size =>
      !fs.existsSync(path.join(ROOT_DIR, browser, 'icons', `icon${size}.png`))
    )
  );
  if (missing) {
    console.log('Icons missing — generating now...');
    execSync(`node "${path.join(__dirname, 'generate-icons.js')}"`, { stdio: 'inherit' });
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

  // Sync core redirect.js (for browsers that need it bundled)
  if (browser === 'firefox') {
    syncCoreToExtension(distBrowserDir);
  }

  // Create zip file
  const zipPath = path.join(DIST_DIR, `xcancel-redirect-${browser}.zip`);
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  console.log(`  Creating ${browser} package...`);
  createZip(distBrowserDir, zipPath);

  console.log(`  Done: dist/xcancel-redirect-${browser}.zip`);
  return true;
}

function main() {
  console.log('XCancel Redirect Extension Build');
  console.log('=================================');

  // Create dist directory
  ensureDir(DIST_DIR);

  // Auto-generate icons if any are missing
  ensureIcons();

  // Build each browser
  const results = {};
  for (const browser of BROWSERS) {
    results[browser] = buildBrowser(browser);
  }

  // Summary
  console.log('\n=================================');
  console.log('Build Summary:');
  for (const [browser, success] of Object.entries(results)) {
    console.log(`  ${browser}: ${success ? 'SUCCESS' : 'FAILED'}`);
  }

  console.log('\nNote: Safari requires Xcode to build. See safari/README.md for instructions.');
}

main();
