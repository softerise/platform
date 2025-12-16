import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import { fileURLToPath } from 'node:url';

const tailwindConfigFile = fileURLToPath(
  new URL('./tailwind.config.cjs', import.meta.url),
);
const envDir = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig({
  srcDir: './src',
  outDir: '../../dist/apps/web',
  envDir,
  integrations: [
    tailwind({
      configFile: tailwindConfigFile,
    }),
  ],
});
