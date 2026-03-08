import { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export function Badge({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border border-border bg-white px-2.5 py-1 text-xs font-medium text-muted',
        className,
      )}
      {...props}
    />
  );
}
