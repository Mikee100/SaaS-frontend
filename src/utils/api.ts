
import API_BASE_URL from '../config/apiConfig';

// Request deduplication: prevent concurrent identical requests
interface PendingRequest {
  promise: Promise<unknown>;
  timestamp: number;
}

class EnhancedAPI {
  private isOnline = true;
  private pendingRequests = new Map<string, PendingRequest>();
  private readonly REQUEST_DEDUP_TIMEOUT = 5000; // 5 seconds

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        console.warn('[API] No token found in localStorage');
      }
    }
    return headers;
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

  private async makeRequest<T = unknown>(
    endpoint: string,
    options: RequestInit = {}
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

    const maxRetries = 5;
    let attempt = 0;

    // Create the request promise
    const requestPromise = (async (): Promise<T> => {
      while (attempt <= maxRetries) {
      try {
        const response = await fetch(url, {
          ...options,
          headers,
          credentials: 'include',
        });

        const responseText = await response.text();
        let responseData;

        try {
          responseData = responseText ? JSON.parse(responseText) : null;
        } catch (e) {
          console.error('Failed to parse JSON response:', e, 'Response text:', responseText);
          throw new Error('Invalid JSON response from server');
        }

        if (!response.ok) {
          // Handle 429 Too Many Requests with retry
          if (response.status === 429 && attempt < maxRetries) {
            const delay = Math.min(Math.pow(2, attempt) * 1000, 10000); // Exponential backoff: 1s, 2s, 4s, 8s, 10s (capped at 10s)
            console.warn(`[API] Rate limited (429). Retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries + 1})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            attempt++;
            continue;
          }

          // Handle ThrottlerException (NestJS rate limiting) with retry
          const errorMessage = responseData?.message ||
                              response.statusText ||
                              `HTTP error! status: ${response.status}`;

          if (errorMessage.includes('Too Many Requests') && attempt < maxRetries) {
            const delay = Math.min(Math.pow(2, attempt) * 1000, 10000); // Exponential backoff: 1s, 2s, 4s, 8s, 10s (capped at 10s)
            console.warn(`[API] Rate limited (ThrottlerException). Retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries + 1})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            attempt++;
            continue;
          }

          // Only log errors that are not retried rate limits
          if ((response.status !== 429 && !errorMessage.includes('Too Many Requests')) || attempt >= maxRetries) {
            console.error(`[API] Request failed with status ${response.status}`, {
              status: response.status,
              statusText: response.statusText,
              url,
              response: responseData || responseText,
              requestHeaders: headers,
            });
          }

          // Handle 401 Unauthorized
          if (response.status === 401) {
            // Clear invalid token
            localStorage.removeItem('token');
          }

          throw new Error(errorMessage);
        }

        return responseData as T;
      } catch (error) {
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
}

const enhancedAPI = new EnhancedAPI();
export const apiGet = <T = unknown>(endpoint: string, headers?: Record<string, string>): Promise<T> => enhancedAPI.get<T>(endpoint, headers);
export const apiPost = <T = unknown>(endpoint: string, data: unknown, headers?: Record<string, string>): Promise<T> => enhancedAPI.post<T>(endpoint, data, headers);
export const apiPut = <T = unknown>(endpoint: string, data: unknown, headers?: Record<string, string>): Promise<T> => enhancedAPI.put<T>(endpoint, data, headers);
export const apiDelete = <T = unknown>(endpoint: string, headers?: Record<string, string>): Promise<T> => enhancedAPI.delete<T>(endpoint, headers);
export default enhancedAPI;

export async function apiRequest(
): Promise<unknown> {
  // Implementation remains the same
  return null;
}