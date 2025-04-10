// build-content.js
import { rollup } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

async function buildContentScript() {
  // Create a bundle
  const bundle = await rollup({
    input: 'src/content.ts',
    plugins: [
      typescript(),
      resolve(),
      commonjs(),
      terser()
    ]
  });

  // Write the bundle to disk
  await bundle.write({
    file: 'dist/content.js',
    format: 'iife',
    name: 'content',
    exports: 'none',
    compact: true
  });

  console.log('Content script built successfully!');
}

buildContentScript().catch(error => {
  console.error('Error building content script:', error);
  process.exit(1);
}); 