import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import process from 'node:process'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendUrl = env.VITE_API_URL || 'http://localhost:8080';

  return {
    plugins: [react()],
    server: {
      hmr: {
        protocol: 'ws',
        host: 'localhost',
        clientPort: 5173,
      },
      proxy: {
        '/api': backendUrl,
        '/login': backendUrl,
        '/register': backendUrl,
        '/ws': {
          target: backendUrl,
          ws: true,
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      fileParallelism: false,
      maxWorkers: 1,
    },
  };
})
