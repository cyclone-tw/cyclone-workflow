import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'static',
  site: 'https://cyclone.tw',
  integrations: [react(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
