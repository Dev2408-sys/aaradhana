import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { getErrorMessage } from '../api/client';
import { AuthBrandPanel } from '../components/auth/AuthBrandPanel';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import type { UserRole } from '../types/auth';
import { DEV_LOGIN_ACCOUNTS } from '../lib/navratri-days';

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
  const [showDemo, setShowDemo] = useState(false);
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
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      <AuthBrandPanel
        title="Seller / Admin login"
        subtitle="Sign in to book Gold & VIP tickets, manage approvals, or run event operations for Kesariya Navratri 4.0."
      />

      <div className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md space-y-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-600">
              Kesariya 4.0
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

          <div>
            <button
              type="button"
              className="text-xs font-semibold text-navy-700/50 hover:text-orange-600"
              onClick={() => setShowDemo((v) => !v)}
            >
              {showDemo ? 'Hide demo accounts' : 'Show demo accounts'}
            </button>
            {showDemo && (
              <div className="mt-3 space-y-2 rounded-2xl border border-navy-700/10 bg-white p-3">
                <p className="text-xs text-navy-700/60">
                  Password: <span className="font-mono font-semibold">Kesariya@123</span>
                </p>
                {DEV_LOGIN_ACCOUNTS.map((acct) => (
                  <button
                    key={acct.mobile}
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl bg-surface px-3 py-2 text-left text-sm hover:bg-orange-50"
                    onClick={() => {
                      setValue('mobile', acct.mobile);
                      setValue('password', 'Kesariya@123');
                    }}
                  >
                    <span>
                      <span className="font-semibold text-navy-900">{acct.role}</span>
                      <span className="mt-0.5 block text-xs text-navy-700/55">{acct.name}</span>
                    </span>
                    <span className="font-mono text-xs text-orange-600">{acct.mobile}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
