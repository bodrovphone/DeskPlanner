import { createBrowserRouter, Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
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

const LoadingScreen = ({ message = 'Loading...' }: { message?: string }) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
      <p className="text-gray-600">{message}</p>
    </div>
  </div>
);

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
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <OrganizationProvider>
      <Outlet />
    </OrganizationProvider>
  );
}

/** Resolves /:orgSlug param, sets currentOrg, redirects if slug is invalid */
function OrgSlugGate() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const { currentOrg, organizations, setCurrentOrg, loading, hasOrganization } = useOrganization();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen message="Loading workspace..." />;
  }

  if (!hasOrganization) {
    return <Navigate to="/onboarding" replace />;
  }

  // Try to find the org matching the URL slug
  const matchedOrg = organizations.find(o => o.slug === orgSlug);

  if (matchedOrg) {
    // Switch to the matched org if it's different from current
    if (currentOrg?.id !== matchedOrg.id) {
      setCurrentOrg(matchedOrg);
    }
    return (
      <DataStoreProvider>
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </DataStoreProvider>
    );
  }

  // Slug doesn't match any user org — redirect to current org's slug
  const fallbackOrg = currentOrg || organizations[0];
  const subPath = location.pathname.split('/').slice(2).join('/');
  return <Navigate to={`/${fallbackOrg.slug}/${subPath}`} replace />;
}

/** Gate for onboarding — no slug needed, just auth + org context */
function OnboardingGate() {
  const { hasOrganization, loading } = useOrganization();

  if (loading) {
    return <LoadingScreen message="Loading workspace..." />;
  }

  return <Outlet />;
}

/** Resolves /app and /app/* to the correct slug-based route */
function AppResolver() {
  const { currentOrg, loading, hasOrganization } = useOrganization();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!hasOrganization) {
    return <Navigate to="/onboarding" replace />;
  }

  const org = currentOrg!;
  // Extract sub-path after /app (e.g., /app/calendar → calendar)
  const match = location.pathname.match(/^\/app(?:\/(.+))?$/);
  const subPath = match?.[1] || 'calendar';

  return <Navigate to={`/${org.slug}/${subPath}`} replace />;
}

function PublicOnlyRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (user) {
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
}

function LandingRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (user) {
    return <Navigate to="/app" replace />;
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
        // Onboarding — protected but no slug
        {
          path: '/onboarding',
          element: <ProtectedRoute />,
          children: [
            {
              element: <OnboardingGate />,
              children: [
                {
                  index: true,
                  element: <OnboardingPage />,
                },
              ],
            },
          ],
        },
        // /app resolver — redirects to slug-based routes
        {
          path: '/app',
          element: <ProtectedRoute />,
          children: [
            // /app and /app/* catch-all → redirect to /:slug/...
            {
              index: true,
              element: <AppResolver />,
            },
            {
              path: '*',
              element: <AppResolver />,
            },
          ],
        },
        // Slug-based routes
        {
          path: '/:orgSlug',
          element: <ProtectedRoute />,
          children: [
            {
              element: <OrgSlugGate />,
              children: [
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
    },
  ],
  { basename }
);
