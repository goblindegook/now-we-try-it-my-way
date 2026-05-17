// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
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
