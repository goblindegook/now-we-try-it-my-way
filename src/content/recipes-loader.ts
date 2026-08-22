import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Loader, LoaderContext } from 'astro/loaders'
import { parseRecipe } from '../lib/cooklang'

export async function syncRecipeFiles(
  files: Record<string, string>,
  { store, parseData, generateDigest }: Pick<LoaderContext, 'store' | 'parseData' | 'generateDigest'>,
): Promise<void> {
  store.clear()

  for (const [path, raw] of Object.entries(files)) {
    const id = path.split('/').pop()?.replace('.cook', '') ?? ''
    const parsed = parseRecipe(raw, id)
    const data = await parseData({ id, data: parsed })
    store.set({ id, data, digest: generateDigest(raw) })
  }
}

export function recipesLoader(): Loader {
  return {
    name: 'cooklang-loader',
    load: async (context) => {
      const recipesDir = fileURLToPath(new URL('src/content/recipes/', context.config.root))

      async function sync() {
        const entries = await readdir(recipesDir, { recursive: true, withFileTypes: true })
        const files: Record<string, string> = {}
        for (const entry of entries) {
          if (!entry.isFile() || !entry.name.endsWith('.cook')) continue
          const filePath = join(entry.parentPath, entry.name)
          files[filePath] = await readFile(filePath, 'utf-8')
        }
        await syncRecipeFiles(files, context)
      }

      await sync()

      context.watcher?.add(recipesDir)
      context.watcher?.on('change', (path) => path.endsWith('.cook') && sync())
      context.watcher?.on('add', (path) => path.endsWith('.cook') && sync())
      context.watcher?.on('unlink', (path) => path.endsWith('.cook') && sync())
    },
  }
}
