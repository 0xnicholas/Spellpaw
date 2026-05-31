import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { spellpawToolServer } from './tool-server/spellpaw-tool-server'

export default defineConfig({
  plugins: [react(), tailwindcss(), spellpawToolServer()],
  server: {
    host: '0.0.0.0',
    allowedHosts: ['127.0.0.1.nip.io'],
  },
  resolve: {
    alias: {
      '@': '/src',
      '@shared': '/src/shared',
      '@drama': '/src/apps/drama',
    },
  },
  // @ts-expect-error Vitest config keys are not in Vite's UserConfig type
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/shared/test/setup.ts'],
  },
})
