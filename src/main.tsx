import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import '@drama/stores/sync'
import '@/shared/i18n'
import { initTheme } from '@/shared/stores/themeStore'
import { migrateToIDB } from '@drama/lib/migrateToIDB'
import { initSyncEngine } from '@drama/lib/syncEngine'
import { syncUserSettings } from '@console/lib/syncSettings'
import { useAuthStore } from '@/shared/stores/authStore'
import App from './App.tsx'

async function bootstrap() {
  // Initialize theme before any rendering to prevent flash
  initTheme()

  await migrateToIDB()
  initSyncEngine()

  if (useAuthStore.getState().isAuthenticated) {
    syncUserSettings().catch(() => { /* ignore */ });
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  )
}

bootstrap()
