import { useState } from 'react';
import { Filter, X } from 'lucide-react';
import { getNavratriDays } from '../../lib/navratri-days';
import type { DashboardQuery } from '../../api/dashboard';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

const PAYMENT = ['', 'PENDING', 'PARTIAL', 'PAID', 'OVERPAID', 'REFUNDED'];
const SETTLEMENT = ['', 'PENDING', 'PARTIAL', 'PAID', 'ADJUSTED'];

export function DashboardFilterBar({
  value,
  onChange,
  showSellerFilters = true,
}: {
  value: DashboardQuery;
  onChange: (next: DashboardQuery) => void;
  showSellerFilters?: boolean;
}) {
  const days = getNavratriDays();
  const [open, setOpen] = useState(false);

  const set = (patch: Partial<DashboardQuery>) => onChange({ ...value, ...patch });

  const daySelect = (
    <div>
      <Label>Event day</Label>
      <select
        className="h-11 w-full rounded-lg border border-navy-700/15 bg-white px-3 text-sm"
        value={value.eventDay === '' || value.eventDay == null ? '' : value.eventDay}
        onChange={(e) =>
          set({ eventDay: e.target.value === '' ? '' : Number(e.target.value) })
        }
      >
        <option value="">ALL DAYS</option>
        {days.map((d) => (
          <option key={d.day} value={d.day}>
            DAY {d.day} — {d.date.slice(8)} OCT
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[160px] flex-1">{daySelect}</div>
        <Button type="button" variant="outline" className="md:hidden" onClick={() => setOpen(true)}>
          <Filter className="h-4 w-4" /> Filters
        </Button>
        {value.eventDay !== '' && value.eventDay != null && (
          <Button type="button" variant="ghost" size="sm" onClick={() => set({ eventDay: '' })}>
            Clear day
          </Button>
        )}
      </div>

      <div className="hidden grid-cols-2 gap-3 md:grid lg:grid-cols-4">
        {showSellerFilters && (
          <>
            <div>
              <Label>Seller ID</Label>
              <Input
                value={value.sellerId ?? ''}
                onChange={(e) => set({ sellerId: e.target.value || undefined })}
                placeholder="Optional UUID"
              />
            </div>
            <div>
              <Label>Master seller ID</Label>
              <Input
                value={value.masterSellerId ?? ''}
                onChange={(e) => set({ masterSellerId: e.target.value || undefined })}
                placeholder="Optional UUID"
              />
            </div>
          </>
        )}
        <div>
          <Label>Payment status</Label>
          <select
            className="h-11 w-full rounded-lg border border-navy-700/15 bg-white px-3 text-sm"
            value={value.paymentStatus ?? ''}
            onChange={(e) => set({ paymentStatus: e.target.value || undefined })}
          >
            {PAYMENT.map((p) => (
              <option key={p || 'all'} value={p}>
                {p || 'All'}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Settlement status</Label>
          <select
            className="h-11 w-full rounded-lg border border-navy-700/15 bg-white px-3 text-sm"
            value={value.settlementStatus ?? ''}
            onChange={(e) => set({ settlementStatus: e.target.value || undefined })}
          >
            {SETTLEMENT.map((p) => (
              <option key={p || 'all'} value={p}>
                {p || 'All'}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>From</Label>
          <Input
            type="date"
            value={value.startDate?.slice(0, 10) ?? ''}
            onChange={(e) =>
              set({ startDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })
            }
          />
        </div>
        <div>
          <Label>To</Label>
          <Input
            type="date"
            value={value.endDate?.slice(0, 10) ?? ''}
            onChange={(e) =>
              set({
                endDate: e.target.value
                  ? new Date(`${e.target.value}T23:59:59`).toISOString()
                  : undefined,
              })
            }
          />
        </div>
        <div className="lg:col-span-2">
          <Label>Search</Label>
          <Input
            value={value.search ?? ''}
            onChange={(e) => set({ search: e.target.value || undefined })}
            placeholder="Sale #, customer, seller…"
          />
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 bg-navy-950/40 md:hidden" onClick={() => setOpen(false)}>
          <div
            className="absolute inset-x-0 bottom-0 max-h-[80vh] space-y-3 overflow-y-auto rounded-t-2xl bg-white p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="font-semibold">Filters</p>
              <button type="button" onClick={() => setOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            {daySelect}
            <div>
              <Label>Payment</Label>
              <select
                className="h-11 w-full rounded-lg border border-navy-700/15 bg-white px-3 text-sm"
                value={value.paymentStatus ?? ''}
                onChange={(e) => set({ paymentStatus: e.target.value || undefined })}
              >
                {PAYMENT.map((p) => (
                  <option key={p || 'all'} value={p}>
                    {p || 'All'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Settlement</Label>
              <select
                className="h-11 w-full rounded-lg border border-navy-700/15 bg-white px-3 text-sm"
                value={value.settlementStatus ?? ''}
                onChange={(e) => set({ settlementStatus: e.target.value || undefined })}
              >
                {SETTLEMENT.map((p) => (
                  <option key={p || 'all'} value={p}>
                    {p || 'All'}
                  </option>
                ))}
              </select>
            </div>
            <Button className="w-full" onClick={() => setOpen(false)}>
              Apply
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
