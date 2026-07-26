import { resolve } from 'node:path';
import hawkVitePlugin from '@hawk.so/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  /** Load VITE_* / HAWK_* from monorepo root `.env.local` (see `.env.example`). */
  const rootEnv = loadEnv(mode, resolve(__dirname, '../..'), ['VITE_', 'HAWK_']);
  const hawkToken = (rootEnv.HAWK_TOKEN || rootEnv.VITE_HAWK_TOKEN || '').trim();
  const hawkRelease =
    (rootEnv.VITE_HAWK_RELEASE || process.env.GIT_SHA || '').trim() || undefined;

  const plugins = [tailwindcss(), vue()];
  if (hawkToken && !/^https?:\/\//i.test(hawkToken)) {
    plugins.push(
      hawkVitePlugin({
        token: hawkToken,
        release: hawkRelease,
      }),
    );
  }

  return {
    envDir: resolve(__dirname, '../..'),
    plugins,
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@tavrida/shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
        '@tavrida/ui': resolve(__dirname, '../../packages/ui/src/index.ts'),
        '@tavrida/object-storage': resolve(__dirname, '../../packages/object-storage/src/index.ts'),
      },
    },
    server: {
      port: 5173,
    },
  };
});
