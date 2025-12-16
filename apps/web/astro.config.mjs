import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root,
  srcDir: fileURLToPath(new URL('./src', import.meta.url)),
  outDir: fileURLToPath(new URL('../../dist/apps/web', import.meta.url)),
  integrations: [
    tailwind({
      configFile: fileURLToPath(
        new URL('./tailwind.config.cjs', import.meta.url),
      ),
    }),
  ],
});
