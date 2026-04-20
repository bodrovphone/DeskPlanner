import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import path from 'path';

export default defineConfig({
  output: 'static',
  trailingSlash: 'ignore',
  build: {
    // Cloudflare Pages does not serve files/directories prefixed with `_`
    // (it treats them as build config). Default Astro output `_astro/` is
    // dropped at deploy time. Rename to a non-underscore directory.
    assets: 'astro-assets',
  },
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
