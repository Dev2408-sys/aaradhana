import { useRef } from 'react';
import { CheckCircle2, ImagePlus, Trash2, RefreshCw } from 'lucide-react';
import { Button } from './button';
import { cn } from '../../lib/utils';
import { mediaUrl } from '../../lib/uploads';

type Props = {
  previewUrl: string | null;
  uploadedUrl: string | null;
  uploading?: boolean;
  disabled?: boolean;
  onSelect: (file: File | null) => void;
  onClear: () => void;
  className?: string;
};

export function PaymentProofUploader({
  previewUrl,
  uploadedUrl,
  uploading,
  disabled,
  onSelect,
  onClear,
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const display = previewUrl ?? mediaUrl(uploadedUrl);
  const done = Boolean(uploadedUrl) && !uploading;

  return (
    <div className={cn('space-y-2', className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        disabled={disabled || uploading}
        onChange={(e) => onSelect(e.target.files?.[0] ?? null)}
      />

      {!display ? (
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className="flex min-h-[9rem] w-full flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border-2 border-dashed border-navy-700/20 bg-white px-4 py-6 text-center transition hover:border-orange-400 hover:bg-orange-50/40 disabled:opacity-50"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/12 text-orange-600">
            <ImagePlus className="h-5 w-5" />
          </span>
          <span className="font-display text-sm font-semibold text-navy-900">
            Upload payment screenshot
          </span>
          <span className="text-xs text-navy-700/55">
            Take a screenshot after completing payment · JPG / PNG / WEBP
          </span>
        </button>
      ) : (
        <div
          className={cn(
            'overflow-hidden rounded-[var(--radius-lg)] border bg-white',
            done ? 'border-emerald-300' : 'border-navy-700/12',
          )}
        >
          <img
            src={display}
            alt="Payment screenshot preview"
            className="max-h-52 w-full object-contain bg-surface"
          />
          <div className="flex items-center justify-between gap-2 border-t border-navy-700/8 px-3 py-2.5">
            <div className="min-w-0">
              {uploading ? (
                <p className="flex items-center gap-1.5 text-xs font-semibold text-orange-600">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Uploading…
                </p>
              ) : done ? (
                <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Upload complete
                </p>
              ) : (
                <p className="text-xs text-navy-700/60">Preview ready</p>
              )}
            </div>
            <div className="flex gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
              >
                Replace
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClear}
                disabled={uploading}
                aria-label="Remove screenshot"
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
