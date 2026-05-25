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
          const restartOnCookFileChange = (file: string) => {
            if (file.endsWith('.cook')) server.restart()
          }

          server.watcher.on('add', restartOnCookFileChange)
          server.watcher.on('unlink', restartOnCookFileChange)
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
