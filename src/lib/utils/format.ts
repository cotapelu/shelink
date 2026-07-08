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
/**
 * Formats a number as currency string.
 * @param amount - The monetary amount.
 * @param currency - Currency code (default: 'VND').
 * @param locale - Locale string (default: 'vi-VN').
 * @returns Formatted currency string.
 */
export const formatCurrency = (
  amount: number,
  currency = 'VND',
  locale = 'vi-VN'
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Formats a number with specified decimals.
 * @param value - The number to format.
 * @param decimals - Number of decimal places (default: 0).
 * @param locale - Locale string (default: 'vi-VN').
 * @returns Formatted number string.
 */
export const formatNumber = (
  value: number,
  decimals = 0,
  locale = 'vi-VN'
): string => {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

/**
 * Formats a number as percentage.
 * @param value - The numeric value (e.g., 25 for 25%).
 * @param decimals - Number of decimal places (default: 1).
 * @param locale - Locale string (default: 'vi-VN').
 * @returns Formatted percentage string.
 */
export const formatPercent = (
  value: number,
  decimals = 1,
  locale = 'vi-VN'
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
};

/**
 * Formats a Vietnamese phone number to international format.
 * @param phone - Raw phone string (digits only or with formatting).
 * @returns Formatted phone string (e.g., "+84 123 456 789").
 */
export const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 10) {
    return `+84 ${cleaned.slice(1, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  
  if (cleaned.length === 11 && cleaned.startsWith('84')) {
    return `+84 ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
  }
  
  return phone;
};

/**
 * Truncates a string to a maximum length, appending ellipsis if needed.
 * @param str - The input string.
 * @param length - Maximum length before truncation.
 * @returns Truncated string (or original if already shorter).
 */
export const truncate = (str: string, length: number): string => {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
};

/**
 * Capitalizes the first character and lowercases the rest.
 * @param str - Input string.
 * @returns Capitalized string.
 */
export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Capitalizes the first letter of each word.
 * @param str - Input string.
 * @returns String with each word capitalized.
 */
export const capitalizeWords = (str: string): string => {
  return str
    .split(' ')
    .map(word => capitalize(word))
    .join(' ');
};

/**
 * Converts a string to a URL-friendly slug.
 * @param str - Input string.
 * @returns Slugified string (lowercase, no diacritics, hyphen-separated).
 */
export const slugify = (str: string): string => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

/**
 * Generates initials from a full name (up to 2 characters).
 * @param name - Full name string.
 * @returns Uppercase initials (e.g., "JD").
 */
export const generateInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

/**
 * Converts a byte count into a human-readable size string.
 * @param bytes - Number of bytes.
 * @returns Formatted size (e.g., "1.5 MB").
 */
export const bytesToSize = (bytes: number): string => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
};
