import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import '@/shared/i18n'
import { initTheme } from '@/shared/stores/themeStore'
import { migrateToIDB } from '@drama/lib/migrateToIDB'
import { initSyncEngine } from '@drama/lib/syncEngine'
import { providerRegistry, startPolling, useTaskStore } from '@drama/lib/canvasToolkit'
import { syncUserSettings } from '@console/lib/syncSettings'
import { useAuthStore } from '@/shared/stores/authStore'
import App from './App.tsx'

async function bootstrap() {
  // Initialize theme before any rendering to prevent flash
  initTheme()

  await migrateToIDB()
  initSyncEngine()

  await useTaskStore.persist.rehydrate()
  useTaskStore.getState().tasks.forEach((t) => {
    const provider = providerRegistry.get(t.providerId)
    if (provider?.poll) startPolling(t.taskId, provider, t.cardId)
  })

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
