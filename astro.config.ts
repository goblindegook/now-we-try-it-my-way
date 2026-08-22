import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'

export default defineConfig({
  site: 'https://nowwetry.it',
  integrations: [sitemap()],
  vite: {
    plugins: [
      {
        name: 'cook-hmr',
        configureServer(server) {
          const reloadOnCookFileChange = (file: string) => {
            if (file.endsWith('.cook')) server.ws.send({ type: 'full-reload' })
          }

          server.watcher.on('add', reloadOnCookFileChange)
          server.watcher.on('unlink', reloadOnCookFileChange)
        },
        handleHotUpdate({ file, server }) {
          if (file.endsWith('.cook')) {
            server.ws.send({ type: 'full-reload' })
            return []
          }
        },
      },
    ],
  },
})
