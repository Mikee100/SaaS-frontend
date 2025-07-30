import { } from './offlineStorage';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
    try {
      console.log('Making request to:', url);
      console.log('Headers:', headers);
      
      const response = await fetch(url, {
        ...options,
        headers,
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error text:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      
      const responseText = await response.text();
      console.log('Response text:', responseText);
      
      if (!responseText) {
        throw new Error('Empty response from server');
      }
      
      return JSON.parse(responseText);
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async get(endpoint: string): Promise<any> {
    return this.makeRequest(endpoint, { method: 'GET' });
  }
  async post(endpoint: string, data: any): Promise<any> {
    return this.makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  async put(endpoint: string, data: any): Promise<any> {
    return this.makeRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
  async delete(endpoint: string): Promise<any> {
    return this.makeRequest(endpoint, { method: 'DELETE' });
  }
}

const enhancedAPI = new EnhancedAPI();
export const apiGet = (endpoint: string) => enhancedAPI.get(endpoint);
export const apiPost = (endpoint: string, data: any) => enhancedAPI.post(endpoint, data);
export const apiPut = (endpoint: string, data: any) => enhancedAPI.put(endpoint, data);
export const apiDelete = (endpoint: string) => enhancedAPI.delete(endpoint);
export default enhancedAPI; 

