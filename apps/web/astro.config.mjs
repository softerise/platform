import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwind from '@astrojs/tailwind';
import { defineConfig } from 'astro/config';

const baseDir = fileURLToPath(new URL('.', import.meta.url));
const resolveFromBase = (...segments) => path.resolve(baseDir, ...segments);

export default defineConfig({
  root: baseDir,
  srcDir: resolveFromBase('./src'),
  outDir: resolveFromBase('../../dist/apps/web'),
  integrations: [
    tailwind({
      configFile: resolveFromBase('./tailwind.config.cjs'),
    }),
  ],
});
