import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-foreground outline-none ring-accent/20 transition focus:ring-2',
        className,
      )}
      {...props}
    />
  );
});

Input.displayName = 'Input';
