import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getDayPricing, saveDayPricing } from '../../api/pricing';
import { getErrorMessage } from '../../api/client';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { suggestNavratriDay } from '../../lib/navratri-days';
import { cn } from '../../lib/utils';

type CellKey = string; // `${day}:${typeId}:base|min|suggest`

function key(day: number, typeId: string, field: string) {
  return `${day}:${typeId}:${field}`;
}

export function AdminPricingPage() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['day-pricing'], queryFn: getDayPricing });
  const [draft, setDraft] = useState<Record<CellKey, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!query.data) return;
    const next: Record<CellKey, string> = {};
    for (const day of query.data.days) {
      for (const p of day.prices) {
        next[key(day.dayNumber, p.ticketTypeId, 'base')] = String(p.basePrice);
        next[key(day.dayNumber, p.ticketTypeId, 'min')] = String(p.minimumSellingPrice);
        next[key(day.dayNumber, p.ticketTypeId, 'suggest')] = String(p.suggestedSellingPrice);
      }
    }
    setDraft(next);
  }, [query.data]);

  const types = query.data?.ticketTypes ?? [];

  const mutation = useMutation({
    mutationFn: saveDayPricing,
    onSuccess: async () => {
      setError(null);
      setSaved(true);
      await qc.invalidateQueries({ queryKey: ['day-pricing'] });
      await qc.invalidateQueries({ queryKey: ['ticket-types'] });
      setTimeout(() => setSaved(false), 2500);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const dirtyCount = useMemo(() => {
    if (!query.data) return 0;
    let n = 0;
    for (const day of query.data.days) {
      for (const p of day.prices) {
        const b = Number(draft[key(day.dayNumber, p.ticketTypeId, 'base')]);
        const m = Number(draft[key(day.dayNumber, p.ticketTypeId, 'min')]);
        const s = Number(draft[key(day.dayNumber, p.ticketTypeId, 'suggest')]);
        if (b !== p.basePrice || m !== p.minimumSellingPrice || s !== p.suggestedSellingPrice) {
          n += 1;
        }
      }
    }
    return n;
  }, [draft, query.data]);

  const save = () => {
    if (!query.data) return;
    const rows = [];
    for (const day of query.data.days) {
      for (const p of day.prices) {
        rows.push({
          dayNumber: day.dayNumber,
          ticketTypeId: p.ticketTypeId,
          basePrice: Number(draft[key(day.dayNumber, p.ticketTypeId, 'base')]),
          minimumSellingPrice: Number(draft[key(day.dayNumber, p.ticketTypeId, 'min')]),
          suggestedSellingPrice: Number(draft[key(day.dayNumber, p.ticketTypeId, 'suggest')]),
        });
      }
    }
    mutation.mutate(rows);
  };

  const applyBaseToAllDays = (typeId: string) => {
    if (!query.data) return;
    const first = draft[key(1, typeId, 'base')];
    const firstMin = draft[key(1, typeId, 'min')];
    const firstSug = draft[key(1, typeId, 'suggest')];
    setDraft((prev) => {
      const next = { ...prev };
      for (const day of query.data.days) {
        next[key(day.dayNumber, typeId, 'base')] = first;
        next[key(day.dayNumber, typeId, 'min')] = firstMin;
        next[key(day.dayNumber, typeId, 'suggest')] = firstSug;
      }
      return next;
    });
  };

  if (query.isLoading) return <p className="text-sm text-navy-700/60">Loading pricing…</p>;
  if (query.error) return <p className="text-sm text-red-600">{getErrorMessage(query.error)}</p>;

  const currentDay = suggestNavratriDay();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-600">
            Pricing
          </p>
          <h1 className="font-display text-2xl font-bold text-navy-900">Day-wise pricing</h1>
          <p className="mt-1 max-w-2xl text-sm text-navy-700/70">
            Admin sets the <strong>seller base price</strong> (what seller owes you) per day.
            Sellers can sell to customers at any price ≥ minimum. Margin = customer price − base.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {types.map((t) => (
            <Button
              key={t.id}
              size="sm"
              variant="outline"
              onClick={() => applyBaseToAllDays(t.id)}
            >
              Copy Day 1 → all ({t.code})
            </Button>
          ))}
          <Button disabled={mutation.isPending || dirtyCount === 0} onClick={save}>
            Save {dirtyCount > 0 ? `(${dirtyCount})` : ''}
          </Button>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {saved && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Pricing saved. Sellers will see updated base prices on sell screen.
        </p>
      )}

      <Card className="overflow-x-auto p-0">
        <table className="min-w-[900px] w-full text-left text-sm">
          <thead className="border-b border-navy-700/10 bg-surface text-xs uppercase text-navy-700/50">
            <tr>
              <th className="sticky left-0 bg-surface px-3 py-3">Day</th>
              {types.map((t) => (
                <th key={t.id} className="px-3 py-3" colSpan={3}>
                  {t.name} ({t.code})
                </th>
              ))}
            </tr>
            <tr>
              <th className="sticky left-0 bg-surface px-3 py-2" />
              {types.map((t) => (
                <th key={t.id} className="px-1 py-2 font-normal normal-case" colSpan={3}>
                  <div className="grid grid-cols-3 gap-1 text-[10px]">
                    <span>Admin base</span>
                    <span>Min sell</span>
                    <span>Suggest</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {query.data?.days.map((day) => (
              <tr
                key={day.id}
                className={cn(
                  'border-b border-navy-700/5',
                  currentDay === day.dayNumber && 'bg-orange-50/70',
                )}
              >
                <td
                  className={cn(
                    'sticky left-0 px-3 py-2 font-semibold whitespace-nowrap',
                    currentDay === day.dayNumber
                      ? 'bg-orange-50 text-orange-700'
                      : 'bg-white',
                  )}
                >
                  {day.displayLabel}
                  {currentDay === day.dayNumber && (
                    <span className="ml-2 text-[10px] font-bold uppercase tracking-wide">
                      Today
                    </span>
                  )}
                </td>
                {day.prices.map((p) => (
                  <td key={p.ticketTypeId} className="px-1 py-2" colSpan={3}>
                    <div className="grid grid-cols-3 gap-1">
                      {(['base', 'min', 'suggest'] as const).map((field) => (
                        <Input
                          key={field}
                          type="number"
                          className="h-9 px-2 text-xs"
                          value={draft[key(day.dayNumber, p.ticketTypeId, field)] ?? ''}
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              [key(day.dayNumber, p.ticketTypeId, field)]: e.target.value,
                            }))
                          }
                        />
                      ))}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="space-y-2 text-sm text-navy-700/70">
        <p className="font-semibold text-navy-900">How money works</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            <strong>Admin base</strong> — seller pays this to admin per ticket (settlement).
          </li>
          <li>
            <strong>Customer selling price</strong> — seller chooses when selling (≥ min).
          </li>
          <li>
            <strong>Seller margin</strong> = customer price − admin base.
          </li>
          <li>
            Customer payment (cash/UPI) and admin settlement (UPI + UTR) are tracked separately.
          </li>
        </ol>
      </Card>
    </div>
  );
}
