import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/cn';

export const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 box-border rounded-md font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      intent: {
        primary: 'bg-primary text-white hover:bg-primary-hover',
        secondary: 'border border-border bg-surface text-text hover:bg-bg',
        ghost: 'text-text hover:bg-surface',
        danger: 'bg-error text-white hover:opacity-90',
      },
      size: {
        sm: 'min-h-9 px-4 py-2 text-sm',
        icon: 'h-9 w-9 shrink-0 p-0 text-sm',
        md: 'min-h-11 px-5 py-2.5 text-base',
        lg: 'min-h-12 px-8 py-3 text-base sm:min-h-[3.25rem] sm:px-9 sm:text-lg',
      },
    },
    defaultVariants: {
      intent: 'primary',
      size: 'md',
    },
  },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;

export { cn };
