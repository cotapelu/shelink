/*
 * Copyright 2026 叶森 (Sen Ye) - Original work
 * Copyright 2026 COTAPELU - Modifications and additions
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * This file is part of a derivative work based on the original MIT-licensed project.
 * Original author: 叶森 (Sen Ye) - Copyright 2026
 */
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
