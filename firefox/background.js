/**
 * Firefox background script for XCancel Redirect
 * Uses webRequest API to intercept and redirect requests
 */

browser.webRequest.onBeforeRequest.addListener(
  function(details) {
    if (XCancelRedirect.shouldRedirect(details.url)) {
      return {
        redirectUrl: XCancelRedirect.getRedirectUrl(details.url)
      };
    }
  },
  {
    urls: ["*://x.com/*", "*://www.x.com/*"]
  },
  ["blocking"]
);
