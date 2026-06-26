'use client';

import { cn } from '@/lib/utils/helpers';
import { Loader2 } from 'lucide-react';

export type LoadingVariant = 'spinner' | 'progress';

export type LoadingProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: LoadingVariant;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  progress?: number;
};

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

export const Loading = ({
  className,
  variant = 'spinner',
  size = 'md',
  color = 'text-amber-600',
  progress,
  ...props
}: LoadingProps) => {
  if (variant === 'progress') {
    return (
      <div className={cn('w-full', className)} {...props}>
        <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
          <div
            className={cn('h-full bg-amber-500 transition-all duration-300', color)}
            style={{ width: `${progress || 0}%` }}
          />
        </div>
        {progress !== undefined && (
          <span className="text-xs text-stone-500 mt-1 block text-right">
            {progress}%
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center justify-center', className)} {...props}>
      <Loader2 className={cn(sizeClasses[size], color, 'animate-spin')} />
    </div>
  );
};
