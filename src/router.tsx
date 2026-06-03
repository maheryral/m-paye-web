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
import Chat from './pages/app/Chat';
import CompleteProfile from './pages/app/CompleteProfile';
import FaceLiveness from './pages/app/FaceLiveness';
import Dashboard from './pages/app/Dashboard';
import MerchantDashboard from './pages/app/merchant/Dashboard';
import MerchantTransactions from './pages/app/merchant/Transactions';
import MerchantProducts from './pages/app/merchant/Products';
import MerchantStores from './pages/app/merchant/Stores';
import MerchantBalance from './pages/app/merchant/Balance';
import MerchantCoupons from './pages/app/merchant/Coupons';
import MerchantPaymentLinks from './pages/app/merchant/PaymentLinks';
import MerchantLoyalty from './pages/app/merchant/Loyalty';
import MerchantWithdraw from './pages/app/merchant/Withdraw';
import MerchantRefunds from './pages/app/merchant/Refunds';
import MerchantScanner from './pages/app/merchant/Scanner';
import MerchantAnalytics from './pages/app/merchant/Analytics';
import MerchantReports from './pages/app/merchant/Reports';
import MerchantEmployees from './pages/app/merchant/Employees';
import MerchantNotifications from './pages/app/merchant/Notifications';
import MerchantHelp from './pages/app/merchant/Help';
import Loyalty from './pages/app/Loyalty';
import PayLink from './pages/app/PayLink';
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

  // Page de paiement (lien partagé) — protégée mais sans shell
  {
    path: '/pay/:reference',
    element: (
      <ProtectedRoute>
        <PayLink />
      </ProtectedRoute>
    ),
  },

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
      { path: '/beneficiaries', element: <Beneficiaries /> },
      { path: '/loyalty', element: <Loyalty /> },
      { path: '/bills', element: <Bills /> },
      { path: '/seller-mode', element: <SellerMode /> },
      { path: '/merchant-signup', element: <MerchantSignup /> },
      { path: '/merchant', element: <MerchantDashboard /> },
      { path: '/merchant/payment-links', element: <MerchantPaymentLinks /> },
      { path: '/merchant/scanner', element: <MerchantScanner /> },
      { path: '/merchant/analytics', element: <MerchantAnalytics /> },
      { path: '/merchant/withdraw', element: <MerchantWithdraw /> },
      { path: '/merchant/refunds', element: <MerchantRefunds /> },
      { path: '/merchant/reports', element: <MerchantReports /> },
      { path: '/merchant/employees', element: <MerchantEmployees /> },
      { path: '/merchant/notifications', element: <MerchantNotifications /> },
      { path: '/merchant/help', element: <MerchantHelp /> },
      { path: '/merchant/loyalty', element: <MerchantLoyalty /> },
      { path: '/merchant/transactions', element: <MerchantTransactions /> },
      { path: '/merchant/products', element: <MerchantProducts /> },
      { path: '/merchant/stores', element: <MerchantStores /> },
      { path: '/merchant/balance', element: <MerchantBalance /> },
      { path: '/merchant/coupons', element: <MerchantCoupons /> },
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
      { path: '/kyc-liveness', element: <FaceLiveness /> },
      { path: '/admin-payments', element: <AdminPayments /> },
      { path: '/admin-revenue', element: <AdminRevenue /> },
    ],
  },

  { path: '*', element: <NotFound /> },
]);
