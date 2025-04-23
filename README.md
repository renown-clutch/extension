## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Svelte](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode).

## Project Commands

This project provides several npm scripts for development, building, checking, and packaging the extension:

| Command                | Description                                                                             |
| ---------------------- | --------------------------------------------------------------------------------------- |
| `npm run dev`          | Start the Vite development server with hot module reloading.                            |
| `npm run build`        | Build the extension for production (outputs to `dist/`).                                |
| `npm run watch`        | Build the extension in watch mode (rebuilds on file changes).                           |
| `npm run preview`      | Preview the production build locally.                                                   |
| `npm run check`        | Run type checks and Svelte checks.                                                      |
| `npm run clean`        | Remove the `dist/` directory and `node_modules`.                                        |
| `npm run export <ver>` | Update version in all relevant files, build, and create a zip archive for distribution. |

**Export usage example:**

```
npm run export 1.2.3
```

This will:

- Update the version in `package.json`, `public/manifest.json`, and `src/popup/tabs/Settings.svelte`
- Build the extension
- Create a zip file named `clutch_extension_123.zip` in the project root

## Need an official Svelte framework?

Check out [SvelteKit](https://github.com/sveltejs/kit#readme), which is also powered by Vite. Deploy anywhere with its serverless-first approach and adapt to various platforms, with out of the box support for TypeScript, SCSS, and Less, and easily-added support for mdsvex, GraphQL, PostCSS, Tailwind CSS, and more.

Add shadcn component:

```
npx shadcn-svelte@next add button
```
