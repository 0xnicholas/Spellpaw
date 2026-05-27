import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { spellpawToolServer } from './tool-server/spellpaw-tool-server'

export default defineConfig({
  plugins: [react(), tailwindcss(), spellpawToolServer()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  // @ts-expect-error Vitest config keys are not in Vite's UserConfig type
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
