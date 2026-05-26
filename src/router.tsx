import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import { GuestOnlyRoute, ProtectedRoute } from './components/ProtectedRoute';

// Auth
import ForgotPassword from './pages/auth/ForgotPassword';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// App
import AdminPayments from './pages/app/AdminPayments';
import AdminRevenue from './pages/app/AdminRevenue';
import Beneficiaries from './pages/app/Beneficiaries';
import Bills from './pages/app/Bills';
import Cards from './pages/app/Cards';
import Chat from './pages/app/Chat';
import CompleteProfile from './pages/app/CompleteProfile';
import Dashboard from './pages/app/Dashboard';
import FlightBooking from './pages/app/FlightBooking';
import History from './pages/app/History';
import Hotels from './pages/app/Hotels';
import MerchantSignup from './pages/app/MerchantSignup';
import Messages from './pages/app/Messages';
import Notifications from './pages/app/Notifications';
import Portfolio from './pages/app/Portfolio';
import Premium from './pages/app/Premium';
import Profile from './pages/app/Profile';
import QrPayment from './pages/app/QrPayment';
import Security from './pages/app/Security';
import SellerMode from './pages/app/SellerMode';
import Settings from './pages/app/Settings';
import TaxiBrousse from './pages/app/TaxiBrousse';
import TaxiBrousseReservations from './pages/app/TaxiBrousseReservations';
import TaxiBrousseVoyage from './pages/app/TaxiBrousseVoyage';
import Telepherique from './pages/app/Telepherique';
import TelepheriqueLigne from './pages/app/TelepheriqueLigne';
import TelepheriqueTickets from './pages/app/TelepheriqueTickets';
import Train from './pages/app/Train';
import Transfers from './pages/app/Transfers';

import NotFound from './pages/NotFound';

const guest = (el: React.ReactNode) => <GuestOnlyRoute>{el}</GuestOnlyRoute>;

export const router = createBrowserRouter([
  // Root → dashboard
  { path: '/', element: <Navigate to="/dashboard" replace /> },

  // Auth (no shell)
  { path: '/auth/login', element: guest(<Login />) },
  { path: '/auth/register', element: guest(<Register />) },
  { path: '/auth/forgot-password', element: guest(<ForgotPassword />) },

  // App shell — toutes les pages protégées sont enfants de AppLayout
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: '/dashboard', element: <Dashboard /> },
      { path: '/portfolio', element: <Portfolio /> },
      { path: '/transfers', element: <Transfers /> },
      { path: '/history', element: <History /> },
      { path: '/qr-payment', element: <QrPayment /> },
      { path: '/cards', element: <Cards /> },
      { path: '/beneficiaries', element: <Beneficiaries /> },
      { path: '/bills', element: <Bills /> },
      { path: '/seller-mode', element: <SellerMode /> },
      { path: '/merchant-signup', element: <MerchantSignup /> },
      { path: '/premium', element: <Premium /> },
      { path: '/messages', element: <Messages /> },
      { path: '/messages/:id', element: <Chat /> },
      { path: '/notifications', element: <Notifications /> },
      { path: '/taxi-brousse', element: <TaxiBrousse /> },
      { path: '/taxi-brousse/voyage/:id', element: <TaxiBrousseVoyage /> },
      { path: '/taxi-brousse/reservations', element: <TaxiBrousseReservations /> },
      { path: '/telepherique', element: <Telepherique /> },
      { path: '/telepherique/ligne/:id', element: <TelepheriqueLigne /> },
      { path: '/telepherique/tickets', element: <TelepheriqueTickets /> },
      { path: '/train', element: <Train /> },
      { path: '/hotels', element: <Hotels /> },
      { path: '/flight-booking', element: <FlightBooking /> },
      { path: '/profile', element: <Profile /> },
      { path: '/settings', element: <Settings /> },
      { path: '/security', element: <Security /> },
      { path: '/complete-profile', element: <CompleteProfile /> },
      { path: '/admin-payments', element: <AdminPayments /> },
      { path: '/admin-revenue', element: <AdminRevenue /> },
    ],
  },

  { path: '*', element: <NotFound /> },
]);
