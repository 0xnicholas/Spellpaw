import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import '@/shared/i18n'
import { initTheme } from '@/shared/stores/themeStore'
import { ensureSkillsLoaded } from '@/shared/copilot/skills/loader'
import App from './App.tsx'

/**
 * Global bootstrap — only work that must happen before any route can
 * paint its first frame. App-specific initialization (Drama's IndexedDB
 * migration, Console's settings sync, etc.) lives in each app's own
 * `bootstrap.ts` and runs on first route entry via `BootstrapShell`.
 */
function bootstrap() {
  // Theme must be set before React paints to avoid a flash.
  initTheme()
  // Phase 3: skills are loaded from public/skills/ at runtime.
  // Fire-and-forget — the UI will populate once loading completes.
  void ensureSkillsLoaded()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  )
}

bootstrap()