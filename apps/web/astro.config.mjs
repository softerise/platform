import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import { fileURLToPath } from 'node:url';

const tailwindConfigFile = fileURLToPath(
  new URL('./tailwind.config.cjs', import.meta.url),
);

export default defineConfig({
  srcDir: './src',
  outDir: '../../dist/apps/web',
  integrations: [
    tailwind({
      configFile: tailwindConfigFile,
    }),
  ],
});
