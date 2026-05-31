import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import '@/apps/drama/stores/sync'
import '@/shared/i18n'
import { migrateToIDB } from '@/apps/drama/lib/migrateToIDB'
import { initSyncEngine } from '@/apps/drama/lib/syncEngine'
import { getInitialTheme, applyThemeClass } from '@/shared/stores/themeStore'
import App from './App.tsx'

async function bootstrap() {
  // Apply theme before any rendering to prevent flash
  const initialTheme = getInitialTheme()
  applyThemeClass(initialTheme)

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
