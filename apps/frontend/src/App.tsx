import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./features/auth/AuthProvider";
import { ProtectedRoute } from "./features/auth/ProtectedRoute";
import { LoginPage } from "./features/auth/LoginPage";
import { SignupPage } from "./features/auth/SignupPage";
import { ProjectsPage } from "./features/projects/ProjectsPage";
import { ProjectDetailsPage } from "./features/projects/ProjectDetailsPage";
import { CreateProjectPage } from "./features/projects/CreateProjectPage";
import { CreateReleasePage } from "./features/releases/CreateReleasePage";
import { ReleaseDetailsPage } from "./features/releases/ReleaseDetailsPage";
import { MonitoringDashboard } from "./features/monitoring/MonitoringDashboard";
import { IncidentDetailsPage } from "./features/incidents/IncidentDetailsPage";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <ProjectsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/new"
          element={
            <ProtectedRoute>
              <CreateProjectPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:id"
          element={
            <ProtectedRoute>
              <ProjectDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:id/releases/new"
          element={
            <ProtectedRoute>
              <CreateReleasePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:id/releases/:releaseId"
          element={
            <ProtectedRoute>
              <ReleaseDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:id/releases/:releaseId/deployments/:deploymentId"
          element={
            <ProtectedRoute>
              <MonitoringDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:id/releases/:releaseId/deployments/:deploymentId/incidents/:incidentId"
          element={
            <ProtectedRoute>
              <IncidentDetailsPage />
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<Navigate to="/projects" replace />} />
        <Route path="*" element={<Navigate to="/projects" replace />} />
      </Routes>
    </AuthProvider>
  );
}
