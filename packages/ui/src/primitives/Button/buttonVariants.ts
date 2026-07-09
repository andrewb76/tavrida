import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/cn';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      intent: {
        primary: 'bg-primary text-white hover:bg-primary-hover',
        secondary: 'border border-border bg-surface text-text hover:bg-bg',
        ghost: 'text-text hover:bg-surface',
        danger: 'bg-error text-white hover:opacity-90',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-11 px-4 text-base',
        lg: 'h-12 px-6 text-lg',
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
