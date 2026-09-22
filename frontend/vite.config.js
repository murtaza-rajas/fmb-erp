import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Overridable at build time (see docker/frontend.Dockerfile) for
  // deployments served under a subpath instead of a domain root.
  base: process.env.VITE_BASE_PATH || '/',
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
