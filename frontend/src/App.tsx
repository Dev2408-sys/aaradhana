import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './features/auth/AuthContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { AdminShell } from './components/layout/AdminShell';
import { SellerShell } from './components/layout/SellerShell';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { AdminHomePage } from './pages/AdminHomePage';
import { AdminSellersPage } from './pages/admin/AdminSellersPage';
import { AdminSellerDetailPage } from './pages/admin/AdminSellerDetailPage';
import { AdminSalesPage } from './pages/admin/AdminSalesPage';
import { AdminSaleDetailPage } from './pages/admin/AdminSaleDetailPage';
import { AdminCreateSalePage } from './pages/admin/AdminCreateSalePage';
import { AdminTicketsPage } from './pages/admin/AdminTicketsPage';
import { AdminAccountingPage } from './pages/admin/AdminAccountingPage';
import { AdminAccountingSellersPage } from './pages/admin/AdminAccountingSellersPage';
import { AdminAccountingSellerDetailPage } from './pages/admin/AdminAccountingSellerDetailPage';
import { AdminAccountingPaymentsPage } from './pages/admin/AdminAccountingPaymentsPage';
import { AdminPricingPage } from './pages/admin/AdminPricingPage';
import { AdminPaymentSettingsPage } from './pages/admin/AdminPaymentSettingsPage';
import { AdminNotificationsPage } from './pages/admin/AdminNotificationsPage';
import { SellerHomePage } from './pages/SellerHomePage';
import { SellerProfilePage } from './pages/seller/SellerProfilePage';
import { SellerJoinPage } from './pages/seller/SellerJoinPage';
import { SellerSellPage } from './pages/seller/SellerSellPage';
import { SellerSalesPage } from './pages/seller/SellerSalesPage';
import { SellerSaleDetailPage } from './pages/seller/SellerSaleDetailPage';
import { SellerSupportPage } from './pages/seller/SellerSupportPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            <Route path="/seller/join/:sellerCode" element={<SellerJoinPage />} />

            <Route element={<ProtectedRoute roles={['SUPER_ADMIN', 'ADMIN']} />}>
              <Route path="/admin" element={<AdminShell />}>
                <Route index element={<AdminHomePage />} />
                <Route path="notifications" element={<AdminNotificationsPage />} />
                <Route path="sellers" element={<AdminSellersPage />} />
                <Route path="sellers/:id" element={<AdminSellerDetailPage />} />
                <Route path="sales" element={<AdminSalesPage />} />
                <Route path="sales/create" element={<AdminCreateSalePage />} />
                <Route path="sales/:id" element={<AdminSaleDetailPage />} />
                <Route path="tickets" element={<AdminTicketsPage />} />
                <Route path="pricing" element={<AdminPricingPage />} />
                <Route path="payment-settings" element={<AdminPaymentSettingsPage />} />
                <Route path="accounting" element={<AdminAccountingPage />} />
                <Route path="accounting/sellers" element={<AdminAccountingSellersPage />} />
                <Route
                  path="accounting/sellers/:id"
                  element={<AdminAccountingSellerDetailPage />}
                />
                <Route path="accounting/payments" element={<AdminAccountingPaymentsPage />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute roles={['MASTER_SELLER', 'SELLER']} />}>
              <Route path="/seller" element={<SellerShell />}>
                <Route index element={<SellerHomePage />} />
                <Route path="sell" element={<SellerSellPage />} />
                <Route path="sales" element={<SellerSalesPage />} />
                <Route path="sales/:id" element={<SellerSaleDetailPage />} />
                <Route path="support" element={<SellerSupportPage />} />
                <Route path="profile" element={<SellerProfilePage />} />
                {/* Legacy seller finance/dashboard/team → home */}
                <Route path="dashboard" element={<Navigate to="/seller" replace />} />
                <Route path="finance/*" element={<Navigate to="/seller" replace />} />
                <Route path="team" element={<Navigate to="/seller" replace />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
