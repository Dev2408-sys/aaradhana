export type SellerNavId = 'home' | 'sell' | 'sales' | 'support' | 'me';

/** Resolve exactly one primary seller bottom-nav item from the current path. */
export function resolveSellerNav(pathname: string): SellerNavId {
  if (pathname.startsWith('/seller/sell')) return 'sell';
  if (pathname.startsWith('/seller/sales')) return 'sales';
  if (pathname.startsWith('/seller/support')) return 'support';
  if (pathname.startsWith('/seller/profile')) return 'me';
  if (pathname === '/seller' || pathname === '/seller/') return 'home';
  return 'home';
}

export type SellerPageMeta = {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  backTo?: string;
  /** Home uses greeting header instead of page title bar */
  variant: 'home' | 'page';
};

export function resolveSellerPageMeta(pathname: string): SellerPageMeta {
  if (pathname === '/seller' || pathname === '/seller/') {
    return { title: 'Home', variant: 'home' };
  }
  if (pathname.startsWith('/seller/sell')) {
    return {
      title: 'Sell Ticket',
      subtitle: 'Guided booking',
      showBack: true,
      backTo: '/seller',
      variant: 'page',
    };
  }
  if (/^\/seller\/sales\/[^/]+/.test(pathname)) {
    return {
      title: 'Sale Details',
      showBack: true,
      backTo: '/seller/sales',
      variant: 'page',
    };
  }
  if (pathname.startsWith('/seller/sales')) {
    return {
      title: 'My Sales',
      subtitle: 'Your bookings',
      showBack: true,
      backTo: '/seller',
      variant: 'page',
    };
  }
  if (pathname.startsWith('/seller/support')) {
    return {
      title: 'Need Help?',
      subtitle: "We're here to help with your booking, payment or ticket.",
      showBack: true,
      backTo: '/seller',
      variant: 'page',
    };
  }
  if (pathname.startsWith('/seller/profile')) {
    return {
      title: 'My Profile',
      showBack: true,
      backTo: '/seller',
      variant: 'page',
    };
  }
  return { title: 'Seller', showBack: true, backTo: '/seller', variant: 'page' };
}
