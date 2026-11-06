import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  resolve: {
    preserveSymlinks: true,
  },
  server: {
    proxy: {
      '/api': { target: 'http://localhost:3000' },
      '/auth': { target: 'http://localhost:3000' },
    },
  },
})
