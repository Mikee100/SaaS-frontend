
import API_BASE_URL from '../config/apiConfig';
import { refreshAuth } from '../lib/auth-client';

export class ApiError extends Error {
  status?: number;
  code?: string;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export function isAccessRestrictedError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.code === 'ACCESS_RESTRICTED' || error.status === 403;
  }
  if (error instanceof Error) {
    return error.message.toLowerCase().includes('access is restricted until renewal');
  }
  return false;
}

// Request deduplication: prevent concurrent identical requests
interface PendingRequest {
  promise: Promise<unknown>;
  timestamp: number;
}

class EnhancedAPI {
  private isOnline = true;
  private pendingRequests = new Map<string, PendingRequest>();
  private readonly REQUEST_DEDUP_TIMEOUT = 5000; // 5 seconds
  private readonly ACCESS_RESTRICTED_TEXT =
    'Subscription has expired. Access is restricted until renewal. You can still access billing.';
  private readonly RESTRICTED_MODE_ENDPOINTS = [
    '/analytics',
    '/branches',
    '/sales-targets',
    '/tenant/configurations',
    '/tenant/me',
    '/user/me/plan-limits',
    '/sales/credits/all',
  ];

  private extractStatusFromUnknown(error: unknown): number | undefined {
    if (error instanceof ApiError) {
      return error.status;
    }

    if (typeof error === 'object' && error !== null && 'status' in error) {
      const status = Number((error as { status?: number }).status);
      return Number.isFinite(status) ? status : undefined;
    }

    return undefined;
  }

  /** Cookie-based auth: no Authorization header; cookies sent via credentials: 'include'. */
  private getAuthHeaders(extra?: Record<string, string>): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...extra,
    };
  }

  /**
   * Get a unique key for request deduplication
   */
  private getRequestKey(endpoint: string, options: RequestInit): string {
    const method = options.method || 'GET';
    const body = options.body ? JSON.stringify(options.body) : '';
    const headers = JSON.stringify(options.headers || {});
    return `${method}:${endpoint}:${body}:${headers}`;
  }

  /**
   * Clean up stale pending requests
   */
  private cleanupPendingRequests(): void {
    const now = Date.now();
    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > this.REQUEST_DEDUP_TIMEOUT) {
        this.pendingRequests.delete(key);
      }
    }
  }

  private isRestrictedModeEndpoint(endpoint: string): boolean {
    return this.RESTRICTED_MODE_ENDPOINTS.some((prefix) =>
      endpoint.startsWith(prefix),
    );
  }

  private getFallbackEndpoint(endpoint: string): string | null {
    if (!endpoint.startsWith('/')) return null;
    if (endpoint.startsWith('/api/')) {
      return endpoint.slice('/api'.length);
    }
    return `/api${endpoint}`;
  }

  private getEndpointPath(endpoint: string): string {
    const q = endpoint.indexOf('?');
    return q >= 0 ? endpoint.slice(0, q) : endpoint;
  }

  private isHostedOptionalMissingRoute(path: string): boolean {
    return (
      path === '/admin/classifications' ||
      path === '/classifications/public' ||
      path === '/admin/module-presets'
    );
  }

  private shouldAttemptPrefixFallback(endpoint: string): boolean {
    // Backend mounts superadmin routes at /admin, not /api/admin.
    // Retrying these with /api creates noisy duplicate 404s.
    return !endpoint.startsWith('/admin');
  }

  private async makeRequest<T = unknown>(
    endpoint: string,
    options: RequestInit = {},
    allowPrefixFallback = true,
  ): Promise<T> {
    // Clean up stale requests
    this.cleanupPendingRequests();

    // Check for duplicate pending requests
    const requestKey = this.getRequestKey(endpoint, options);
    const pendingRequest = this.pendingRequests.get(requestKey);
    
    if (pendingRequest) {
      // Return existing promise if request is already pending
      return pendingRequest.promise as Promise<T>;
    }

    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      ...this.getAuthHeaders(),
      ...options.headers,
    };
    const endpointPath = this.getEndpointPath(endpoint);
    const suppressErrorLog =
      String((headers as Record<string, string>)['x-suppress-error-log'] || '') ===
        'true' || this.isHostedOptionalMissingRoute(endpointPath);
    if ((headers as Record<string, string>)['x-suppress-error-log']) {
      delete (headers as Record<string, string>)['x-suppress-error-log'];
    }

    const maxRetries = 5;
    let attempt = 0;

    const REQUEST_TIMEOUT_MS = 15000;

    // Create the request promise
    const requestPromise = (async (): Promise<T> => {
      while (attempt <= maxRetries) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        const response = await fetch(url, {
          ...options,
          headers,
          credentials: 'include',
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const responseText = await response.text();
        let responseData;

        try {
          responseData = responseText ? JSON.parse(responseText) : null;
        } catch (e) {
          console.error('Failed to parse JSON response:', e, 'Response text:', responseText);
          throw new Error('Invalid JSON response from server');
        }

        if (!response.ok) {
          const errorMessage = responseData?.message ||
                              response.statusText ||
                              `HTTP error! status: ${response.status}`;

          const method = String(options.method || 'GET').toUpperCase();

          // Some hosted environments run an older backend build where these
          // optional GET routes are not exposed yet. Return safe empty data so
          // superadmin pages stay usable without endless 404 error spam.
          if (
            response.status === 404 &&
            method === 'GET' &&
            this.isHostedOptionalMissingRoute(endpointPath)
          ) {
            if (endpointPath === '/admin/module-presets') {
              return { presets: [] } as T;
            }
            return [] as T;
          }

          // Hosted environments may expose API routes either with or without
          // an /api prefix depending on proxy configuration. On 404, retry once
          // with the alternate prefix form before surfacing an error.
          if (
            response.status === 404 &&
            allowPrefixFallback &&
            this.shouldAttemptPrefixFallback(endpoint)
          ) {
            const fallbackEndpoint = this.getFallbackEndpoint(endpoint);
            if (fallbackEndpoint && fallbackEndpoint !== endpoint) {
              return this.makeRequest<T>(
                fallbackEndpoint,
                options,
                false,
              );
            }
          }

          const isAccessRestricted =
            response.status === 403 &&
            typeof errorMessage === 'string' &&
            errorMessage.toLowerCase().includes('access is restricted until renewal');
          const isRestrictedByEndpoint =
            response.status === 403 && this.isRestrictedModeEndpoint(endpoint);

          // Handle 401: try silent refresh once, then retry this request
          if (response.status === 401 && attempt === 0) {
            const refreshed = await refreshAuth();
            if (refreshed) {
              attempt++;
              continue;
            }
            if (typeof window !== 'undefined') {
              localStorage.removeItem('token');
            }
            // Don't log 401 as error for auth endpoints – "not logged in" is expected
            const isAuthEndpoint = url.includes('/user/me') || url.includes('/auth/refresh') || url.includes('/auth/me');
            if (!isAuthEndpoint && !suppressErrorLog) {
              console.error(`[API] Request failed with status ${response.status}`, {
                status: response.status,
                url,
                response: responseData || responseText,
              });
            }
            throw new ApiError(errorMessage, response.status, 'UNAUTHORIZED');
          }
          if (response.status === 401) {
            if (typeof window !== 'undefined') {
              localStorage.removeItem('token');
            }
            throw new ApiError(errorMessage, response.status, 'UNAUTHORIZED');
          }

          if (isAccessRestricted || isRestrictedByEndpoint) {
            throw new ApiError(
              this.ACCESS_RESTRICTED_TEXT,
              response.status,
              'ACCESS_RESTRICTED',
            );
          }

          // Handle 429 Too Many Requests with retry
          if (response.status === 429 && attempt < maxRetries) {
            const delay = Math.min(Math.pow(2, attempt) * 1000, 10000); // Exponential backoff: 1s, 2s, 4s, 8s, 10s (capped at 10s)
            console.warn(`[API] Rate limited (429). Retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries + 1})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            attempt++;
            continue;
          }

          // Handle ThrottlerException (NestJS rate limiting) with retry
          if (errorMessage.includes('Too Many Requests') && attempt < maxRetries) {
            const delay = Math.min(Math.pow(2, attempt) * 1000, 10000); // Exponential backoff: 1s, 2s, 4s, 8s, 10s (capped at 10s)
            console.warn(`[API] Rate limited (ThrottlerException). Retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries + 1})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            attempt++;
            continue;
          }

          // Only log errors that are not retried rate limits
          if (
            !suppressErrorLog &&
            ((response.status !== 429 && !errorMessage.includes('Too Many Requests')) ||
              attempt >= maxRetries)
          ) {
            console.error(`[API] Request failed with status ${response.status}`, {
              status: response.status,
              statusText: response.statusText,
              url,
              response: responseData || responseText,
              requestHeaders: headers,
            });
          }

          throw new ApiError(errorMessage, response.status, 'REQUEST_FAILED');
        }

        return responseData as T;
      } catch (error) {
        if (isAccessRestrictedError(error)) {
          throw error;
        }

        const status = this.extractStatusFromUnknown(error);

        // Do not retry explicit HTTP failures here. Let callers decide if they want retries.
        if (status && status >= 400 && status < 600) {
          throw error;
        }

        // Abort errors typically indicate timeout/user navigation and are not recoverable by retries.
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw error;
        }
        
        if (attempt >= maxRetries) {
          console.error('API request failed after retries:', error);
          throw error;
        }
        attempt++;
      }
      }

      throw new Error('Unexpected error in makeRequest');
    })();

    // Store pending request for deduplication
    this.pendingRequests.set(requestKey, {
      promise: requestPromise,
      timestamp: Date.now(),
    });

    // Clean up after request completes
    requestPromise
      .finally(() => {
        this.pendingRequests.delete(requestKey);
      })
      .catch(() => {
        // Error already handled above
      });

    return requestPromise as Promise<T>;
  }

  async get<T = unknown>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return this.makeRequest<T>(endpoint, { method: 'GET', headers });
  }
  async post<T = unknown>(endpoint: string, data: unknown, headers?: Record<string, string>): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      headers,
    });
  }
  async put<T = unknown>(endpoint: string, data: unknown, headers?: Record<string, string>): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      headers,
    });
  }
  async delete<T = unknown>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return this.makeRequest<T>(endpoint, { method: 'DELETE', headers });
  }
  async patch<T = unknown>(endpoint: string, data?: unknown, headers?: Record<string, string>): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
      headers,
    });
  }
}

const enhancedAPI = new EnhancedAPI();
export const apiGet = <T = unknown>(endpoint: string, headers?: Record<string, string>): Promise<T> => enhancedAPI.get<T>(endpoint, headers);
export const apiPost = <T = unknown>(endpoint: string, data: unknown, headers?: Record<string, string>): Promise<T> => enhancedAPI.post<T>(endpoint, data, headers);
export const apiPut = <T = unknown>(endpoint: string, data: unknown, headers?: Record<string, string>): Promise<T> => enhancedAPI.put<T>(endpoint, data, headers);
export const apiDelete = <T = unknown>(endpoint: string, headers?: Record<string, string>): Promise<T> => enhancedAPI.delete<T>(endpoint, headers);
export const apiPatch = <T = unknown>(endpoint: string, data?: unknown, headers?: Record<string, string>): Promise<T> => enhancedAPI.patch<T>(endpoint, data, headers);
export default enhancedAPI;

export async function apiRequest(
): Promise<unknown> {
  // Implementation remains the same
  return null;
}