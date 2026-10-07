import * as React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', error, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex h-12 w-full rounded-[var(--radius-md)] border bg-white px-3.5 text-sm text-navy-900 placeholder:text-navy-700/40 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 disabled:cursor-not-allowed disabled:opacity-55',
        error
          ? 'border-red-400 focus-visible:ring-red-400'
          : 'border-navy-700/15 hover:border-navy-700/25',
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = 'Input';
