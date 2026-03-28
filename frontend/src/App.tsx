import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Navbar, Sidebar } from "./components";
import {
  LoginPage,
  DashboardPage,
  ReportsListPage,
  ReportViewerPage,
  ProfilePage,
  ChangePasswordPage,
  IframeReportPage,
  MultiBranchIframeReportPage,
  MultiBranchReportViewerPage,
} from "./pages";
import PublicReportViewerPage from "./pages/PublicReportViewerPage";

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { token, user } = useAuth();
  const location = useLocation();

  if (!token) return <Navigate to="/login" replace />;

  if (
    user?.must_change_password &&
    location.pathname !== "/change-password"
  ) {
    return <Navigate to="/change-password" replace />;
  }

  return <>{children}</>;
};

// Layout with Sidebar and Navbar (default)
const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
};

// Layout without sidebar for immersive report view
const ReportLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white">
      <Navbar />
      <main className="min-h-[calc(100vh-64px)]">{children}</main>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

function AppRoutes() {
  const { token } = useAuth();

  return (
    <Routes>
      {/* Login Route */}
      <Route
        path="/login"
        element={token ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />

      {/* Protected Routes with Layout */}
      <Route
        path="/change-password"
        element={
          <ProtectedRoute>
            <MainLayout>
              <ChangePasswordPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <MainLayout>
              <DashboardPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/:dashboardId"
        element={
          <ProtectedRoute>
            <MainLayout>
              <DashboardPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <MainLayout>
              <ReportsListPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/report/:id"
        element={
          <ProtectedRoute>
            <ReportLayout>
              <ReportViewerPage />
            </ReportLayout>
          </ProtectedRoute>
        }
      />

      {/* Public iframe report route (no auth, for embedding) */}
      <Route path="/iframe-report" element={<IframeReportPage />} />

      {/* Public report viewer route (no auth, for direct access) */}
      <Route path="/report-viewer" element={<PublicReportViewerPage />} />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <MainLayout>
              <ProfilePage />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Multi-branch report iframe route */}
      <Route path="/multi-branch-report" element={<MultiBranchIframeReportPage />} />

      {/* Multi-branch report viewer route */}
      <Route path="/multi-branch-report-viewer" element={<MultiBranchReportViewerPage />} />

      {/* Catch-all redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
