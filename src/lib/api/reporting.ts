import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { getSession } from 'next-auth/react';

const API_BASE_URL = process.env.NEXT_PUBLIC_REPORTING_SERVICE_URL || 'http://localhost:3001/api';

const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
axiosInstance.interceptors.request.use(
  async (config) => {
    const session = await getSession();
    if (session?.accessToken) {
      config.headers.Authorization = `Bearer ${session.accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    // Handle errors globally
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

// API methods
export const reportingApi = {
  // Sales Reports
  getSalesReport: (params: Record<string, unknown>) => 
    axiosInstance.get('/reports/sales', { params }),
  
  // Sales Trends
  getSalesTrends: (params: Record<string, unknown>) => 
    axiosInstance.get('/reports/sales-trends', { params }),
  
  // Customer Segmentation
  getCustomerSegments: (params: Record<string, unknown>) => 
    axiosInstance.get('/reports/customer-segmentation', { params }),
  
  // Branch Reports
  getBranchReports: (branchId: string, params: Record<string, unknown>) => 
    axiosInstance.get(`/reports/branches/${branchId}`, { params }),
  
  // Tenant Analytics
  getTenantAnalytics: (tenantId: string, params: Record<string, unknown>) => 
    axiosInstance.get(`/reports/tenants/${tenantId}`, { params }),
};

export default axiosInstance;
