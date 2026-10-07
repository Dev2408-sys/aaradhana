import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Phone } from 'lucide-react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { getErrorMessage } from '../api/client';
import { AuthBrandPanel } from '../components/auth/AuthBrandPanel';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import type { UserRole } from '../types/auth';
import { BRAND } from '../lib/brand';

const loginSchema = z.object({
  mobile: z.string().min(10, 'Enter a valid 10-digit mobile'),
  password: z.string().min(6, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

type LoginLocationState = {
  mobile?: string;
  password?: string;
  notice?: string;
};

function dashboardPathForRole(role: UserRole) {
  if (role === 'SUPER_ADMIN' || role === 'ADMIN') return '/admin';
  return '/seller';
}

export function LoginPage() {
  const { login, isAuthenticated, isLoading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as LoginLocationState | null) ?? null;
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(state?.notice ?? null);
  const [showPassword, setShowPassword] = useState(false);
  const [inviteCode, setInviteCode] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      mobile: state?.mobile ?? '',
      password: state?.password ?? '',
    },
  });

  useEffect(() => {
    if (state?.mobile) setValue('mobile', state.mobile);
    if (state?.password) setValue('password', state.password);
    if (state?.notice) setNotice(state.notice);
  }, [state, setValue]);

  if (!isLoading && isAuthenticated && user) {
    return <Navigate to={dashboardPathForRole(user.role)} replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    setNotice(null);
    try {
      const loggedIn = await login(values.mobile.trim(), values.password);
      navigate(dashboardPathForRole(loggedIn.role), { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Login failed'));
    }
  });

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <AuthBrandPanel
        title="Seller / Admin login"
        subtitle="Book Gold & VIP tickets, manage approvals, and run event operations — all in one place."
      />

      {/* Mobile brand strip (desktop panel is lg+) */}
      <div className="border-b border-navy-700/8 bg-[#2E0F63] px-5 py-5 lg:hidden">
        <Link to="/" className="inline-flex items-center gap-3">
          <img src={BRAND.logoSrc} alt={BRAND.eventFull} className="h-11 w-auto" />
          <span className="h-8 w-px bg-[#F6C243]/50" aria-hidden />
          <img
            src={BRAND.aaradhanaLogoSrc}
            alt={BRAND.group}
            className="h-11 w-11 rounded-full ring-1 ring-[#F6C243]/50"
          />
          <span>
            <span className="block font-display text-sm font-bold text-white">
              {BRAND.eventShort}
            </span>
            <span className="block text-xs font-semibold text-[#F6C243]">{BRAND.group}</span>
          </span>
        </Link>
      </div>

      <div className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md space-y-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-600">
              {BRAND.shortWithGroup}
            </p>
            <h2 className="font-display mt-1 text-2xl font-bold text-navy-900">Welcome back</h2>
            <p className="mt-1 text-sm text-navy-700/65">
              Use your registered mobile and password.
            </p>
          </div>

          {notice && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {notice}
            </div>
          )}

          <form className="space-y-4" onSubmit={onSubmit} noValidate>
            <div>
              <Label htmlFor="mobile">Mobile number</Label>
              <Input
                id="mobile"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="10-digit mobile"
                {...register('mobile')}
              />
              {errors.mobile && (
                <p className="mt-1 text-xs text-red-600">{errors.mobile.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="pr-11"
                  {...register('password')}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-navy-700/50"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <div className="rounded-2xl border border-navy-700/10 bg-white p-4">
            <p className="text-sm font-semibold text-navy-900">New seller?</p>
            <p className="mt-1 text-xs text-navy-700/60">
              Join with your master seller invite code, complete your profile, then wait for
              activation.
            </p>
            <div className="mt-3 flex gap-2">
              <Input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="Invite code e.g. KSR001"
                className="font-mono uppercase"
              />
              <Button
                type="button"
                variant="secondary"
                disabled={inviteCode.trim().length < 3}
                onClick={() => navigate(`/seller/join/${inviteCode.trim()}`)}
              >
                Join
              </Button>
            </div>
          </div>

          {/* Seller / dealer support — matches brand purple panel */}
          <div className="overflow-hidden rounded-2xl bg-[#2E0F63] text-[#FFF4E2] shadow-[0_12px_32px_rgba(46,15,99,0.22)]">
            <div className="h-1 w-full bg-gradient-to-r from-[#F6C243] via-[#F0801A] to-[#F6C243]" />
            <div className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#F6C243]">
                    Seller &amp; dealer support
                  </p>
                  <p className="font-display mt-1 text-lg font-bold text-white">
                    Talk to {BRAND.group}
                  </p>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 ring-1 ring-[#F6C243]/35">
                  <Phone className="h-4 w-4 text-[#F6C243]" aria-hidden />
                </span>
              </div>

              <p className="mt-2 text-xs leading-relaxed text-[#FFF4E2]/70">
                Invite code, login help, or dealer onboarding — reply in minutes on WhatsApp.
              </p>

              <a
                href={`tel:${BRAND.supportPhoneTel}`}
                className="mt-3 flex items-center gap-2 rounded-xl bg-white/8 px-3 py-2.5 ring-1 ring-white/10 transition hover:bg-white/12"
              >
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[#FFF4E2]/45">
                  Call / WhatsApp
                </span>
                <span className="ml-auto font-mono text-base font-bold tracking-wide text-white">
                  {BRAND.supportPhoneDisplay}
                </span>
              </a>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <a
                  href={`tel:${BRAND.supportPhoneTel}`}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#F6C243]/45 bg-transparent text-sm font-semibold text-[#F6C243] transition hover:bg-[#F6C243]/10"
                >
                  <Phone className="h-4 w-4" aria-hidden />
                  Call
                </a>
                <a
                  href={`https://wa.me/${BRAND.supportWhatsApp}?text=${encodeURIComponent(
                    `Hello ${BRAND.group} — I need help with Kesariya seller / dealer access.`,
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#25D366] text-sm font-bold text-white transition hover:bg-[#1ebe57]"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
                    <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2zm5.6 14.1c-.2.7-1.4 1.3-2 1.4-.5 0-1.1.2-3.6-.8-3-1.3-4.9-4.4-5-4.6-.2-.2-1.2-1.6-1.2-3s.7-2.1 1-2.4c.2-.3.5-.4.7-.4h.5c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .5l-.4.6-.3.3c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.4.1.6-.1l.9-1c.2-.2.4-.2.6-.1l2 1c.2.1.4.2.4.3.1.1.1.6-.1 1.3z" />
                  </svg>
                  WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
