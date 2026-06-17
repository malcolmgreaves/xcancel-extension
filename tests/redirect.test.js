const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { shouldRedirect, getRedirectUrl } = require('../core/redirect.js');

describe('shouldRedirect', () => {
  test('redirects x.com (bare)', () => {
    assert.strictEqual(shouldRedirect('https://x.com'), true);
  });

  test('redirects x.com with path', () => {
    assert.strictEqual(shouldRedirect('https://x.com/some/path'), true);
  });

  test('redirects www.x.com', () => {
    assert.strictEqual(shouldRedirect('https://www.x.com/feed'), true);
  });

  test('does not redirect api.x.com (subdomain)', () => {
    assert.strictEqual(shouldRedirect('https://api.x.com/v1/data'), false);
  });

  test('does not redirect twitter.com', () => {
    assert.strictEqual(shouldRedirect('https://twitter.com/user'), false);
  });

  test('does not redirect xcancel.com (destination)', () => {
    assert.strictEqual(shouldRedirect('https://xcancel.com/page'), false);
  });

  test('does not throw on invalid URL, returns false', () => {
    assert.strictEqual(shouldRedirect('not-a-url'), false);
  });

  test('does not throw on empty string, returns false', () => {
    assert.strictEqual(shouldRedirect(''), false);
  });

  test('is case-insensitive for hostname', () => {
    assert.strictEqual(shouldRedirect('http://X.COM/path'), true);
  });

  test('is case-insensitive for www prefix', () => {
    assert.strictEqual(shouldRedirect('https://WWW.X.COM/'), true);
  });

  test('does not redirect x.com.evil.com', () => {
    assert.strictEqual(shouldRedirect('https://x.com.evil.com/'), false);
  });

  test('does not redirect subpath lookalike', () => {
    assert.strictEqual(shouldRedirect('https://notx.com/x.com'), false);
  });
});

describe('getRedirectUrl', () => {
  test('redirects bare x.com root', () => {
    assert.strictEqual(getRedirectUrl('https://x.com/'), 'https://xcancel.com/');
  });

  test('preserves path', () => {
    assert.strictEqual(
      getRedirectUrl('https://x.com/some/path'),
      'https://xcancel.com/some/path'
    );
  });

  test('preserves query parameters', () => {
    assert.strictEqual(
      getRedirectUrl('https://x.com/path?q=test&foo=bar'),
      'https://xcancel.com/path?q=test&foo=bar'
    );
  });

  test('preserves fragment', () => {
    assert.strictEqual(
      getRedirectUrl('https://x.com/page#section'),
      'https://xcancel.com/page#section'
    );
  });

  test('preserves path, query, and fragment together', () => {
    assert.strictEqual(
      getRedirectUrl('https://x.com/p?q=1#anchor'),
      'https://xcancel.com/p?q=1#anchor'
    );
  });

  test('preserves http scheme (not forced to https)', () => {
    assert.strictEqual(
      getRedirectUrl('http://x.com/page'),
      'http://xcancel.com/page'
    );
  });

  test('maps www.x.com to www.xcancel.com', () => {
    assert.strictEqual(
      getRedirectUrl('https://www.x.com/feed'),
      'https://www.xcancel.com/feed'
    );
  });

  test('preserves all URL parts for www variant', () => {
    assert.strictEqual(
      getRedirectUrl('https://www.x.com/path?a=b#c'),
      'https://www.xcancel.com/path?a=b#c'
    );
  });

  test('preserves deep nested path', () => {
    assert.strictEqual(
      getRedirectUrl('https://x.com/user/status/1234567890'),
      'https://xcancel.com/user/status/1234567890'
    );
  });
});
