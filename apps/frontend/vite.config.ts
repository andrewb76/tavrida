import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  /** Load VITE_* from monorepo root `.env.local` (see `.env.example`). */
  envDir: resolve(__dirname, '../..'),
  plugins: [tailwindcss(), vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@tavrida/shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
      '@tavrida/ui': resolve(__dirname, '../../packages/ui/src/index.ts'),
    },
  },
  server: {
    port: 5173,
  },
});
