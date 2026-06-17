/**
 * Browser integration tests for the Chrome extension.
 *
 * These tests load the actual Chrome extension into a real Chromium instance
 * and verify that navigating to x.com URLs is redirected to xcancel.com.
 *
 * declarativeNetRequest rules intercept at the network layer before any DNS
 * lookup, so x.com never receives a real connection. page.route() mocks the
 * xcancel.com destination so tests have no external network dependency.
 */

const { test, expect, chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const os = require('os');

const EXTENSION_PATH = path.resolve(__dirname, '../../chrome');

// Resolve the Chromium executable: prefer the version bundled with the
// installed @playwright/test, fall back to any full Chromium in PW_BROWSERS_PATH.
function resolveChromiumExecutable() {
  const browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (browsersPath) {
    // Walk the path looking for a full Chromium (not headless_shell)
    try {
      for (const entry of fs.readdirSync(browsersPath)) {
        if (entry.startsWith('chromium-') && !entry.includes('headless')) {
          const candidate = path.join(browsersPath, entry, 'chrome-linux', 'chrome');
          if (fs.existsSync(candidate)) return candidate;
        }
      }
    } catch {}
  }
  return undefined; // let Playwright use its own bundled browser
}

let context;
let userDataDir;

test.beforeAll(async () => {
  // Persistent context is required to load unpacked extensions in Chromium.
  // --headless=new enables the modern headless mode that supports extensions.
  userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'xcancel-test-'));
  const executablePath = resolveChromiumExecutable();
  context = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    ...(executablePath ? { executablePath } : {}),
    args: [
      '--headless=new',
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
    ],
  });
});

test.afterAll(async () => {
  await context?.close();
  // Clean up the temp profile directory
  try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch {}
});

// Helper: mock xcancel.com so the test never hits the real server
async function mockXCancel(page) {
  await page.route('https://xcancel.com/**', route =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>mocked xcancel</body></html>' })
  );
  await page.route('https://www.xcancel.com/**', route =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>mocked www.xcancel</body></html>' })
  );
}

test('redirects https://x.com/ to https://xcancel.com/', async () => {
  const page = await context.newPage();
  await mockXCancel(page);
  await page.goto('https://x.com/', { waitUntil: 'commit' });
  expect(page.url()).toBe('https://xcancel.com/');
  await page.close();
});

test('redirects https://x.com/some/path to xcancel.com with path preserved', async () => {
  const page = await context.newPage();
  await mockXCancel(page);
  await page.goto('https://x.com/some/path', { waitUntil: 'commit' });
  expect(page.url()).toBe('https://xcancel.com/some/path');
  await page.close();
});

test('preserves query parameters through redirect', async () => {
  const page = await context.newPage();
  await mockXCancel(page);
  await page.goto('https://x.com/user/status/123?ref=home', { waitUntil: 'commit' });
  expect(page.url()).toBe('https://xcancel.com/user/status/123?ref=home');
  await page.close();
});

test('redirects https://www.x.com/ to https://www.xcancel.com/', async () => {
  const page = await context.newPage();
  await mockXCancel(page);
  await page.goto('https://www.x.com/', { waitUntil: 'commit' });
  expect(page.url()).toBe('https://www.xcancel.com/');
  await page.close();
});

test('www.x.com preserves path through redirect', async () => {
  const page = await context.newPage();
  await mockXCancel(page);
  await page.goto('https://www.x.com/feed', { waitUntil: 'commit' });
  expect(page.url()).toBe('https://www.xcancel.com/feed');
  await page.close();
});
