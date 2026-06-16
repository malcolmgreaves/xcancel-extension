# XCancel Redirect Extension

A browser extension that redirects URLs from `x.com` to `xcancel.com`.

## Features

- Redirects `x.com/*` to `xcancel.com/*`
- Redirects `www.x.com/*` to `www.xcancel.com/*`
- Does NOT redirect subdomains (e.g., `api.x.com` stays unchanged)
- Preserves full URL path, query parameters, and fragments

## Supported Browsers

- Google Chrome
- Mozilla Firefox
- Microsoft Edge
- Apple Safari

## Project Structure

```
xcancel-extension/
├── core/                      # Shared redirect logic
│   └── redirect.js
├── chrome/                    # Chrome extension (Manifest V3)
│   ├── manifest.json
│   ├── rules.json
│   └── icons/
├── firefox/                   # Firefox extension (Manifest V2)
│   ├── manifest.json
│   ├── background.js
│   ├── redirect.js
│   └── icons/
├── edge/                      # Edge extension (Manifest V3)
│   ├── manifest.json
│   ├── rules.json
│   └── icons/
├── safari/                    # Safari Web Extension
│   ├── Shared (Extension)/
│   │   ├── manifest.json
│   │   ├── background.js
│   │   ├── redirect.js
│   │   └── _locales/
│   └── README.md
├── scripts/
│   └── build.js
└── package.json
```

## Installation

### Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `chrome/` directory from this project

### Firefox

1. Open Firefox and go to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on..."
3. Select `firefox/manifest.json` from this project

For permanent installation, the extension needs to be signed by Mozilla.

### Edge

1. Open Edge and go to `edge://extensions/`
2. Enable "Developer mode" (toggle in bottom left)
3. Click "Load unpacked"
4. Select the `edge/` directory from this project

### Safari

Safari requires building a native app container using Xcode. See [safari/README.md](safari/README.md) for detailed instructions.

## Building for Distribution

Run the build script to create distributable packages:

```bash
npm run build
```

This creates:
- `dist/xcancel-redirect-chrome.zip`
- `dist/xcancel-redirect-firefox.zip`
- `dist/xcancel-redirect-edge.zip`

Safari must be built separately using Xcode.

## Adding Icons

The extension requires icons in the `icons/` directory for each browser. Create PNG files at these sizes:
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

Copy the icons to each browser's `icons/` directory.

## How It Works

### Chrome/Edge (Manifest V3)
Uses the `declarativeNetRequest` API with static rules defined in `rules.json`. This is the most efficient approach as redirects happen at the network level without JavaScript execution.

### Firefox (Manifest V2)
Uses the `webRequest` API with the `blocking` permission to intercept requests and return redirect responses. The shared `redirect.js` module handles URL matching.

### Safari
Uses the same `webRequest` approach as Firefox, wrapped in a native macOS app container.

## Development

The core redirect logic is in `core/redirect.js` and provides two functions:

- `shouldRedirect(url)` - Returns `true` if the URL should be redirected
- `getRedirectUrl(url)` - Returns the redirected URL

This module is copied to Firefox and Safari directories since they load scripts directly.

## License

MIT
 