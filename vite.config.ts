import { defineConfig } from 'vite'
import ViteRails from 'vite-plugin-rails'
import react from '@vitejs/plugin-react'
import Environment from 'vite-plugin-environment';

export default defineConfig({
  plugins: [
    ViteRails(),
    react(),
    Environment(['NODE_ENV'])
  ],
  css: {
    devSourcemap: true    
  }
})
