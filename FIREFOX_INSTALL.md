# Firefox Installation Guide for the Clutch Extension

This guide explains how to install and use the Clutch extension in Firefox.

## Building for Firefox

1. Make sure you have all dependencies installed:

   ```
   npm install
   ```

2. Run the Firefox build script:

   ```
   npm run build:firefox
   ```

3. The Firefox-compatible version will be created in the `dist-firefox` directory.

## Installing in Firefox

### Temporary Installation (for testing)

1. Open Firefox and navigate to `about:debugging`
2. Click "This Firefox" in the left sidebar
3. Click "Load Temporary Add-on..."
4. Browse to your project's `dist-firefox` folder and select any file in that directory (usually `manifest.json`)
5. The extension should now be installed and visible in your Firefox toolbar

### Creating a Distributable Extension

If you want to distribute the extension or install it more permanently:

1. Install the web-ext tool globally (if not already installed):

   ```
   npm install -g web-ext
   ```

2. Navigate to the dist-firefox directory:

   ```
   cd dist-firefox
   ```

3. Build the extension package:

   ```
   web-ext build
   ```

4. This will create a `.zip` file in the `web-ext-artifacts` directory that can be installed in Firefox.

## Notes About Firefox Compatibility

Firefox handles some extension APIs differently than Chrome:

- Manifest V3 support in Firefox has some differences compared to Chrome
- The extension uses a compatibility layer to handle these differences
- If you encounter issues, please report them on the project's issue tracker

## Troubleshooting

If you experience any issues with the Firefox version:

1. Check the browser console (F12 > Console) for any error messages
2. Make sure you're using a supported Firefox version (109.0 or higher)
3. Try reinstalling the extension
4. If problems persist, please file an issue with details about your Firefox version and the specific issue you're experiencing
