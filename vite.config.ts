import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5180,
    strictPort: true,
    // La API (server/) corre en el puerto 4580 durante el desarrollo (API_PORT en .env)
    proxy: { '/api': 'http://127.0.0.1:4580' },
  },
})
