import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { OrganizationProvider, useOrganization } from '@/contexts/OrganizationContext';
import { DataStoreProvider } from '@/contexts/DataStoreContext';
import { Loader2 } from 'lucide-react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import LandingPage from '@/pages/landing';
import DeskCalendar from '@/pages/desk-calendar';
import OnboardingPage from '@/pages/onboarding';
import DashboardLayout from '@/layouts/DashboardLayout';
import RevenuePage from '@/pages/revenue';
import WaitingListPage from '@/pages/waiting-list';
import SettingsPage from '@/pages/settings';
import InsightsPage from '@/pages/insights';

function AuthLayout() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <OrganizationProvider>
      <OrgGate />
    </OrganizationProvider>
  );
}

function OrgGate() {
  const { hasOrganization, loading } = useOrganization();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading workspace...</p>
        </div>
      </div>
    );
  }

  // If no org and not already on onboarding, redirect
  if (!hasOrganization && !location.pathname.endsWith('/onboarding')) {
    return <Navigate to="/app/onboarding" replace />;
  }

  return (
    <DataStoreProvider>
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
    </DataStoreProvider>
  );
}

function PublicOnlyRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/app/calendar" replace />;
  }

  return <Outlet />;
}

function LandingRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If logged in, go straight to app
  if (user) {
    return <Navigate to="/app/calendar" replace />;
  }

  return <LandingPage />;
}

const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

export const router = createBrowserRouter(
  [
    {
      element: <AuthLayout />,
      children: [
        {
          path: '/',
          element: <LandingRoute />,
        },
        {
          element: <PublicOnlyRoute />,
          children: [
            {
              path: '/login',
              lazy: () => import('@/pages/auth/login').then(m => ({ Component: m.default })),
            },
            {
              path: '/signup',
              lazy: () => import('@/pages/auth/signup').then(m => ({ Component: m.default })),
            },
          ],
        },
        {
          path: '/app',
          element: <ProtectedRoute />,
          children: [
            {
              path: 'onboarding',
              element: <OnboardingPage />,
            },
            {
              element: <DashboardLayout />,
              children: [
                {
                  path: 'calendar',
                  element: <DeskCalendar />,
                },
                {
                  path: 'insights',
                  element: <InsightsPage />,
                },
                {
                  path: 'revenue',
                  element: <RevenuePage />,
                },
                {
                  path: 'waiting-list',
                  element: <WaitingListPage />,
                },
                {
                  path: 'settings',
                  element: <SettingsPage />,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  { basename }
);
