import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Served as a GitHub Pages project site at /input.pub/.
  base: '/input.pub/',
  plugins: [react()],
})
