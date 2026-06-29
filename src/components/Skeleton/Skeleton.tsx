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

export type SkeletonVariant = 'text' | 'circular' | 'rectangular';

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
};

const variantClasses: Record<SkeletonVariant, string> = {
  text: 'rounded',
  circular: 'rounded-full',
  rectangular: 'rounded-lg',
};

export const Skeleton = ({
  className,
  variant = 'text',
  width,
  height,
  ...props
}: SkeletonProps) => {
  return (
    <div
      className={cn(
        'animate-pulse bg-stone-200',
        variantClasses[variant],
        className
      )}
      style={{
        width: width,
        height: height || (variant === 'text' ? '1em' : undefined),
      }}
      {...props}
    />
  );
};
