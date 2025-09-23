import { NextResponse } from 'next/server';

export async function GET() {
  console.log('Sales trends API endpoint called');
  try {
    // Get the tenant ID from environment variables or context
    const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || 'demo-tenant';
    
    console.log('Using tenant ID:', tenantId);
    
    if (!tenantId) {
      console.error('Tenant ID not configured');
      return NextResponse.json(
        { error: 'Tenant ID not configured' },
        { status: 500 }
      );
    }

    // Call the reporting service
    const reportingServiceUrl = process.env.NEXT_PUBLIC_REPORTING_SERVICE_URL || 'http://localhost:3001';
    const apiUrl = `${reportingServiceUrl}/api/reports/sales-trends/${tenantId}`;
    
    console.log('Calling reporting service:', apiUrl);
    
    const response = await fetch(apiUrl, {
      headers: {
        'Content-Type': 'application/json',
        // Add any required authentication headers here
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error from reporting service:', response.status, errorText);
      throw new Error(`Error from reporting service: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Received data from reporting service:', JSON.stringify(data).substring(0, 200) + '...');
    
    // Return mock data if the service is not available
    if (!data || Object.keys(data).length === 0) {
      console.log('No data from reporting service, returning mock data');
      return NextResponse.json({
        success: true,
        data: {
          trends: Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
            totalSales: Math.floor(Math.random() * 10000) + 1000,
            totalOrders: Math.floor(Math.random() * 100) + 10,
            averageOrderValue: Math.floor(Math.random() * 200) + 50
          })).reverse(),
          summary: {
            totalSales: 150000,
            totalOrders: 1500,
            averageOrderValue: 100
          }
        },
        meta: {
          startDate: new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)).toISOString(),
          endDate: new Date().toISOString()
        }
      });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching sales trends:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sales trends' },
      { status: 500 }
    );
  }
}
