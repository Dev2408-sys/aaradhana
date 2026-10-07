import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { resolveSellerPageMeta } from '../../lib/seller-nav';
import { PageContainer, type PageContainerSize } from '../ui/page-container';
import { SellerBottomNav } from './SellerBottomNav';
import { SellerHomeHeader, SellerMobileHeader } from './SellerMobileHeader';

function containerForPath(pathname: string): PageContainerSize {
  if (pathname.startsWith('/seller/sell')) return 'sell';
  if (pathname.startsWith('/seller/support')) return 'support';
  if (pathname.startsWith('/seller/sales')) return 'sales';
  if (pathname.startsWith('/seller/profile')) return 'md';
  return 'md';
}

export function SellerShell() {
  const { user } = useAuth();
  const location = useLocation();
  const meta = resolveSellerPageMeta(location.pathname);
  const firstName = (user?.name ?? 'Seller').split(' ')[0];
  const size = containerForPath(location.pathname);

  return (
    <div
      className="relative min-h-screen w-full bg-transparent"
      style={{
        /* Bottom nav = 64px + safe area; keep content clear */
        paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))',
      }}
    >
      {meta.variant === 'home' ? (
        <SellerHomeHeader firstName={firstName} />
      ) : (
        <SellerMobileHeader
          title={meta.title}
          subtitle={meta.subtitle}
          showBack={meta.showBack}
          backTo={meta.backTo}
        />
      )}

      <main className="relative z-10 w-full pt-4">
        {/* PageContainer already applies horizontal padding — do not double it */}
        <PageContainer size={size}>
          <Outlet />
        </PageContainer>
      </main>

      <SellerBottomNav pathname={location.pathname} />
    </div>
  );
}
