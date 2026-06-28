import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { spellpawToolServer } from './tool-server/spellpaw-tool-server'
import { skillManifestPlugin } from './vite-plugin-skill-manifest'

export default defineConfig({
  plugins: [react(), tailwindcss(), spellpawToolServer(), skillManifestPlugin()],
  server: {
    host: '0.0.0.0',
    allowedHosts: ['localhost', '127.0.0.1', '127.0.0.1.nip.io', 'spellpaw.xyz', 'www.spellpaw.xyz'],
  },
  resolve: {
    alias: {
      '@': '/src',
      '@shared': '/src/shared',
      '@drama': '/src/apps/drama',
      '@console': '/src/apps/console',
      '@canvas': '/src/shared/components/canvas',
      '@chat': '/src/shared/components/chat-panel',
    },
  },
  // @ts-expect-error Vitest config keys are not in Vite's UserConfig type
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/shared/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**', 'src/apps/drama/lib/numbering.test.ts'],
  },
})
