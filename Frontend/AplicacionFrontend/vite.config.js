import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const backendUrl = process.env.VITE_API_URL || 'https://nextfit-pa8i.onrender.com';

export default defineConfig({
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
    }
  },
 
  test: {
    environment: 'jsdom',
    globals: true
  }
})
