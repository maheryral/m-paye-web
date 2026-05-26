import { createBrowserRouter, Navigate } from 'react-router-dom';
import { GuestOnlyRoute, ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import Dashboard from './pages/app/Dashboard';
import Notifications from './pages/app/Notifications';
import Portfolio from './pages/app/Portfolio';
import History from './pages/app/History';
import Transfers from './pages/app/Transfers';
import Profile from './pages/app/Profile';
import Settings from './pages/app/Settings';
import Bills from './pages/app/Bills';
import Beneficiaries from './pages/app/Beneficiaries';
import Security from './pages/app/Security';
import CompleteProfile from './pages/app/CompleteProfile';
import NotFound from './pages/NotFound';

const protectedRoute = (element: React.ReactNode) => (
  <ProtectedRoute>{element}</ProtectedRoute>
);

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/dashboard" replace /> },

  {
    path: '/auth/login',
    element: (
      <GuestOnlyRoute>
        <Login />
      </GuestOnlyRoute>
    ),
  },
  {
    path: '/auth/register',
    element: (
      <GuestOnlyRoute>
        <Register />
      </GuestOnlyRoute>
    ),
  },
  {
    path: '/auth/forgot-password',
    element: (
      <GuestOnlyRoute>
        <ForgotPassword />
      </GuestOnlyRoute>
    ),
  },

  { path: '/dashboard', element: protectedRoute(<Dashboard />) },
  { path: '/notifications', element: protectedRoute(<Notifications />) },
  { path: '/portfolio', element: protectedRoute(<Portfolio />) },
  { path: '/history', element: protectedRoute(<History />) },
  { path: '/transfers', element: protectedRoute(<Transfers />) },
  { path: '/profile', element: protectedRoute(<Profile />) },
  { path: '/settings', element: protectedRoute(<Settings />) },
  { path: '/bills', element: protectedRoute(<Bills />) },
  { path: '/beneficiaries', element: protectedRoute(<Beneficiaries />) },
  { path: '/security', element: protectedRoute(<Security />) },
  { path: '/complete-profile', element: protectedRoute(<CompleteProfile />) },

  { path: '*', element: <NotFound /> },
]);
