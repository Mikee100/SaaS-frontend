import { NextResponse } from 'next/server';
// Removed NextAuth getServerSession. No authentication applied.
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.isSuperadmin) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const config = await prisma.stripeConfiguration.findFirst({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        publishableKey: true,
        isLiveMode: true,
        updatedAt: true,
        createdByUser: {
          select: { name: true, email: true }
        }
      }
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error fetching Stripe config:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Failed to fetch Stripe configuration' }),
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.isSuperadmin) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { publishableKey, secretKey, webhookSecret, isLiveMode } = await request.json();

    if (!publishableKey) {
      return new NextResponse(
        JSON.stringify({ error: 'Publishable key is required' }),
        { status: 400 }
      );
    }

    // In a real app, you'd want to encrypt the secret key before storing it
    const config = await prisma.stripeConfiguration.create({
      data: {
        publishableKey,
        secretKey,
        webhookSecret,
        isLiveMode: Boolean(isLiveMode),
        createdBy: session.user.id,
      },
      select: {
        id: true,
        publishableKey: true,
        isLiveMode: true,
        updatedAt: true,
      }
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error saving Stripe config:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Failed to save Stripe configuration' }),
      { status: 500 }
    );
  }
}
