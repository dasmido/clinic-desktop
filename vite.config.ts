// vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import electron from 'vite-plugin-electron/simple';

export default defineConfig(({ mode }) => {
  const isElectron = mode === 'electron' || process.env.ELECTRON === 'true';

  return {
    resolve: {
      tsconfigPaths: true,
    },
    plugins: [
      vue(),
      ...(isElectron
        ? [
            electron({
              main: { entry: 'electron/main.ts' },
              preload: { input: 'electron/preload.ts' },
            }),
          ]
        : []),
    ],
  };
});