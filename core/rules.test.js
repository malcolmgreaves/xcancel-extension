'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { getRedirectUrl, shouldRedirect } = require('./redirect.js');

const ROOT = path.join(__dirname, '..');

/**
 * Load a browser's declarativeNetRequest rules and return a function that
 * mimics how Chrome/Edge apply a `regexFilter` + `regexSubstitution` redirect:
 * if the URL matches, replace the matched span using the substitution;
 * otherwise return null (no redirect).
 *
 * declarativeNetRequest regexFilter is case-insensitive by default and uses
 * `\N` back-references in regexSubstitution; JS String.replace uses `$N`.
 */
function loadRule(browser) {
  const rules = JSON.parse(
    fs.readFileSync(path.join(ROOT, browser, 'rules.json'), 'utf8'),
  );
  assert.equal(rules.length, 1, `${browser} should define exactly one rule`);

  const rule = rules[0];
  assert.equal(rule.action.type, 'redirect');

  const re = new RegExp(rule.condition.regexFilter, 'i');
  const substitution = rule.action.redirect.regexSubstitution.replace(
    /\\(\d)/g,
    '$$$1',
  );

  return (url) => (re.test(url) ? url.replace(re, substitution) : null);
}

const REDIRECTED = [
  ['https://x.com/jack', 'https://xcancel.com/jack'],
  ['https://www.x.com/home', 'https://www.xcancel.com/home'],
  ['http://x.com/', 'http://xcancel.com/'],
  ['https://X.com/UPPER', 'https://xcancel.com/UPPER'],
  ['https://x.com/elon/status/123?s=20', 'https://xcancel.com/elon/status/123?s=20'],
  // Query string / fragment with the trailing-slash path browsers produce.
  ['https://x.com/?lang=en', 'https://xcancel.com/?lang=en'],
  ['https://x.com/#top', 'https://xcancel.com/#top'],
  // Bare host and query/fragment without an explicit path (regression guard).
  ['https://x.com', 'https://xcancel.com'],
  ['https://x.com?lang=en', 'https://xcancel.com?lang=en'],
  ['https://x.com#top', 'https://xcancel.com#top'],
];

const NOT_REDIRECTED = [
  'https://api.x.com/2/tweets',
  'https://mobile.x.com/foo',
  'https://x.com.evil.com/phish',
  'https://notx.com/',
  'https://xcancel.com/',
  'https://evil.com/?to=https://x.com/path',
];

for (const browser of ['chrome', 'edge']) {
  test(`${browser}/rules.json redirects exact x.com hosts`, () => {
    const apply = loadRule(browser);
    for (const [input, expected] of REDIRECTED) {
      assert.equal(apply(input), expected, `input: ${input}`);
    }
  });

  test(`${browser}/rules.json leaves subdomains and lookalikes alone`, () => {
    const apply = loadRule(browser);
    for (const input of NOT_REDIRECTED) {
      assert.equal(apply(input), null, `input: ${input}`);
    }
  });
}

test('chrome and edge rules are identical', () => {
  const chrome = fs.readFileSync(path.join(ROOT, 'chrome', 'rules.json'), 'utf8');
  const edge = fs.readFileSync(path.join(ROOT, 'edge', 'rules.json'), 'utf8');
  assert.equal(chrome, edge);
});

test('rules.json agrees with core/redirect.js on normalized URLs', () => {
  // For canonical URLs (with a path), the MV3 rule and the MV2/core logic
  // must produce the same decision and destination.
  const apply = loadRule('chrome');
  const urls = [
    'https://x.com/jack',
    'https://www.x.com/home',
    'https://api.x.com/2/tweets',
    'https://x.com.evil.com/phish',
  ];
  for (const url of urls) {
    if (shouldRedirect(url)) {
      assert.equal(apply(url), getRedirectUrl(url), `input: ${url}`);
    } else {
      assert.equal(apply(url), null, `input: ${url}`);
    }
  }
});
