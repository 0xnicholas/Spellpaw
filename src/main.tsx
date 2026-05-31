import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import '@drama/stores/sync'
import '@/shared/i18n'
import { applyDarkTheme } from '@/shared/stores/themeStore'
import { migrateToIDB } from '@drama/lib/migrateToIDB'
import { initSyncEngine } from '@drama/lib/syncEngine'
import App from './App.tsx'

async function bootstrap() {
  // Apply dark theme before any rendering to prevent flash
  applyDarkTheme()

  await migrateToIDB()
  initSyncEngine()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  )
}

bootstrap()
