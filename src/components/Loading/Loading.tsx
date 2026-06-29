/*
 * Copyright 2026 叶森 (Sen Ye) - Original work (MIT Licensed)
 * Copyright 2026 COTAPELU - Modifications and additions (Apache 2.0 Licensed)
 *
 * This file contains modifications to the original MIT-licensed work.
 *
 * The original work was licensed under MIT License (see below):
 * Copyright (c) 2026 叶森 (Sen Ye)
 *
 * Modifications in this file are licensed under the Apache License, Version 2.0.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * ORIGINAL MIT LICENSE TEXT:
 * ==========================
 * MIT License
 *
 * Copyright (c) 2026 叶森 (Sen Ye)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
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
