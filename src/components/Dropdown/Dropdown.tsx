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

import { useState, useRef, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { cn } from '@/lib/utils/helpers';

export type DropdownProps = {
  trigger: ReactNode;
  children: ReactNode;
  align?: 'start' | 'end' | 'center';
  className?: string;
};

export const Dropdown = ({ trigger, children, align = 'end', className }: DropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const alignClasses = {
    start: 'left-0',
    end: 'right-0',
    center: 'left-1/2 -translate-x-1/2',
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute z-50 mt-2 min-w-[180px] bg-white rounded-xl border border-stone-200 shadow-lg py-1',
              alignClasses[align],
              className
            )}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export type DropdownItemProps = {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  destructive?: boolean;
};

export const DropdownItem = ({
  children,
  onClick,
  className,
  destructive,
}: DropdownItemProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full px-4 py-2 text-left text-sm transition-colors',
        destructive
          ? 'text-red-600 hover:bg-red-50'
          : 'text-stone-700 hover:bg-stone-50',
        className
      )}
    >
      {children}
    </button>
  );
};

export const DropdownSeparator = ({ className }: { className?: string }) => {
  return <div className={cn('h-px bg-stone-200 my-1', className)} />;
};

export const DropdownLabel = ({ children, className }: { children: ReactNode; className?: string }) => {
  return (
    <div className={cn('px-4 py-2 text-xs font-medium text-stone-500 uppercase', className)}>
      {children}
    </div>
  );
};
