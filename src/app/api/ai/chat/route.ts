import { NextResponse } from 'next/server';
import { apiPost } from '@/utils/api';

export async function POST(request: Request) {
  try {
    console.log('AI Chat API called');

    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    console.log('Auth header present:', !!authHeader);

    // Parse request body
    const { message, userId, tenantId, branchId } = await request.json();
    console.log('Request body:', { message, userId, tenantId, branchId });

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    console.log('Calling backend AI API with:', message);

    // Call the backend AI API
    const response = await apiPost<{ response: string; category: string; suggestions: string[] }>('/ai/chat', { message }, authHeader ? { 'Authorization': authHeader } : undefined);

    console.log('Backend AI Response:', response);

    return NextResponse.json({
      response: response.response,
      category: response.category,
      suggestions: response.suggestions
    });
  } catch (error) {
    console.error('AI Chat Error:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing your request' },
      { status: 500 }
    );
  }
}
