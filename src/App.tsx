import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PortalPage } from '@/apps/portal/pages/PortalPage';
import { LoginPage } from '@drama/pages/LoginPage';
import { ProjectListPage } from '@drama/pages/ProjectListPage';
import { WorkspacePage } from '@drama/pages/WorkspacePage';
import { TemplateMarketPage } from '@drama/pages/TemplateMarketPage';
import { useAuthStore } from '@/shared/stores/authStore';
import { useProjectStore } from '@drama/stores/projectStore';
import { mockProjects } from '@drama/data/mockProjects';
import { mockTreeData } from '@drama/data/mockTreeData';
import { mockTasks } from '@drama/data/mockTaskData';
import { useTaskStore } from '@drama/stores/taskStore';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  useEffect(() => {
    let unsub: (() => void) | null = null;

    const seedIfEmpty = () => {
      const state = useProjectStore.getState();
      const ids = state.projects.map((p) => p.id);
      const hasDuplicates = new Set(ids).size !== ids.length;
      const hasProjects = state.projects.length > 0;
      const hasTrees = Object.keys(state.trees).length > 0;
      if (!hasProjects || !hasTrees || hasDuplicates) {
        // Unsubscribe first to avoid infinite loop from setState
        unsub?.();
        useProjectStore.setState({
          projects: mockProjects,
          trees: { 'proj_1': mockTreeData },
          currentProjectId: mockProjects[0]?.id ?? null,
          selectedNodeId: null,
        });
      }
    };

    const seedTasksIfEmpty = () => {
      const tasks = useTaskStore.getState().tasks;
      if (tasks.length === 0) {
        taskUnsub?.();
        useTaskStore.setState({ tasks: mockTasks });
      }
    };

    // Seed tasks
    let taskUnsub: (() => void) | null = null;
    seedTasksIfEmpty();
    taskUnsub = useTaskStore.subscribe(seedTasksIfEmpty);

    // Check immediately (before rehydration) and also after rehydration settles.
    // The subscribe catches IndexedDB rehydration which may overwrite with stale empty data.
    seedIfEmpty();
    unsub = useProjectStore.subscribe(seedIfEmpty);

    // Safety net: force-check once more after IndexedDB rehydration has settled.
    // The persist middleware's getItem is async; subscribe may fire before it completes.
    const retryTimer = setTimeout(() => {
      const state = useProjectStore.getState();
      if (state.projects.length === 0 || Object.keys(state.trees).length === 0) {
        useProjectStore.setState({
          projects: mockProjects,
          trees: { 'proj_1': mockTreeData },
          currentProjectId: mockProjects[0]?.id ?? null,
          selectedNodeId: null,
        });
      }
    }, 500);

    return () => { unsub?.(); taskUnsub?.(); clearTimeout(retryTimer); };
  }, []);

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
