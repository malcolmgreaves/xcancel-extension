'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { shouldRedirect, getRedirectUrl } = require('./redirect.js');

test('shouldRedirect: redirects x.com and www.x.com (case-insensitive)', () => {
  assert.equal(shouldRedirect('https://x.com/jack'), true);
  assert.equal(shouldRedirect('https://www.x.com/home'), true);
  assert.equal(shouldRedirect('http://x.com'), true);
  assert.equal(shouldRedirect('https://X.com/UPPER'), true);
  assert.equal(shouldRedirect('https://WWW.X.COM/'), true);
});

test('shouldRedirect: ignores subdomains and lookalikes', () => {
  assert.equal(shouldRedirect('https://api.x.com/2/tweets'), false);
  assert.equal(shouldRedirect('https://mobile.x.com/foo'), false);
  assert.equal(shouldRedirect('https://x.com.evil.com/phish'), false);
  assert.equal(shouldRedirect('https://notx.com/'), false);
  assert.equal(shouldRedirect('https://xcancel.com/'), false);
});

test('shouldRedirect: returns false for invalid input', () => {
  assert.equal(shouldRedirect('not a url'), false);
  assert.equal(shouldRedirect(''), false);
});

test('getRedirectUrl: maps hosts to xcancel.com', () => {
  assert.equal(getRedirectUrl('https://x.com/jack'), 'https://xcancel.com/jack');
  assert.equal(
    getRedirectUrl('https://www.x.com/home'),
    'https://www.xcancel.com/home',
  );
  assert.equal(getRedirectUrl('https://X.com/UPPER'), 'https://xcancel.com/UPPER');
});

test('getRedirectUrl: preserves path, query, and fragment', () => {
  assert.equal(
    getRedirectUrl('https://x.com/elon/status/123?s=20#frag'),
    'https://xcancel.com/elon/status/123?s=20#frag',
  );
  assert.equal(getRedirectUrl('http://x.com'), 'http://xcancel.com/');
});
