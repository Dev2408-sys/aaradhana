import { NavLink } from 'react-router-dom';
import { Ticket, Home, ListOrdered, MessageCircle, UserRound } from 'lucide-react';
import { resolveSellerNav, type SellerNavId } from '../../lib/seller-nav';
import { cn } from '../../lib/utils';

const links: Array<{
  id: SellerNavId;
  to: string;
  label: string;
  icon: typeof Home;
  emphasize?: boolean;
}> = [
  { id: 'home', to: '/seller', label: 'Home', icon: Home },
  { id: 'sell', to: '/seller/sell', label: 'Sell', icon: Ticket, emphasize: true },
  { id: 'sales', to: '/seller/sales', label: 'Sales', icon: ListOrdered },
  { id: 'support', to: '/seller/support', label: 'Support', icon: MessageCircle },
  { id: 'me', to: '/seller/profile', label: 'Me', icon: UserRound },
];

export function SellerBottomNav({ pathname }: { pathname: string }) {
  const active = resolveSellerNav(pathname);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[var(--z-nav)] border-t border-navy-700/10 bg-white shadow-[0_-6px_24px_rgba(11,18,32,0.06)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Seller navigation"
    >
      <div className="mx-auto flex h-[64px] w-full max-w-[1100px] items-stretch justify-around px-1">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = active === link.id;
          return (
            <NavLink
              key={link.id}
              to={link.to}
              end={link.id === 'home'}
              aria-current={isActive ? 'page' : undefined}
              className="flex min-w-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 px-1"
            >
              <span
                className={cn(
                  'relative flex h-9 w-9 items-center justify-center rounded-xl transition duration-[var(--duration-fast)]',
                  isActive && 'bg-orange-500 text-white shadow-md shadow-orange-500/25',
                  !isActive && link.emphasize && 'bg-navy-950 text-white',
                  !isActive && !link.emphasize && 'text-navy-700/40',
                )}
              >
                <Icon
                  className="h-[20px] w-[20px]"
                  strokeWidth={isActive || link.emphasize ? 2.35 : 2}
                  aria-hidden
                />
              </span>
              <span
                className={cn(
                  'text-[10px] font-semibold uppercase tracking-wide',
                  isActive ? 'text-orange-600' : 'text-navy-700/40',
                )}
              >
                {link.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
