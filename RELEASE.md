# Release Guide

How to test, build, and publish a new version of the XCancel Redirect extension.

---

## Section A — Code Repository Steps

These steps are done once per release, regardless of which browser stores you're publishing to.

### Prerequisites

- Node.js 20 or later
- `zip` CLI (standard on macOS/Linux; on Windows use WSL or install via Chocolatey)
- Git
- Playwright Chromium (for browser tests): `npm install && npx playwright install --with-deps chromium`

### 1. Generate icons (if needed)

Icons are generated artifacts — `npm run build` auto-generates them if missing. You only need to run this manually when loading the extension in browser dev mode *without* doing a full build first, or after changing the icon design in `scripts/generate-icons.js`:

```bash
node scripts/generate-icons.js
```

The generated PNG files in `chrome/icons/`, `firefox/icons/`, `edge/icons/`, and `safari/Shared (Extension)/icons/` are intentionally excluded from version control (listed in `.gitignore`). They are reproducibly generated from `scripts/generate-icons.js`.

### 2. Bump the version number

The version must be updated in **five files** before releasing. They must all match:

| File | Field |
|------|-------|
| `package.json` | `"version"` |
| `chrome/manifest.json` | `"version"` |
| `firefox/manifest.json` | `"version"` |
| `edge/manifest.json` | `"version"` |
| `safari/Shared (Extension)/manifest.json` | `"version"` |

Example: change `"version": "1.0.0"` to `"version": "1.1.0"` in all five files, then commit:

```bash
git commit -am "Bump version to 1.1.0"
```

### 3. Run unit tests

No install needed — uses Node.js built-in test runner.

```bash
npm test
```

Expected: all tests pass with `# fail 0`.

### 4. Run browser integration tests

Requires Playwright and Chromium installed (see Prerequisites).

```bash
npm run test:browser
```

Expected: all 5 browser tests pass. These tests load the real Chrome extension and verify that navigating to `x.com` URLs is redirected to `xcancel.com` within the browser.

### 5. Build extension packages

```bash
npm run build
```

Produces three zip files in `dist/`:

| File | Browser |
|------|---------|
| `dist/xcancel-redirect-chrome.zip` | Chrome Web Store |
| `dist/xcancel-redirect-firefox.zip` | Firefox Add-ons (AMO) |
| `dist/xcancel-redirect-edge.zip` | Microsoft Edge Add-ons |

Verify the output:

```bash
ls -lh dist/*.zip
```

### 6. Tag and push to trigger the release workflow

```bash
git tag v1.1.0
git push origin v1.1.0
```

This triggers `.github/workflows/release.yml`, which:
1. Runs all unit and browser tests
2. Builds the three zip packages
3. Creates a GitHub Release named `v1.1.0` with the zips attached and auto-generated release notes

Monitor the workflow at: `https://github.com/<owner>/xcancel-extension/actions`

Once the workflow completes, download the zip files from the GitHub Release page for submission to browser stores.

---

## Section B — Per-Browser Store Submission

These steps are independent — you can publish to one store without publishing to others.

---

### Chrome Web Store

**URL:** https://chrome.google.com/webstore/devconsole  
**File:** `dist/xcancel-redirect-chrome.zip`  
**One-time fee:** $5 USD developer registration

**Steps:**

1. Sign in to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Click **"New item"** and upload `dist/xcancel-redirect-chrome.zip`
3. Fill in the store listing:
   - **Name:** XCancel Redirect
   - **Category:** Productivity
   - **Description:** Automatically redirects x.com (Twitter) links to xcancel.com
   - **Screenshots:** at least one 1280×800 or 640×400 screenshot
4. Submit for review

**Review time:** typically 1–3 business days.

**Updates:** upload a new zip with the bumped `manifest.json` version through the same dashboard item.

**Notes:**
- The extension uses `declarativeNetRequest` (Manifest V3), which Chrome Web Store treats favorably over the older `webRequest` approach.
- The `host_permissions` scope is narrow (`*://x.com/*` and `*://www.x.com/*`), which speeds up review.

---

### Firefox Add-ons (AMO)

**URL:** https://addons.mozilla.org/developers/  
**File:** `dist/xcancel-redirect-firefox.zip`  
**Cost:** Free

**Steps:**

1. Sign in at [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/)
2. Click **"Submit a New Add-on"** → **"On this site"**
3. Upload `dist/xcancel-redirect-firefox.zip`
4. When asked about source code: the zip includes `redirect.js` (a copy of `core/redirect.js`). If AMO requests source code, provide the full repository as a separate zip (`git archive HEAD -o source.zip`)
5. Fill in the listing details (name, description, screenshots)
6. Submit

**Review time:** variable — can be days to several weeks depending on queue depth. Extensions using `webRequestBlocking` go through a human review.

**Notes:**
- The `gecko.id` in `firefox/manifest.json` (`"xcancel-redirect@example.com"`) must remain consistent across updates. Change it to a domain you own before first submission, e.g. `"xcancel-redirect@yourdomain.com"`.
- If you need to test-sign a build locally before submitting: `npx web-ext sign --channel=unlisted` (requires AMO API credentials).

---

### Microsoft Edge Add-ons

**URL:** https://partner.microsoft.com/en-us/dashboard/microsoftedge/overview  
**File:** `dist/xcancel-redirect-edge.zip`  
**Cost:** Free (requires Microsoft account)

**Steps:**

1. Sign in to [Microsoft Partner Center](https://partner.microsoft.com/dashboard)
2. Navigate to **Microsoft Edge** → **Extensions** → **Create new extension**
3. Upload `dist/xcancel-redirect-edge.zip`
4. Fill in the store listing (name, description, category: **Productivity**, screenshots)
5. Submit for certification

**Review time:** typically several business days.

**Notes:**
- Edge uses the same Manifest V3 format as Chrome; the zip is structurally identical to the Chrome zip.
- Edge Add-ons does not charge a developer registration fee.

---

### Safari App Store

**Requirements:**
- Apple Developer Program membership ($99/year)
- macOS with Xcode 15 or later
- Safari is **not** built by the CI pipeline — it requires a macOS machine

**Steps:**

1. **Convert the web extension to an Xcode project** (run once from the repo root):

   ```bash
   xcrun safari-web-extension-converter "safari/Shared (Extension)" \
     --project-location ./safari/xcancel-xcode \
     --app-name "XCancel Redirect" \
     --bundle-identifier com.example.xcancel-redirect
   ```

   Replace `com.example.xcancel-redirect` with a reverse-DNS identifier you own.

2. Open the generated `.xcodeproj` in Xcode

3. Under **Signing & Capabilities**, select your Apple Developer team

4. Build and test locally:
   - Run the app in Xcode (⌘R)
   - In Safari, go to **Settings → Extensions** and enable "XCancel Redirect"
   - Navigate to `https://x.com` and confirm you're redirected to `https://xcancel.com`

5. Archive and distribute:
   - **Product → Archive**
   - In the Organizer, click **Distribute App → App Store Connect → Upload**
   - Complete the App Store Connect listing at https://appstoreconnect.apple.com

**Review time:** typically 1–3 business days.

**Notes:**
- The native macOS app wrapper is required by Apple; the extension cannot be distributed standalone.
- See `safari/README.md` for troubleshooting tips specific to the Safari build.
- The `"version"` in `safari/Shared (Extension)/manifest.json` must match the **CFBundleShortVersionString** in the Xcode project's `Info.plist`.
