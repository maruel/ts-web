import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [],
  build: {
    assetsDir: 'assets',
    outDir: '../backend/public',
    emptyOutDir: true,
  },
  shared: {
    publicDir: 'public'
  },
  server: {
    port: 3001,
  },
});
