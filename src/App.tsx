import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { RequireAuth } from './auth/RequireAuth';
import { PreferenceProvider } from './context/PreferenceContext';
import { TransactionProvider } from './context/TransactionContext';
import { SyncStatusProvider } from './context/SyncStatusContext';
import { ThemeProvider } from './context/ThemeProvider';
import { LayoutProvider } from './context/LayoutProvider';
import Landing from './routes/Landing';

const SignIn = lazy(() => import('./routes/SignIn'));
const AppShell = lazy(() => import('./routes/AppShell'));
const Dashboard = lazy(() => import('./routes/Dashboard'));
const TransactionList = lazy(() => import('./routes/TransactionList'));
const TransactionForm = lazy(() => import('./routes/TransactionForm'));
const Settings = lazy(() => import('./routes/Settings'));

const RouteFallback = () => (
  <div role="status" aria-live="polite" className="flex min-h-screen items-center justify-center text-slate-500">
    Loading…
  </div>
);

const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  {
    path: '/signin',
    element: (
      <Suspense fallback={<RouteFallback />}>
        <SignIn />
      </Suspense>
    ),
  },
  {
    path: '/app',
    element: (
      <Suspense fallback={<RouteFallback />}>
        <RequireAuth>
          <AppShell />
        </RequireAuth>
      </Suspense>
    ),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      {
        path: 'dashboard',
        element: (
          <Suspense fallback={<RouteFallback />}>
            <Dashboard />
          </Suspense>
        ),
      },
      {
        path: 'transactions',
        element: (
          <Suspense fallback={<RouteFallback />}>
            <TransactionList />
          </Suspense>
        ),
      },
      {
        path: 'transactions/new',
        element: (
          <Suspense fallback={<RouteFallback />}>
            <TransactionForm mode="add" />
          </Suspense>
        ),
      },
      {
        path: 'transactions/:id/edit',
        element: (
          <Suspense fallback={<RouteFallback />}>
            <TransactionForm mode="edit" />
          </Suspense>
        ),
      },
      {
        path: 'settings',
        element: (
          <Suspense fallback={<RouteFallback />}>
            <Settings />
          </Suspense>
        ),
      },
    ],
  },
]);

export default function App() {
  return (
    <AuthProvider>
      <SyncStatusProvider>
        <PreferenceProvider>
          <TransactionProvider>
            <ThemeProvider>
              <LayoutProvider>
                <RouterProvider router={router} />
              </LayoutProvider>
            </ThemeProvider>
          </TransactionProvider>
        </PreferenceProvider>
      </SyncStatusProvider>
    </AuthProvider>
  );
}
