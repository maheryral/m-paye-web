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
import Cards from './pages/app/Cards';
import Premium from './pages/app/Premium';
import MerchantSignup from './pages/app/MerchantSignup';
import SellerMode from './pages/app/SellerMode';
import AdminPayments from './pages/app/AdminPayments';
import AdminRevenue from './pages/app/AdminRevenue';
import QrPayment from './pages/app/QrPayment';
import Messages from './pages/app/Messages';
import Chat from './pages/app/Chat';
import Train from './pages/app/Train';
import Hotels from './pages/app/Hotels';
import FlightBooking from './pages/app/FlightBooking';
import TaxiBrousse from './pages/app/TaxiBrousse';
import TaxiBrousseVoyage from './pages/app/TaxiBrousseVoyage';
import TaxiBrousseReservations from './pages/app/TaxiBrousseReservations';
import Telepherique from './pages/app/Telepherique';
import TelepheriqueLigne from './pages/app/TelepheriqueLigne';
import TelepheriqueTickets from './pages/app/TelepheriqueTickets';
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
  { path: '/cards', element: protectedRoute(<Cards />) },
  { path: '/premium', element: protectedRoute(<Premium />) },
  { path: '/merchant-signup', element: protectedRoute(<MerchantSignup />) },
  { path: '/seller-mode', element: protectedRoute(<SellerMode />) },
  { path: '/admin-payments', element: protectedRoute(<AdminPayments />) },
  { path: '/admin-revenue', element: protectedRoute(<AdminRevenue />) },
  { path: '/qr-payment', element: protectedRoute(<QrPayment />) },
  { path: '/messages', element: protectedRoute(<Messages />) },
  { path: '/messages/:id', element: protectedRoute(<Chat />) },
  { path: '/train', element: protectedRoute(<Train />) },
  { path: '/hotels', element: protectedRoute(<Hotels />) },
  { path: '/flight-booking', element: protectedRoute(<FlightBooking />) },
  { path: '/taxi-brousse', element: protectedRoute(<TaxiBrousse />) },
  { path: '/taxi-brousse/voyage/:id', element: protectedRoute(<TaxiBrousseVoyage />) },
  { path: '/taxi-brousse/reservations', element: protectedRoute(<TaxiBrousseReservations />) },
  { path: '/telepherique', element: protectedRoute(<Telepherique />) },
  { path: '/telepherique/ligne/:id', element: protectedRoute(<TelepheriqueLigne />) },
  { path: '/telepherique/tickets', element: protectedRoute(<TelepheriqueTickets />) },

  { path: '*', element: <NotFound /> },
]);
