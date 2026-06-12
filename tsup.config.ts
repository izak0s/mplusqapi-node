import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: {
    // tsup's dts worker injects baseUrl, which TypeScript 6 deprecates (TS5101)
    compilerOptions: { ignoreDeprecations: '6.0' },
  },
  sourcemap: false,
  clean: false, // npm run clean handles it
  target: 'es2020',
  outDir: 'dist',
});
