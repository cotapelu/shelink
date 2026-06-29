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

import { forwardRef, useId, useState } from 'react';
import { cn } from '@/lib/utils/helpers';
import { Eye, EyeOff } from 'lucide-react';

export type InputVariant = 'default' | 'error' | 'success';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: InputVariant;
};

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      variant = 'default',
      type = 'text',
      disabled,
      id,
      ...props
    },
    ref
  ) => {
const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const generatedId = useId();
  const inputId = id || generatedId;

    const baseStyles =
      'w-full bg-white/50 text-stone-900 placeholder-stone-400 block rounded-xl border transition-all duration-200 outline-none';

    const variants: Record<InputVariant, string> = {
      default:
        'border-stone-200/80 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] focus:border-amber-400 focus:ring-amber-400 focus:bg-white',
      error:
        'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500',
      success:
        'border-green-300 bg-green-50 focus:border-green-500 focus:ring-green-500',
    };

    const sizeStyles = leftIcon || rightIcon || isPassword ? 'pl-11 pr-11' : 'px-4';
    const paddingY = 'py-3.5';

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-[13px] font-semibold text-stone-600 mb-1.5 ml-1"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            type={isPassword && showPassword ? 'text' : type}
            disabled={disabled}
            className={cn(
              baseStyles,
              variants[variant],
              sizeStyles,
              paddingY,
              'disabled:opacity-50 disabled:cursor-not-allowed',
              className
            )}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          )}
          {rightIcon && !isPassword && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-red-600 ml-1">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-stone-500 ml-1">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
