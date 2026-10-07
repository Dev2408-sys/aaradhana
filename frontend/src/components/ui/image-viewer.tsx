import { useEffect, type ReactNode } from 'react';
import { X, ZoomIn } from 'lucide-react';
import { Button } from './button';
import { cn } from '../../lib/utils';

export function ImageViewer({
  open,
  src,
  alt = 'Preview',
  title,
  meta,
  onClose,
}: {
  open: boolean;
  src: string | null | undefined;
  alt?: string;
  title?: string;
  meta?: ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !src) return null;

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-end justify-center bg-navy-950/70 p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title ?? 'Image viewer'}
      onClick={onClose}
    >
      <div
        className={cn(
          'flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[var(--radius-xl)] bg-white shadow-[var(--shadow-elevated)] sm:rounded-[var(--radius-xl)]',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-navy-700/10 px-4 py-3">
          <div className="min-w-0">
            <p className="font-display truncate text-base font-semibold text-navy-900">
              {title ?? 'Payment proof'}
            </p>
            {meta}
          </div>
          <div className="flex items-center gap-2">
            <a
              href={src}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-md)] border border-navy-700/15 px-3 text-xs font-semibold text-navy-800"
            >
              <ZoomIn className="h-3.5 w-3.5" />
              Full size
            </a>
            <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center overflow-auto bg-surface p-4">
          <img src={src} alt={alt} className="max-h-[70vh] max-w-full object-contain" />
        </div>
      </div>
    </div>
  );
}
