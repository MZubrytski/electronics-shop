import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    setupFiles: ['./test/helpers/setup.ts'],
    // Tests share one database and truncate between cases, so they cannot
    // run in parallel files.
    fileParallelism: false,
  },
});
