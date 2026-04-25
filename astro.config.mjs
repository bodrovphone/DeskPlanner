import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import path from 'path';

export default defineConfig({
  site: 'https://ohmydesk.app',
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
    sitemap({
      // SPA shells — keep them out of the sitemap (robots.txt + noindex meta also block them).
      filter: (page) => {
        const path = new URL(page).pathname.replace(/\/$/, '');
        return !['/login', '/signup', '/onboarding', '/spa'].includes(path);
      },
      serialize(item) {
        // Force trailing slash on every URL so the sitemap matches the canonical form.
        const url = new URL(item.url);
        if (!url.pathname.endsWith('/')) url.pathname += '/';
        return { ...item, url: url.toString() };
      },
    }),
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
