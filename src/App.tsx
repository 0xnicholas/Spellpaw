import { Routes, Route, Navigate } from 'react-router-dom';
import { PortalPage } from '@/apps/portal/pages/PortalPage';
import { LoginPage } from '@drama/pages/LoginPage';
import { ProjectListPage } from '@drama/pages/ProjectListPage';
import { WorkspacePage } from '@drama/pages/WorkspacePage';
import { TemplateMarketPage } from '@drama/pages/TemplateMarketPage';
import { ConsolePage } from '@console/pages/ConsolePage';
import { useAuthStore } from '@/shared/stores/authStore';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<PortalPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/project" element={<Navigate to="/projects" replace />} />
      <Route
        path="/projects"
        element={
          <RequireAuth>
            <ProjectListPage />
          </RequireAuth>
        }
      />
      <Route
        path="/project/:projectId"
        element={
          <RequireAuth>
            <WorkspacePage />
          </RequireAuth>
        }
      />
      <Route
        path="/templates"
        element={
          <RequireAuth>
            <TemplateMarketPage />
          </RequireAuth>
        }
      />
      <Route
        path="/console"
        element={
          <RequireAuth>
            <ConsolePage />
          </RequireAuth>
        }
      />
    </Routes>
  );
}

export default App
