import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Search } from 'lucide-react';
import { createSeller, listSellers } from '../../api/sellers';
import { getErrorMessage } from '../../api/client';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { formatDate, initials, roleTone, statusTone } from '../../lib/seller-display';
import type { SellerActivationStatus } from '../../types/seller';

const createSchema = z.object({
  name: z.string().min(2),
  mobile: z.string().min(10),
  email: z.string().email().optional().or(z.literal('')),
  role: z.enum(['MASTER_SELLER', 'SELLER']),
  parentSellerId: z.string().optional(),
  city: z.string().optional(),
  area: z.string().optional(),
  instagramHandle: z.string().optional(),
  expectedSales: z.string().optional(),
});

type CreateForm = z.infer<typeof createSchema>;

export function AdminSellersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [city, setCity] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'expectedSales'>('createdAt');
  const [showCreate, setShowCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const params = useMemo(
    () => ({
      page,
      pageSize: 10,
      search: search || undefined,
      role: (role || undefined) as 'MASTER_SELLER' | 'SELLER' | undefined,
      status: (status || undefined) as SellerActivationStatus | undefined,
      city: city || undefined,
      sortBy,
      sortOrder: 'desc' as const,
    }),
    [page, search, role, status, city, sortBy],
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ['sellers', params],
    queryFn: () => listSellers(params),
  });

  const parentsQuery = useQuery({
    queryKey: ['sellers-parents'],
    queryFn: () => listSellers({ pageSize: 100, sortBy: 'name', sortOrder: 'asc' }),
  });

  const form = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      name: '',
      mobile: '',
      email: '',
      role: 'SELLER',
      parentSellerId: '',
      city: 'Surat',
      area: '',
      instagramHandle: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: createSeller,
    onSuccess: (result) => {
      setTempPassword(result.temporaryPassword);
      setCreateError(null);
      void queryClient.invalidateQueries({ queryKey: ['sellers'] });
      form.reset({
        name: '',
        mobile: '',
        email: '',
        role: 'SELLER',
        parentSellerId: '',
        city: 'Surat',
        area: '',
        instagramHandle: '',
      });
    },
    onError: (err) => setCreateError(getErrorMessage(err)),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">Sellers</h1>
          <p className="text-sm text-navy-700/70">Manage hierarchy, codes, and activation.</p>
        </div>
        <Button onClick={() => setShowCreate((v) => !v)}>
          <Plus className="h-4 w-4" />
          Create seller
        </Button>
      </div>

      {showCreate && (
        <Card>
          <h2 className="font-display mb-4 text-lg font-semibold">New seller</h2>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={form.handleSubmit((values) =>
              createMutation.mutate({
                ...values,
                email: values.email || null,
                parentSellerId: values.parentSellerId || null,
                expectedSales:
                  values.expectedSales === undefined || values.expectedSales === ''
                    ? null
                    : Number(values.expectedSales),
              }),
            )}
          >
            <div>
              <Label>Name</Label>
              <Input {...form.register('name')} />
            </div>
            <div>
              <Label>Mobile</Label>
              <Input {...form.register('mobile')} />
            </div>
            <div>
              <Label>Email</Label>
              <Input {...form.register('email')} />
            </div>
            <div>
              <Label>Role</Label>
              <select
                className="h-11 w-full rounded-lg border border-navy-700/15 bg-white px-3 text-sm"
                {...form.register('role')}
              >
                <option value="MASTER_SELLER">Master Seller</option>
                <option value="SELLER">Seller</option>
              </select>
            </div>
            <div>
              <Label>Parent seller</Label>
              <select
                className="h-11 w-full rounded-lg border border-navy-700/15 bg-white px-3 text-sm"
                {...form.register('parentSellerId')}
              >
                <option value="">None (top-level)</option>
                {parentsQuery.data?.items.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.sellerCode})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>City</Label>
              <Input {...form.register('city')} />
            </div>
            <div>
              <Label>Area</Label>
              <Input {...form.register('area')} />
            </div>
            <div>
              <Label>Instagram</Label>
              <Input {...form.register('instagramHandle')} />
            </div>
            <div>
              <Label>Expected sales</Label>
              <Input type="number" {...form.register('expectedSales')} />
            </div>
            {createError && (
              <p className="sm:col-span-2 text-sm text-red-600">{createError}</p>
            )}
            {tempPassword && (
              <p className="sm:col-span-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                Temporary password (share securely once): <strong>{tempPassword}</strong>
              </p>
            )}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating…' : 'Create'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="space-y-4">
        <div className="grid gap-3 md:grid-cols-5">
          <div className="relative md:col-span-2">
            <Search className="absolute top-3 left-3 h-4 w-4 text-navy-700/40" />
            <Input
              className="pl-9"
              placeholder="Search name, mobile, code…"
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
            />
          </div>
          <select
            className="h-11 rounded-lg border border-navy-700/15 bg-white px-3 text-sm"
            value={role}
            onChange={(e) => {
              setPage(1);
              setRole(e.target.value);
            }}
          >
            <option value="">All roles</option>
            <option value="MASTER_SELLER">Master Seller</option>
            <option value="SELLER">Seller</option>
          </select>
          <select
            className="h-11 rounded-lg border border-navy-700/15 bg-white px-3 text-sm"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING">Pending</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
          <Input
            placeholder="City"
            value={city}
            onChange={(e) => {
              setPage(1);
              setCity(e.target.value);
            }}
          />
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant={sortBy === 'createdAt' ? 'secondary' : 'outline'}
            onClick={() => setSortBy('createdAt')}
          >
            Newest
          </Button>
          <Button
            size="sm"
            variant={sortBy === 'expectedSales' ? 'secondary' : 'outline'}
            onClick={() => setSortBy('expectedSales')}
          >
            Expected sales
          </Button>
        </div>

        {isLoading && <p className="text-sm text-navy-700/60">Loading sellers…</p>}
        {error && <p className="text-sm text-red-600">{getErrorMessage(error)}</p>}

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-navy-700/10 text-xs uppercase tracking-wide text-navy-700/50">
              <tr>
                <th className="px-2 py-3">Seller</th>
                <th className="px-2 py-3">Code</th>
                <th className="px-2 py-3">Role</th>
                <th className="px-2 py-3">Parent</th>
                <th className="px-2 py-3">Level</th>
                <th className="px-2 py-3">City</th>
                <th className="px-2 py-3">Expected</th>
                <th className="px-2 py-3">Status</th>
                <th className="px-2 py-3">Joined</th>
                <th className="px-2 py-3">Last login</th>
                <th className="px-2 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((seller) => (
                <tr key={seller.id} className="border-b border-navy-700/5">
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-900 text-xs font-semibold text-orange-300">
                        {initials(seller.name)}
                      </div>
                      <div>
                        <p className="font-medium text-navy-900">{seller.name}</p>
                        <p className="text-xs text-navy-700/50">{seller.mobile}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-3 font-mono text-xs">{seller.sellerCode}</td>
                  <td className="px-2 py-3">
                    <Badge tone={roleTone(seller.role)}>{seller.role}</Badge>
                  </td>
                  <td className="px-2 py-3 text-xs">
                    {seller.parentSeller
                      ? `${seller.parentSeller.name} (${seller.parentSeller.sellerCode})`
                      : '—'}
                  </td>
                  <td className="px-2 py-3">{seller.level}</td>
                  <td className="px-2 py-3">{seller.city ?? '—'}</td>
                  <td className="px-2 py-3">{seller.expectedSales ?? '—'}</td>
                  <td className="px-2 py-3">
                    <Badge tone={statusTone(seller.activationStatus)}>
                      {seller.activationStatus}
                    </Badge>
                  </td>
                  <td className="px-2 py-3">{formatDate(seller.joinedAt)}</td>
                  <td className="px-2 py-3">{formatDate(seller.lastLoginAt)}</td>
                  <td className="px-2 py-3">
                    <Link
                      to={`/admin/sellers/${seller.id}`}
                      className="text-sm font-semibold text-orange-600 hover:text-orange-500"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data && (
          <div className="flex items-center justify-between text-sm">
            <p className="text-navy-700/60">
              Page {data.pagination.page} of {data.pagination.totalPages} · {data.pagination.total}{' '}
              sellers
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= data.pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
