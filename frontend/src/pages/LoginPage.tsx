import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Headphones, MessageCircle } from 'lucide-react';
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
            <p className="mt-3 text-xs text-navy-700/50">
              After activation, sign in here and keep your profile & password updated.
            </p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-orange-50 p-4 shadow-[0_8px_24px_rgba(16,185,129,0.08)]">
            <div
              className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#25D366]/15 blur-2xl"
              aria-hidden
            />
            <div className="relative flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#25D366] text-white shadow-md shadow-emerald-500/30">
                <Headphones className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  Seller &amp; dealer support
                </p>
                <p className="mt-0.5 font-display text-base font-bold text-navy-900">
                  Need help joining or selling?
                </p>
                <p className="mt-1 text-xs leading-relaxed text-navy-700/65">
                  WhatsApp on our support line for invite codes, login help, and dealer onboarding.
                </p>
                <a
                  href={`tel:${BRAND.supportPhoneTel}`}
                  className="mt-2 inline-block font-mono text-sm font-bold text-navy-900 hover:text-orange-600"
                >
                  {BRAND.supportPhoneDisplay}
                </a>
              </div>
            </div>
            <a
              href={`https://wa.me/${BRAND.supportWhatsApp}?text=${encodeURIComponent(
                `Hello ${BRAND.group} support — I need help with Kesariya seller / dealer access.`,
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="relative mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] text-sm font-bold text-white shadow-md shadow-emerald-500/25 transition hover:bg-[#1ebe57]"
            >
              <MessageCircle className="h-4 w-4" aria-hidden />
              WhatsApp support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
