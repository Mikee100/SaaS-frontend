import { } from './offlineStorage';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';

class EnhancedAPI {
  private isOnline = true;

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        console.log('[API] Using token from localStorage');
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        console.warn('[API] No token found in localStorage');
      }
    }
    return headers;
  }

  private async makeRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      ...this.getAuthHeaders(),
      ...options.headers,
    };
    
    console.log(`[API] ${options.method || 'GET'} ${url}`, { 
      headers: {
        ...headers,
        Authorization: headers.Authorization ? 'Bearer [REDACTED]' : undefined
      },
      body: options.body ? JSON.parse(options.body as string) : undefined 
    });
    
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
          // Redirect to login or handle unauthorized
          if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
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

  async get(endpoint: string, headers?: Record<string, string>): Promise<any> {
    return this.makeRequest(endpoint, { method: 'GET', headers });
  }
  async post(endpoint: string, data: any, headers?: Record<string, string>): Promise<any> {
    return this.makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      headers,
    });
  }
  async put(endpoint: string, data: any, headers?: Record<string, string>): Promise<any> {
    return this.makeRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      headers,
    });
  }
  async delete(endpoint: string, headers?: Record<string, string>): Promise<any> {
    return this.makeRequest(endpoint, { method: 'DELETE', headers });
  }
}

const enhancedAPI = new EnhancedAPI();
export const apiGet = (endpoint: string, headers?: Record<string, string>) => enhancedAPI.get(endpoint, headers);
export const apiPost = <T = any>(endpoint: string, data: any, headers?: Record<string, string>): Promise<T> => enhancedAPI.post(endpoint, data, headers);
export const apiPut = (endpoint: string, data: any, headers?: Record<string, string>) => enhancedAPI.put(endpoint, data, headers);
export const apiDelete = (endpoint: string, headers?: Record<string, string>) => enhancedAPI.delete(endpoint, headers);
export default enhancedAPI; 
