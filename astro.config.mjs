// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://nowwetry.it',
  integrations: [sitemap()],
  vite: {
    plugins: [{
      name: 'cook-hmr',
      configureServer(server) {
        const restartOnCookFileChange = (file) => {
          if (file.endsWith('.cook')) server.restart();
        };

        server.watcher.on('add', restartOnCookFileChange);
        server.watcher.on('unlink', restartOnCookFileChange);
      },
      handleHotUpdate({ file, modules, server, timestamp }) {
        if (file.endsWith('.cook')) {
          server.ws.send({ type: 'full-reload' });
          return [];
        }
      },
    }],
  },
});
