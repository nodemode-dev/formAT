import { defineConfig } from 'vite';

const FRONTEND_PORT = 5490;
const BACKEND_PORT = 8490;
const engine = { target: `http://127.0.0.1:${BACKEND_PORT}`, changeOrigin: true, ws: true };
const engineSocket = { target: `ws://127.0.0.1:${BACKEND_PORT}`, ws: true, changeOrigin: true };

export default defineConfig({
  root: '.',
  publicDir: 'public',
  server: {
    port: FRONTEND_PORT,
    host: false,
    strictPort: true,
    proxy: { '/api/events': engineSocket, '/api': engine, '/mcp': engine },
  },
  preview: {
    port: FRONTEND_PORT + 1,
    host: false,
    strictPort: true,
    proxy: { '/api/events': engineSocket, '/api': engine, '/mcp': engine },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2022',
  },
});
