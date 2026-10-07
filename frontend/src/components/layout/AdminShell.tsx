import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Bell,
  ClipboardCheck,
  Users,
  ShoppingBag,
  Ticket,
  Tag,
  QrCode,
  Wallet,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { fetchNotificationBadges } from '../../api/notifications';
import { useAuth } from '../../features/auth/AuthContext';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

function BadgeCount({ count }: { count: number }) {
  if (!count || count <= 0) return null;
  return (
    <span className="ml-auto inline-flex min-w-[1.25rem] items-center justify-center rounded-md bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
      {count > 99 ? '99+' : count}
    </span>
  );
}

function isAdminLinkActive(pathname: string, search: string, to: string, end?: boolean) {
  const [path, query] = to.split('?');
  if (end) return pathname === path || pathname === `${path}/`;
  if (query?.includes('saleStatus=PENDING')) {
    return pathname.startsWith('/admin/sales') && search.includes('saleStatus=PENDING');
  }
  if (path === '/admin/sales') {
    return (
      pathname.startsWith('/admin/sales') &&
      !search.includes('saleStatus=PENDING')
    );
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function AdminShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const badgesQuery = useQuery({
    queryKey: ['admin-badges'],
    queryFn: fetchNotificationBadges,
    refetchInterval: 30_000,
  });
  const badges = badgesQuery.data;

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  const links = [
    { to: '/admin', label: 'Dashboard', end: true, count: 0, icon: LayoutDashboard },
    {
      to: '/admin/notifications',
      label: 'Notifications',
      end: false,
      count: badges?.unreadCount ?? 0,
      icon: Bell,
    },
    {
      to: '/admin/sales?saleStatus=PENDING',
      label: 'Approvals',
      end: false,
      count: badges?.pendingApprovals ?? 0,
      icon: ClipboardCheck,
    },
    {
      to: '/admin/sellers',
      label: 'Sellers',
      end: false,
      count: badges?.pendingSellers ?? 0,
      icon: Users,
    },
    { to: '/admin/sales', label: 'Sales', end: false, count: 0, icon: ShoppingBag },
    {
      to: '/admin/tickets',
      label: 'Tickets',
      end: false,
      count: badges?.readyToSend ?? 0,
      icon: Ticket,
    },
    { to: '/admin/pricing', label: 'Pricing', end: false, count: 0, icon: Tag },
    { to: '/admin/payment-settings', label: 'Payment', end: false, count: 0, icon: QrCode },
    { to: '/admin/accounting', label: 'Accounting', end: false, count: 0, icon: Wallet },
  ];

  const nav = (
    <>
      <div className="px-5 py-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-400">
          Kesariya 4.0 · Aaradhana Group
        </p>
        <h1 className="font-display mt-1 text-lg font-semibold">Event Control</h1>
        {(badges?.pendingApprovals ?? 0) > 0 && (
          <p className="mt-3 rounded-[var(--radius-md)] bg-orange-500/20 px-2.5 py-1.5 text-xs font-semibold text-orange-300">
            {badges!.pendingApprovals} pending approval
            {badges!.pendingApprovals === 1 ? '' : 's'}
          </p>
        )}
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-4 scrollbar-none">
        {links.map((link) => {
          const Icon = link.icon;
          const active = isAdminLinkActive(
            location.pathname,
            location.search,
            link.to,
            link.end,
          );
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={cn(
                'flex items-center gap-2.5 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium transition',
                active
                  ? 'bg-orange-500/15 text-orange-400'
                  : 'text-white/65 hover:bg-white/5 hover:text-white',
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
              <span>{link.label}</span>
              <BadgeCount count={link.count} />
            </NavLink>
          );
        })}
      </nav>
      <div className="border-t border-white/10 px-4 py-3">
        <p className="truncate text-sm font-semibold">{user?.name}</p>
        <p className="text-[11px] text-white/45">{user?.role?.replace('_', ' ')}</p>
      </div>
    </>
  );

  return (
    <div className="min-h-screen md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-[260px] shrink-0 flex-col border-r border-navy-700/10 bg-navy-950 text-white md:sticky md:top-0 md:flex md:h-screen">
        {nav}
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[var(--z-modal)] md:hidden" role="dialog" aria-modal>
          <button
            type="button"
            className="absolute inset-0 bg-navy-950/55"
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(86vw,280px)] flex-col bg-navy-950 text-white shadow-[var(--shadow-elevated)] animate-kesariya-in">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <p className="font-display font-semibold">Menu</p>
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] text-white/80"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {nav}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-navy-700/10 bg-white/95 px-3 py-2.5 backdrop-blur-md sm:px-6 md:px-8 pt-[max(0.5rem,env(safe-area-inset-top))]">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] text-navy-800 hover:bg-navy-800/5 md:hidden"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-navy-900">
                Kesariya Navratri 4.0 · Aaradhana Group
              </p>
              <p className="truncate text-xs text-navy-700/50">11–20 Oct 2026 · Surat</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <NavLink
              to="/admin/notifications"
              className="relative flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] text-navy-800 hover:bg-navy-800/5"
              aria-label="Notifications"
            >
              <Bell className="h-[18px] w-[18px]" />
              {(badges?.unreadCount ?? 0) > 0 && (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-orange-500" />
              )}
            </NavLink>
            {(badges?.pendingApprovals ?? 0) > 0 && (
              <NavLink
                to="/admin/sales?saleStatus=PENDING"
                className="hidden rounded-[var(--radius-md)] bg-orange-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm sm:inline-flex"
              >
                {badges!.pendingApprovals} to approve
              </NavLink>
            )}
            <Button variant="outline" size="sm" onClick={() => void logout()} className="hidden sm:inline-flex">
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-11 w-11 p-0 sm:hidden"
              onClick={() => void logout()}
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1440px] flex-1 overflow-x-hidden px-4 py-5 sm:px-6 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
