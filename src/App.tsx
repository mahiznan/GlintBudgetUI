import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { RequireAuth } from './auth/RequireAuth';
import Landing from './routes/Landing';

const SignIn = lazy(() => import('./routes/SignIn'));
const AppShell = lazy(() => import('./routes/AppShell'));

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
  },
]);

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
