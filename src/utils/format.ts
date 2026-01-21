/**
 * Format a number as currency
 * @param amount - The amount to format
 * @param currency - The currency code (default: KES)
 * @param locale - The locale for formatting (default: en-KE)
 * @returns Formatted currency string
 */
export const formatCurrency = (
  amount: number,
  currency: string = 'KES',
  locale: string = 'en-KE'
): string => {
  // For KES/Ksh, use custom formatting with Ksh prefix
  if (currency === 'KES' || currency === 'Ksh') {
    return `Ksh ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
};

/**
 * Format a number with commas for thousands
 * @param num - The number to format
 * @param locale - The locale for formatting (default: en-US)
 * @returns Formatted number string
 */
export const formatNumber = (num: number, locale: string = 'en-US'): string => {
  return new Intl.NumberFormat(locale).format(num);
};

/**
 * Format a date to a readable string
 * @param date - The date to format
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export const formatDate = (
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', options).format(dateObj);
};

/**
 * Format a percentage
 * @param value - The decimal value (0.15 for 15%)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${(value * 100).toFixed(decimals)}%`;
};