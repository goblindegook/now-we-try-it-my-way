// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://now-we-try-it-my-way.netlify.app',
  integrations: [sitemap()],
  vite: {
    plugins: [{
      name: 'cook-hmr',
      handleHotUpdate({ file, server }) {
        if (file.endsWith('.cook')) {
          server.ws.send({ type: 'full-reload' });
          return [];
        }
      },
    }],
  },
});
