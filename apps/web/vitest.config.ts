import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    globals: true,
    // The `nuxt` environment is what makes auto-imports work inside component
    // tests. It is slower than a bare happy-dom run because it boots Nuxt —
    // worth it while the tests actually render components.
    environment: 'nuxt',
    include: ['app/**/*.spec.ts'],
  },
})
