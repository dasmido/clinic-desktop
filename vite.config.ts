import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import ui from '@nuxt/ui/vite';
import electron from 'vite-plugin-electron/simple';

const electronExternalPackages = [
  'embedded-postgres',
  'pg',
  '@embedded-postgres/darwin-arm64',
  '@embedded-postgres/darwin-x64',
  '@embedded-postgres/linux-arm',
  '@embedded-postgres/linux-arm64',
  '@embedded-postgres/linux-ia32',
  '@embedded-postgres/linux-ppc64',
  '@embedded-postgres/linux-x64',
  '@embedded-postgres/windows-x64',
];

export default defineConfig(({ mode }) => {
  const isElectron = mode === 'electron' || process.env.ELECTRON === 'true';

  return {
    resolve: {
      tsconfigPaths: true,
    },
    plugins: [
      vue(),
      ui({
        router: true,
      }),
      ...(isElectron
        ? [
            electron({
              main: {
                entry: 'electron/main.ts',
                vite: {
                  build: {
                    rolldownOptions: {
                      external: electronExternalPackages,
                    },
                  },
                },
              },
              preload: { input: 'electron/preload.ts' },
            }),
          ]
        : []),
    ],
  };
});