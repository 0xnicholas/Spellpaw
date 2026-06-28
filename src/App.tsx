import { Routes, Route, Navigate } from 'react-router-dom';
import { PortalPage } from '@/apps/portal/pages/PortalPage';
import { LoginPage } from '@drama/pages/LoginPage';
import { ProjectListPage } from '@drama/pages/ProjectListPage';
import { WorkspacePage } from '@drama/pages/WorkspacePage';
import { ConsolePage } from '@console/pages/ConsolePage';
import { BootstrapShell } from '@/shared/components/BootstrapShell';
import { bootstrapDrama } from '@drama/bootstrap';
import { bootstrapConsole } from '@console/bootstrap';
import { useAuthStore } from '@/shared/stores/authStore';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <Routes>
      {/* Portal — no app bootstrap, paints immediately */}
      <Route path="/" element={<PortalPage />} />

      {/* Drama Login — no Drama bootstrap needed (no projects yet) */}
      <Route path="/login" element={<LoginPage />} />

      {/* Drama routes — bootstrap IndexedDB + sync engine + canvas toolkit */}
      <Route
        path="/project"
        element={<Navigate to="/projects" replace />}
      />
      <Route
        path="/projects"
        element={
          <RequireAuth>
            <BootstrapShell bootstrap={bootstrapDrama}>
              <ProjectListPage />
            </BootstrapShell>
          </RequireAuth>
        }
      />
      <Route
        path="/project/:projectId"
        element={
          <RequireAuth>
            <BootstrapShell bootstrap={bootstrapDrama}>
              <WorkspacePage />
            </BootstrapShell>
          </RequireAuth>
        }
      />

      {/* Console route — bootstrap server-side user settings */}
      <Route
        path="/console"
        element={
          <RequireAuth>
            <BootstrapShell bootstrap={bootstrapConsole}>
              <ConsolePage />
            </BootstrapShell>
          </RequireAuth>
        }
      />
    </Routes>
  );
}

export default App