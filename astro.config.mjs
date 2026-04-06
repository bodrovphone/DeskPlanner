import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import path from 'path';

export default defineConfig({
  output: 'static',
  integrations: [
    react(),
    tailwind({ configFile: './tailwind.config.ts' }),
  ],
  vite: {
    envPrefix: ['VITE_', 'PUBLIC_'],
    resolve: {
      alias: {
        '@/': path.resolve('./client/src/'),
        '@shared/': path.resolve('./shared/'),
        '@assets/': path.resolve('./attached_assets/'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
          },
        },
      },
    },
  },
});
