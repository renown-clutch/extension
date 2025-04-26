## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Svelte](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode).

## Build Requirements

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

## Project Commands

This project provides several npm scripts for development, building, checking, and packaging the extension:

| Command                        | Description                                                                            |
| ------------------------------ | -------------------------------------------------------------------------------------- |
| `npm run dev`                  | Start the Vite development server with hot module reloading.                           |
| `npm run build`                | Build the extension for Chrome (outputs to `dist/`).                                   |
| `npm run build:firefox`        | Build the extension for Firefox (outputs to `dist-firefox/`).                          |
| `npm run watch`                | Build the extension in watch mode (rebuilds on file changes).                          |
| `npm run preview`              | Preview the production build locally.                                                  |
| `npm run check`                | Run type checks and Svelte checks.                                                     |
| `npm run clean`                | Remove the `dist/` directory and `node_modules`.                                       |
| `npm run export <ver>`         | Update version in files, build for Chrome, and create a zip archive for distribution.  |
| `npm run export:firefox <ver>` | Update version in files, build for Firefox, and create a zip archive for distribution. |
| `npm run export:all <ver>`     | Run both export commands to create Chrome and Firefox distributions.                   |

## Step-by-Step Build Instructions

### Prerequisites

1. Install Node.js (v18.0.0 or higher) from [nodejs.org](https://nodejs.org/)
2. Clone this repository
3. Install dependencies:
   ```
   npm install
   ```

### Building for Chrome

1. To build the extension for Chrome:

   ```
   npm run build
   ```

   The built extension will be in the `dist/` directory.

2. To package the extension with a specific version:
   ```
   npm run export 1.2.3
   ```
   This will update the version in all files, build the extension, and create a zip file named `clutch_extension_123.zip` in the `export/` directory.

### Building for Firefox

1. To build the extension for Firefox:

   ```
   npm run build:firefox
   ```

   This builds the extension with Firefox-specific adjustments and outputs to the `dist-firefox/` directory.

2. To package the extension for Firefox with a specific version:
   ```
   npm run export:firefox 1.2.3
   ```
   This will update the version in all files, build the Firefox version, and create a zip file named `clutch_extension_firefox_123.zip` in the `export/` directory.

### Building for Both Browsers

To build and package the extension for both Chrome and Firefox in a single command:

```
npm run export:all 1.2.3
```

This will create both zip files in the `export/` directory.

## Adding shadcn Components

To add a shadcn component:

```
npx shadcn-svelte@next add button
```
