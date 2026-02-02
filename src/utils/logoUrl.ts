/**
 * Build full URL for API-hosted assets (e.g. logos from /uploads/logos/xxx).
 * Use for receipt logo, PDF header logo, etc.
 */
import API_BASE_URL from '@/config/apiConfig';

export function getFullAssetUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const base = API_BASE_URL.replace(/\/+$/, '');
  return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;
}

/** Prefer receipt logo for receipts, fallback to main logo; returns full URL or empty. */
export function getReceiptLogoUrl(
  receiptLogo?: string | null,
  logoUrl?: string | null
): string {
  const path = receiptLogo || logoUrl;
  return getFullAssetUrl(path);
}
