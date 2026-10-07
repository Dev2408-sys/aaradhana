import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Copy, Eye, EyeOff } from 'lucide-react';
import { getReferralInfo, registerSeller } from '../../api/sellers';
import { getErrorMessage } from '../../api/client';
import { AuthBrandPanel } from '../../components/auth/AuthBrandPanel';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { formatDate } from '../../lib/seller-display';

const schema = z
  .object({
    name: z.string().min(2, 'Full name is required'),
    mobile: z.string().min(10, 'Valid 10-digit mobile required'),
    email: z.string().email('Enter a valid email').optional().or(z.literal('')),
    city: z.string().min(2, 'City is required'),
    area: z.string().optional(),
    instagramHandle: z.string().optional(),
    expectedSales: z.string().optional(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Confirm your password'),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

type RegisterResult = {
  sellerCode: string;
  temporaryPassword: string | null;
  passwordSetByUser: boolean;
  activationStatus: string;
  message: string;
  mobile: string;
  password: string;
};

export function SellerJoinPage() {
  const { sellerCode = '' } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [result, setResult] = useState<RegisterResult | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const referralQuery = useQuery({
    queryKey: ['referral', sellerCode],
    queryFn: () => getReferralInfo(sellerCode),
    enabled: Boolean(sellerCode),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      mobile: '',
      email: '',
      city: 'Surat',
      area: '',
      instagramHandle: '',
      expectedSales: '',
      password: '',
      confirmPassword: '',
    },
  });

  const registerMutation = useMutation({
    mutationFn: (values: FormValues) =>
      registerSeller({
        referralCode: sellerCode,
        name: values.name,
        mobile: values.mobile,
        email: values.email || null,
        city: values.city || null,
        area: values.area || null,
        instagramHandle: values.instagramHandle || null,
        expectedSales:
          values.expectedSales === undefined || values.expectedSales === ''
            ? null
            : Number(values.expectedSales),
        password: values.password,
      }),
    onSuccess: (data, values) => {
      setResult({
        sellerCode: data.seller.sellerCode,
        temporaryPassword: data.temporaryPassword,
        passwordSetByUser: data.passwordSetByUser,
        activationStatus: data.activationStatus,
        message: data.message,
        mobile: values.mobile,
        password: values.password,
      });
    },
  });

  const referral = referralQuery.data;
  const fieldErrors = form.formState.errors;
  const watchedName = form.watch('name');
  const watchedMobile = form.watch('mobile');
  const step1Valid =
    watchedName.trim().length >= 2 && watchedMobile.replace(/\D/g, '').length >= 10;

  const copyCredentials = async () => {
    if (!result) return;
    const text = [
      `Seller code: ${result.sellerCode}`,
      `Mobile: ${result.mobile}`,
      `Password: ${result.password}`,
    ].join('\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const goLogin = () => {
    if (!result) return;
    navigate('/login', {
      state: {
        mobile: result.mobile,
        password: result.password,
        notice:
          result.activationStatus === 'PENDING'
            ? 'Account registered. Sign in after admin activates your seller profile.'
            : 'Account ready — sign in with your mobile and password.',
      },
    });
  };

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      <AuthBrandPanel
        title="Join the official seller network"
        subtitle={`Invited via ${sellerCode || '…'}. Create your profile, set a password, and wait for admin activation before selling tickets.`}
      />

      <div className="px-4 py-8 sm:px-8 lg:overflow-y-auto lg:py-10">
        <div className="mx-auto w-full max-w-md space-y-5">
          {referralQuery.isLoading && (
            <p className="text-sm text-navy-700/60">Loading invitation…</p>
          )}
          {referralQuery.error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {getErrorMessage(referralQuery.error)}
              <Link to="/" className="mt-3 block font-semibold text-orange-600">
                Back home
              </Link>
            </div>
          )}

          {referral && !result && (
            <>
              <div className="rounded-2xl border border-navy-700/10 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-navy-700/45">
                  Invitation
                </p>
                <p className="mt-1 font-display text-lg font-semibold text-navy-900">
                  {referral.sellerName}
                </p>
                <p className="text-sm text-navy-700/60">
                  Code {referral.sellerCode}
                  {referral.event
                    ? ` · ${referral.event.name} · ${formatDate(referral.event.startDate)}–${formatDate(referral.event.endDate)}`
                    : ''}
                </p>
                {!referral.canAcceptReferrals && (
                  <p className="mt-2 text-sm text-amber-700">
                    This seller is not accepting new referrals right now.
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                {[1, 2].map((n) => (
                  <div
                    key={n}
                    className={`h-1.5 flex-1 rounded-full ${
                      step >= n ? 'bg-orange-500' : 'bg-navy-700/10'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide text-navy-700/45">
                Step {step} of 2 · {step === 1 ? 'Your profile' : 'Password & location'}
              </p>

              <form
                className="space-y-4 rounded-2xl border border-navy-700/10 bg-white p-5"
                onSubmit={form.handleSubmit((values) => registerMutation.mutate(values))}
              >
                {step === 1 && (
                  <>
                    <div>
                      <Label>Full name</Label>
                      <Input {...form.register('name')} placeholder="As on WhatsApp" />
                      {fieldErrors.name && (
                        <p className="mt-1 text-xs text-red-600">{fieldErrors.name.message}</p>
                      )}
                    </div>
                    <div>
                      <Label>Mobile</Label>
                      <Input
                        {...form.register('mobile')}
                        inputMode="numeric"
                        placeholder="10-digit mobile (login ID)"
                      />
                      {fieldErrors.mobile && (
                        <p className="mt-1 text-xs text-red-600">{fieldErrors.mobile.message}</p>
                      )}
                    </div>
                    <div>
                      <Label>Email (optional)</Label>
                      <Input {...form.register('email')} type="email" />
                      {fieldErrors.email && (
                        <p className="mt-1 text-xs text-red-600">{fieldErrors.email.message}</p>
                      )}
                    </div>
                    <div>
                      <Label>Instagram (optional)</Label>
                      <Input {...form.register('instagramHandle')} placeholder="@handle" />
                    </div>
                    <div>
                      <Label>Expected ticket sales (optional)</Label>
                      <Input type="number" {...form.register('expectedSales')} />
                    </div>
                    <Button
                      type="button"
                      className="w-full"
                      size="lg"
                      disabled={!referral.canAcceptReferrals || !step1Valid}
                      onClick={async () => {
                        const ok = await form.trigger(['name', 'mobile', 'email']);
                        if (ok) setStep(2);
                      }}
                    >
                      Continue
                    </Button>
                  </>
                )}

                {step === 2 && (
                  <>
                    <div>
                      <Label>City</Label>
                      <Input {...form.register('city')} />
                      {fieldErrors.city && (
                        <p className="mt-1 text-xs text-red-600">{fieldErrors.city.message}</p>
                      )}
                    </div>
                    <div>
                      <Label>Area / locality</Label>
                      <Input {...form.register('area')} placeholder="Vesu, Adajan…" />
                    </div>
                    <div>
                      <Label>Create password</Label>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          className="pr-11"
                          autoComplete="new-password"
                          {...form.register('password')}
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-navy-700/50"
                          onClick={() => setShowPassword((v) => !v)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {fieldErrors.password && (
                        <p className="mt-1 text-xs text-red-600">{fieldErrors.password.message}</p>
                      )}
                    </div>
                    <div>
                      <Label>Confirm password</Label>
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        {...form.register('confirmPassword')}
                      />
                      {fieldErrors.confirmPassword && (
                        <p className="mt-1 text-xs text-red-600">
                          {fieldErrors.confirmPassword.message}
                        </p>
                      )}
                    </div>

                    {registerMutation.error && (
                      <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                        {getErrorMessage(registerMutation.error)}
                      </p>
                    )}

                    <div className="flex gap-2">
                      <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>
                        Back
                      </Button>
                      <Button
                        type="submit"
                        className="flex-[2]"
                        size="lg"
                        disabled={!referral.canAcceptReferrals || registerMutation.isPending}
                      >
                        {registerMutation.isPending ? 'Submitting…' : 'Create seller account'}
                      </Button>
                    </div>
                  </>
                )}
              </form>

              <p className="text-center text-sm text-navy-700/60">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-orange-600">
                  Sign in
                </Link>
              </p>
            </>
          )}

          {result && (
            <div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  {result.activationStatus === 'PENDING' ? 'Pending activation' : 'Ready'}
                </p>
                <h2 className="font-display mt-1 text-2xl font-bold text-navy-900">
                  Profile submitted
                </h2>
                <p className="mt-2 text-sm text-navy-700/75">{result.message}</p>
              </div>

              <dl className="space-y-2 rounded-xl bg-white/80 p-4 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-navy-700/55">Seller code</dt>
                  <dd className="font-mono font-semibold">{result.sellerCode}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-navy-700/55">Mobile</dt>
                  <dd className="font-mono font-semibold">{result.mobile}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-navy-700/55">Password</dt>
                  <dd className="font-mono font-semibold">••••••••</dd>
                </div>
              </dl>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" variant="outline" className="flex-1" onClick={() => void copyCredentials()}>
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" /> Copy credentials
                    </>
                  )}
                </Button>
                <Button type="button" className="flex-1" onClick={goLogin}>
                  Go to sign in
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
