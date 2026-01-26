/**
 * Core URL redirect logic for X.com to XCancel.com extension
 * This module is shared across all browser implementations
 */

/**
 * Check if a URL should be redirected
 * Only redirects x.com and www.x.com (no subdomains)
 * @param {string} url - The URL to check
 * @returns {boolean} - True if the URL should be redirected
 */
function shouldRedirect(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname === 'x.com' || hostname === 'www.x.com';
  } catch {
    return false;
  }
}

/**
 * Get the redirect URL for a given URL
 * Replaces x.com with xcancel.com while preserving path, query, and fragment
 * @param {string} url - The original URL
 * @returns {string} - The redirect URL
 */
function getRedirectUrl(url) {
  const parsed = new URL(url);
  const hostname = parsed.hostname.toLowerCase();

  if (hostname === 'x.com') {
    parsed.hostname = 'xcancel.com';
  } else if (hostname === 'www.x.com') {
    parsed.hostname = 'www.xcancel.com';
  }

  return parsed.href;
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { shouldRedirect, getRedirectUrl };
}

if (typeof globalThis !== 'undefined') {
  globalThis.XCancelRedirect = { shouldRedirect, getRedirectUrl };
}
