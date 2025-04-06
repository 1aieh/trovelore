import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number as a currency string
 * @param value - The numeric value to format
 * @param currency - The currency code (defaults to EUR)
 * @param locale - The locale to use for formatting (defaults to en-US)
 * @returns Formatted currency string
 */
export function formatCurrency(
  value: number | string | null | undefined,
  currency = "EUR",
  locale = "en-US"
): string {
  // Handle null, undefined, or empty values
  if (value === null || value === undefined || value === "") {
    return "€0.00";
  }

  // Convert string to number if needed
  const numericValue = typeof value === "string" ? parseFloat(value) : value;

  // Handle NaN
  if (isNaN(numericValue)) {
    return "€0.00";
  }

  // Format the currency using Intl.NumberFormat
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericValue);
}

/**
 * Format a date string or Date object into a human-readable format
 * @param date - The date to format (string, Date object, or null/undefined)
 * @param format - The format style to use (defaults to 'medium')
 * @returns Formatted date string or empty string if date is invalid
 */
export function formatDate(
  date: string | Date | null | undefined,
  format: 'short' | 'medium' | 'long' = 'medium'
): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Check if date is valid
  if (isNaN(dateObj.getTime())) return '';
  
  const options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: format === 'short' ? 'numeric' : 'long', 
    day: 'numeric' 
  };
  
  // Add time for formats other than short
  if (format !== 'short') {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  
  // For long format, include seconds
  if (format === 'long') {
    options.second = '2-digit';
  }
  
  return new Intl.DateTimeFormat('en-US', options).format(dateObj);
}
