import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { PrivateRoute } from "@/components/PrivateRoute";
import { Layout, AuthLayout, LandingLayout } from "@/components/layout";
import { LandingPage } from "@/pages/LandingPage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { TransactionsPage } from "@/pages/TransactionsPage";
import { CreateTransactionPage } from "@/pages/CreateTransactionPage";
import { DemoPage } from "@/pages/DemoPage";
import { BudgetPage } from "@/pages/BudgetPage";
import { AnalyticsPage } from "@/pages/AnalyticsPage";
import { GoalsPage } from "@/pages/GoalsPage";
import { InsightsPage } from "@/pages/InsightsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { LoadingSpinner } from "@/components/ui/loading";

/**
 * Wrapper for the home route that redirects authenticated users to /dashboard
 * and shows the landing page for unauthenticated users.
 */
function HomeRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <LandingLayout>
      <LandingPage />
    </LandingLayout>
  );
}

/**
 * Wrapper for public-only routes (login, register) that redirects
 * already-authenticated users to /dashboard.
 */
function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Home — redirects to dashboard if logged in */}
      <Route path="/" element={<HomeRoute />} />

      {/* Auth routes — redirect to dashboard if already logged in */}
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <AuthLayout>
              <LoginPage />
            </AuthLayout>
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <AuthLayout>
              <RegisterPage />
            </AuthLayout>
          </PublicOnlyRoute>
        }
      />

      {/* Demo route — accessible without auth */}
      <Route path="/demo" element={<DemoPage />} />

      {/* Protected routes with main layout */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Layout>
              <DashboardPage />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/transactions"
        element={
          <PrivateRoute>
            <Layout>
              <TransactionsPage />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/transactions/create"
        element={
          <PrivateRoute>
            <Layout>
              <CreateTransactionPage />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/budget"
        element={
          <PrivateRoute>
            <Layout>
              <BudgetPage />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <PrivateRoute>
            <Layout>
              <AnalyticsPage />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/goals"
        element={
          <PrivateRoute>
            <Layout>
              <GoalsPage />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/insights"
        element={
          <PrivateRoute>
            <Layout>
              <InsightsPage />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <PrivateRoute>
            <Layout>
              <ProfilePage />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <PrivateRoute>
            <Layout>
              <SettingsPage />
            </Layout>
          </PrivateRoute>
        }
      />

      {/* Catch all — redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
