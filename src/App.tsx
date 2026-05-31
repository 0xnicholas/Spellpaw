import { Routes, Route, Navigate } from 'react-router-dom';
import { PortalPage } from '@/apps/portal/pages/PortalPage';
import { LoginPage } from '@/apps/drama/pages/LoginPage';
import { ProjectListPage } from '@/apps/drama/pages/ProjectListPage';
import { WorkspacePage } from '@/apps/drama/pages/WorkspacePage';
import { TemplateMarketPage } from '@/apps/drama/pages/TemplateMarketPage';
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
    </Routes>
  );
}

export default App
