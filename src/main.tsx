import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './stores/sync'
import './i18n'
import { migrateToIDB } from './lib/migrateToIDB'
import { initSyncEngine } from './lib/syncEngine'
import { getInitialTheme, applyThemeClass } from './stores/themeStore'
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
