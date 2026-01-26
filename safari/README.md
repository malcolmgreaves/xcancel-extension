# Safari Extension Setup

Safari Web Extensions require a native macOS/iOS app container. Follow these steps to create the Xcode project:

## Prerequisites

- macOS 11.0 or later
- Xcode 12.0 or later
- Apple Developer account (free account works for local development)

## Creating the Xcode Project

### Option 1: Using Safari Web Extension Converter (Recommended)

1. Open Terminal and navigate to the `safari/Shared (Extension)` directory:
   ```bash
   cd safari/Shared\ \(Extension\)
   ```

2. Run the Safari Web Extension converter:
   ```bash
   xcrun safari-web-extension-converter . --project-location ../xcancel-extension --app-name "XCancel Redirect" --bundle-identifier com.example.xcancel-redirect
   ```

3. Open the generated Xcode project:
   ```bash
   open ../xcancel-extension/XCancel\ Redirect.xcodeproj
   ```

4. In Xcode:
   - Select your development team in Signing & Capabilities
   - Build and run the project (Cmd+R)

### Option 2: Manual Xcode Project Creation

1. Open Xcode and create a new project
2. Select **macOS** > **Safari Extension App**
3. Configure the project:
   - Product Name: `XCancel Redirect`
   - Bundle Identifier: `com.example.xcancel-redirect`
   - Language: Swift
4. Replace the generated extension files in `Shared (Extension)` with the files from this directory
5. Build and run

## Enabling the Extension

1. Build and run the app from Xcode
2. Open Safari
3. Go to **Safari** > **Preferences** > **Extensions**
4. Enable "XCancel Redirect"
5. Grant permission when prompted

## Troubleshooting

### Extension not appearing in Safari

- Ensure you've run the app at least once from Xcode
- Check Safari > Preferences > Extensions > Show extensions from other developers
- Enable **Develop** menu in Safari preferences (Advanced tab)
- Go to Develop > Allow Unsigned Extensions

### Redirect not working

- Make sure the extension has permission for x.com
- Check the extension's permissions in Safari Preferences > Extensions
- Look for errors in Safari's Web Inspector (Develop > Web Extension Background Content)

## Distribution

To distribute the Safari extension:

1. Create an Apple Developer account
2. Sign the extension with a valid certificate
3. Submit to the Mac App Store or distribute as a notarized app
