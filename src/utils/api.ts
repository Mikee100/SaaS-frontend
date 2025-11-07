
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
        console.error(`[API] Request failed with status ${response.status}`, {
          status: response.status,
          statusText: response.statusText,
          url,
          response: responseData || responseText,
          requestHeaders: headers,
        });
        
        // Handle 401 Unauthorized
        if (response.status === 401) {
          // Clear invalid token
          localStorage.removeItem('token');
        }
        
        const errorMessage = responseData?.message || 
                            response.statusText || 
                            `HTTP error! status: ${response.status}`;
        throw new Error(errorMessage);
      }
      
      return responseData;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
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