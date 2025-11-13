
import API_BASE_URL from '../config/apiConfig';



class EnhancedAPI {
  private isOnline = true;

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

  private async makeRequest<T = unknown>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      ...this.getAuthHeaders(),
      ...options.headers,
    };

    const maxRetries = 5;
    let attempt = 0;

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

        return responseData;
      } catch (error) {
        if (attempt >= maxRetries) {
          console.error('API request failed after retries:', error);
          throw error;
        }
        attempt++;
      }
    }

    throw new Error('Unexpected error in makeRequest');
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