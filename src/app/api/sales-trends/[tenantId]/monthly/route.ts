import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// Get monthly sales trends for a tenant
export async function GET(
  request: Request,
  { params }: { params: { tenantId: string } }
) {
  try {
    // Verify user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get the tenant ID from the URL params
    const { tenantId } = params;

    // In a real app, you would verify the user has access to this tenant
    // For now, we'll just use the tenant ID from the URL

    // Get the backend API URL from environment variables
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
    
    // Forward the request to the backend service
    const response = await fetch(`${backendUrl}/api/sales-trends/${tenantId}/monthly`, {
      headers: {
        'Content-Type': 'application/json',
        // Add any necessary auth headers here
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { success: false, error: errorData.error || 'Failed to fetch monthly sales trends' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching monthly sales trends:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
