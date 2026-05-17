import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'node',
          include: ['src/**/*.test.ts'],
          exclude: ['src/web-components/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'happy-dom',
          include: ['src/web-components/**/*.test.ts'],
          environment: 'happy-dom',
          pool: 'vmForks',
        },
      },
    ],
  },
})
