import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import electron from 'vite-plugin-electron/simple';

export default defineConfig(({ mode }) => {
  // Enable Electron plugin only when mode is 'electron' or process.env.ELECTRON is set
  const isElectron = mode === 'electron' || process.env.ELECTRON === 'true';

  return {
    plugins: [
      vue({
        template: {
          compilerOptions: {
            // Tell Vue to treat tags starting with 'ui5-' as native custom elements
            isCustomElement: (tag) => tag.startsWith('ui5-')
          }
        }
      }),
      ...(isElectron
        ? [
            electron({
              main: {
                entry: 'electron/main.ts',
              },
              preload: {
                input: 'electron/preload.ts',
              },
            }),
          ]
        : []),
    ],
  };
});